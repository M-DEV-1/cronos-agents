import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { InMemoryRunner, isFinalResponse } from '@google/adk';
import { rootAgent } from './agent.js';
import { paymentEvents } from './pay-wrapper.js';
import { extractA2UIFromResponse, wrapAsResultCard, cleanResponseText } from './a2ui-generator.js';
// Import x402 handler
import { createX402Handler } from '../x402/index.js';
import type { X402Handler } from '../x402/index.js';
import type { Express } from 'express';

function createUserContent(text: string) {
    return { role: 'user' as const, parts: [{ text }] };
}

const app: Express = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const APP_NAME = 'source-agent';

const runner = new InMemoryRunner({ agent: rootAgent, appName: APP_NAME });

// X402 handler for client-side payment processing (lazy initialization)
function getX402Handler(): X402Handler | null {
    if (!process.env.AGENT_PRIVATE_KEY) {
        return null;
    }
    try {
        return createX402Handler('testnet');
    } catch (err) {
        console.warn('X402 handler not available:', err instanceof Error ? err.message : 'Unknown error');
        return null;
    }
}

// Event types for the frontend
interface AgentEvent {
    id: string;
    timestamp: number;
    type: 'user_input' | 'orchestrator' | 'payment_required' | 'payment_success' | 'payment_failed' | 'tool_call' | 'tool_result' | 'final_response' | 'error';
    agentName?: string;
    label: string;
    details?: string;
    cost?: number;
    walletAddress?: string;
    toolName?: string;
    label?: string;
    details?: string;
    error?: string;
    timestamp: number;
    // Legacy fields
    id?: string;
    agentName?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Map ADK event types to step kinds
 */
function adkEventToStepKind(eventAuthor: string, hasToolCall: boolean): StepKind {
    if (hasToolCall) return 'tool';
    if (eventAuthor === 'user') return 'intent';
    return 'intent';
}

/**
 * Main agent execution endpoint
 * Now derives steps from actual ADK events while using LLM-planned structure
 */
app.post('/run', async (req: Request, res: Response) => {
    const { prompt } = req.body;
    const userAddress = req.headers['x-user-address'] as string || 'unknown';

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const emit = (event: SSEEvent) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
        // 1. Create execution run
        const run = executionStore.create(prompt, userAddress);

        // 2. Plan steps using LLM (with fallback)
        let plan;
        try {
            plan = await planWithLLM(prompt);
        } catch (e) {
            console.log('[Server] LLM planning failed, using keyword-based fallback');
            // Import fallback from execution.ts
            const { planStepsFromPrompt } = await import('./execution.js');
            const fallbackSteps = planStepsFromPrompt(prompt);
            plan = {
                steps: fallbackSteps.map(s => ({ ...s, stepId: '', status: 'planned' as const })),
                intents: [],
                capabilities: []
            };
        }

        // Add planned steps to run
        for (const stepData of plan.steps) {
            executionStore.addStep(run.runId, stepData);
        }

        const currentRun = executionStore.get(run.runId)!;
        executionStore.update(run.runId, { status: 'executing' });

        // 3. Emit run_started with planned steps
        emit({
            type: 'run_started',
            runId: run.runId,
            steps: currentRun.steps,
            timestamp: Date.now(),
        });

        // 4. Create ADK session
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await runner.sessionService.createSession({
            appName: APP_NAME,
            userId: userAddress,
            sessionId
        });

        // Track execution state
        let totalCost = 0;
        const toolStepQueue = currentRun.steps.filter(s => s.kind === 'tool');
        let currentToolIndex = 0;

        // 5. Mark intent step as running
        const intentStep = currentRun.steps.find(s => s.kind === 'intent');
        if (intentStep) {
            executionStore.updateStep(run.runId, intentStep.stepId, { status: 'running', startedAt: Date.now() });
            emit({
                type: 'step_started',
                runId: run.runId,
                stepId: intentStep.stepId,
                timestamp: Date.now(),
            });
        }

        // 6. Payment event listener
        const paymentHandler = (data: { name: string; cost: number; walletAddress: string; status: string; txHash?: string }) => {
            const toolStep = toolStepQueue[currentToolIndex];

            emit({
                type: data.status === 'pending' ? 'payment_required' :
                    data.status === 'success' ? 'payment_success' : 'step_failed',
                runId: run.runId,
                stepId: toolStep?.stepId,
                toolName: data.name,
                cost: data.cost,
                walletAddress: data.walletAddress,
                timestamp: Date.now(),
                id: `evt-${Date.now()}`,
                agentName: data.name,
                label: data.status === 'pending' ? 'Payment Required' : data.status === 'success' ? 'Payment Confirmed' : 'Payment Failed',
                details: `${data.cost} USDC for ${data.name}`,
                cost: data.cost,
                walletAddress: data.walletAddress,
                metadata: data.txHash ? { txHash: data.txHash } : undefined
            });

            if (data.status === 'success') {
                totalCost += data.cost;
                if (toolStep) {
                    executionStore.updateStep(run.runId, toolStep.stepId, { cost: data.cost });
                }
            }
        };
        paymentEvents.on('payment', paymentHandler);

        // 7. Tool call listener - derive from actual ADK events
        const toolHandler = (data: { name: string; args: unknown }) => {
            // Find matching tool step or create one dynamically
            let toolStep = toolStepQueue[currentToolIndex];

            if (!toolStep) {
                // Dynamic step creation from ADK event
                const newStep = executionStore.addStep(run.runId, {
                    kind: 'tool',
                    label: data.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    toolName: data.name,
                    cost: 0.01,
                });
                if (newStep) {
                    toolStep = newStep;
                    toolStepQueue.push(newStep);
                }
            }

            if (toolStep) {
                executionStore.updateStep(run.runId, toolStep.stepId, {
                    status: 'running',
                    startedAt: Date.now(),
                    toolName: data.name,
                });

                emit({
                    type: 'step_started',
                    runId: run.runId,
                    stepId: toolStep.stepId,
                    timestamp: Date.now(),
                    id: `evt-${Date.now()}`,
                    label: toolStep.label,
                    agentName: data.name,
                });
            }
        };
        paymentEvents.on('tool_call', toolHandler);

        // Tool result listener
        const toolResultHandler = (data: { name: string; result: unknown }) => {
            const toolStep = toolStepQueue[currentToolIndex];
            if (toolStep && toolStep.status === 'running') {
                executionStore.updateStep(run.runId, toolStep.stepId, {
                    status: 'completed',
                    completedAt: Date.now(),
                    result: data.result,
                });

                emit({
                    type: 'step_completed',
                    runId: run.runId,
                    stepId: toolStep.stepId,
                    result: data.result,
                    cost: toolStep.cost,
                    timestamp: Date.now(),
                });

                currentToolIndex++;
            }
        };
        paymentEvents.on('tool_result', toolResultHandler);

        // 8. Run the agent and derive from ADK events
        let finalResult: unknown = null;
        let intentCompleted = false;

        for await (const event of runner.runAsync({
            userId: userAddress,
            sessionId,
            newMessage: createUserContent(prompt),
        })) {
            // Mark intent complete on first agent response
            if (!intentCompleted && intentStep && event.author !== 'user') {
                executionStore.updateStep(run.runId, intentStep.stepId, {
                    status: 'completed',
                    completedAt: Date.now()
                });
                emit({
                    type: 'step_completed',
                    runId: run.runId,
                    stepId: intentStep.stepId,
                    timestamp: Date.now(),
                });
                intentCompleted = true;
            }

            // Check for tool calls in ADK event using type assertion
            // ADK events may contain tool data in various formats
            const actions = event.actions as unknown as Record<string, unknown> | undefined;
            if (actions) {
                // Check if there's tool-related data
                const actionKeys = Object.keys(actions);
                for (const key of actionKeys) {
                    if (key === 'stateDelta' || key === 'artifactDelta') continue;
                    const actionData = actions[key];
                    if (typeof actionData === 'object' && actionData !== null) {
                        const toolData = actionData as { name?: string; args?: unknown; result?: unknown };
                        if (toolData.name && !toolData.result) {
                            // This is a tool call
                            paymentEvents.emit('tool_call', {
                                name: toolData.name,
                                args: toolData.args,
                            });
                        } else if (toolData.result !== undefined) {
                            // This is a tool result
                            paymentEvents.emit('tool_result', {
                                name: toolData.name || 'tool',
                                result: toolData.result,
                            });
                        }
                    }
                }
            }

            // Capture final response
            if (isFinalResponse(event)) {
                const content = event.content?.parts?.map(p => p.text ?? '').join('') ?? '';
                finalResult = content || event;
            }
        }

        // 9. Mark remaining tool steps as completed
        for (const step of toolStepQueue) {
            if (step.status === 'running') {
                executionStore.updateStep(run.runId, step.stepId, {
                    status: 'completed',
                    completedAt: Date.now(),
                });
                emit({
                    type: 'step_completed',
                    runId: run.runId,
                    stepId: step.stepId,
                    timestamp: Date.now(),
                });
            }
        }

        // 10. Extract A2UI and emit
        let a2uiMessages: unknown[] = [];
        if (finalResult) {
            const extracted = extractA2UIFromResponse(finalResult);
            a2uiMessages = extracted.length > 0 ? extracted : wrapAsResultCard('Result', finalResult);
        }

        // UI step
        const uiStep = currentRun.steps.find(s => s.kind === 'ui');
        if (uiStep) {
            executionStore.updateStep(run.runId, uiStep.stepId, { status: 'running', startedAt: Date.now() });
            emit({ type: 'step_started', runId: run.runId, stepId: uiStep.stepId, timestamp: Date.now() });

            emit({
                type: 'a2ui',
                runId: run.runId,
                stepId: uiStep.stepId,
                a2ui: a2uiMessages,
                timestamp: Date.now(),
            });

            executionStore.updateStep(run.runId, uiStep.stepId, {
                status: 'completed',
                completedAt: Date.now(),
                a2ui: a2uiMessages,
            });
            emit({ type: 'step_completed', runId: run.runId, stepId: uiStep.stepId, timestamp: Date.now() });
        }

        // 11. Legacy final_response for backward compatibility
        const cleanDetails = cleanResponseText(typeof finalResult === 'string' ? finalResult : JSON.stringify(finalResult));
        emit({
            type: 'final_response',
            runId: run.runId,
            timestamp: Date.now(),
            id: `evt-${Date.now()}`,
            label: 'Final Response',
            details: cleanDetails || 'Check sidebar for results.',
            result: finalResult,
            metadata: { a2ui: a2uiMessages },
        });

        // 12. Complete run
        executionStore.update(run.runId, { status: 'completed', totalCost });
        emit({ type: 'run_completed', runId: run.runId, timestamp: Date.now() });

        // Cleanup
        paymentEvents.off('payment', paymentHandler);
        paymentEvents.off('tool_call', toolHandler);
        paymentEvents.off('tool_result', toolResultHandler);

    } catch (error) {
        console.error('Agent execution error:', error);
        emit({
            type: 'run_failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
            id: `evt-${Date.now()}`,
            label: 'Error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    res.end();
});

// Endpoint to execute tool with x402 payment
app.post('/tools/:toolName', async (req: Request, res: Response) => {
    const { toolName } = req.params;
    const { args, paymentHeader } = req.body;

    // Find the tool wrapper - tools are FunctionTool instances with name property
    const tool = rootAgent.tools.find((t: any) => t.name === toolName);
    if (!tool) {
        return res.status(404).json({ error: 'Tool not found' });
    }

    try {
        // Execute with payment header if provided
        const result = await (tool as any).execute(args, { paymentHeader });
        res.json({ success: true, result });
    } catch (error: any) {
        // If it's a 402 error, return proper x402 response
        if (error.status === 402) {
            return res.status(402).json(error);
        }
        res.status(500).json({ error: error.message });
    }
});

// Endpoint for client to execute tool with automatic x402 payment
app.post('/tools/:toolName/execute', async (req: Request, res: Response) => {
    const { toolName } = req.params;
    const { args } = req.body;

    const x402Handler = getX402Handler();
    if (!x402Handler) {
        return res.status(500).json({ error: 'X402 handler not configured (AGENT_PRIVATE_KEY required)' });
    }

    const toolUrl = `http://localhost:${PORT}/tools/${toolName}`;

    try {
        // Use x402 handler's executeWithPayment which handles 402 automatically
        const result = await x402Handler.executeWithPayment(toolUrl, { args });

        if (result.status === 'error') {
            return res.status(500).json({ error: result.error });
        }

        res.json({
            success: true,
            result: result.data,
            paid: result.paid,
            cost: result.cost,
            txHash: result.txHash,
            x402Receipt: result.x402Receipt
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// A2UI actions - resume execution
app.post('/action', async (req, res) => {
    const { runId, action, componentId } = req.body;
    console.log(`[A2UI] Action: ${action?.name} from ${componentId}`);

    if (runId) {
        const run = executionStore.get(runId);
        if (run && run.status === 'waiting') {
            executionStore.update(runId, { status: 'executing' });
        }
    }

    res.json({ status: 'received', runId, action });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
    console.log(`Agent server running on http://localhost:${PORT}`);
    console.log(`Using ADK InMemoryRunner with app: ${APP_NAME}`);
    if (!process.env.AGENT_PRIVATE_KEY) {
        console.warn('⚠️  AGENT_PRIVATE_KEY not set - x402 payment verification disabled');
        console.warn('   Set AGENT_PRIVATE_KEY in .env to enable real x402 payments');
    } else {
        console.log('✅ X402 payment handler configured');
    }
});

export default app;
