import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { InMemoryRunner, isFinalResponse } from '@google/adk';
import { rootAgent } from './agent.js';
import { paymentEvents } from './pay-wrapper.js';
import { extractA2UIFromResponse, wrapAsResultCard } from './a2ui-generator.js';
import type { Express } from 'express';

// Helper to create user content (avoiding @google/genai dependency)
function createUserContent(text: string) {
    return { role: 'user' as const, parts: [{ text }] };
}

const app: Express = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const APP_NAME = 'source-agent';

// Create a persistent runner instance
const runner = new InMemoryRunner({ agent: rootAgent, appName: APP_NAME });

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
    result?: unknown;
    metadata?: Record<string, unknown>;
}

/**
 * Main agent execution endpoint
 * Streams events via Server-Sent Events (SSE)
 */
app.post('/run', async (req: Request, res: Response) => {
    const { prompt } = req.body;
    const userAddress = req.headers['x-user-address'] as string || 'unknown';

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const emit = (event: AgentEvent) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    let eventCounter = 0;
    const nextId = () => `evt-${Date.now()}-${eventCounter++}`;

    try {
        // 1. Emit user input event
        emit({
            id: nextId(),
            timestamp: Date.now(),
            type: 'user_input',
            label: 'User Request',
            details: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''),
        });

        // 2. Create session for this request
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await runner.sessionService.createSession({
            appName: APP_NAME,
            userId: userAddress,
            sessionId
        });

        // 3. Set up payment event listener
        const paymentHandler = (data: { name: string; cost: number; walletAddress: string; status: string }) => {
            emit({
                id: nextId(),
                timestamp: Date.now(),
                type: data.status === 'pending' ? 'payment_required' : data.status === 'success' ? 'payment_success' : 'payment_failed',
                agentName: data.name,
                label: data.status === 'pending' ? 'Payment Required' : data.status === 'success' ? 'Payment Confirmed' : 'Payment Failed',
                details: `${data.cost} TCRO for ${data.name}`,
                cost: data.cost,
                walletAddress: data.walletAddress,
            });
        };
        paymentEvents.on('payment', paymentHandler);

        // 4. Set up tool call listener
        const toolHandler = (data: { name: string; args: unknown }) => {
            emit({
                id: nextId(),
                timestamp: Date.now(),
                type: 'tool_call',
                agentName: data.name,
                label: data.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                details: `Executing with args: ${JSON.stringify(data.args).slice(0, 100)}...`,
            });
        };
        paymentEvents.on('tool_call', toolHandler);

        // 5. Run the agent using InMemoryRunner
        let finalResult: unknown = null;

        for await (const event of runner.runAsync({
            userId: userAddress,
            sessionId,
            newMessage: createUserContent(prompt),
        })) {
            // Emit intermediate events as orchestrator updates
            if (event.actions?.stateDelta) {
                emit({
                    id: nextId(),
                    timestamp: Date.now(),
                    type: 'orchestrator',
                    label: 'Processing',
                    details: 'Agent is reasoning...',
                });
            }

            // Check for final response
            if (isFinalResponse(event)) {
                const content = event.content?.parts?.map(p => p.text ?? '').join('') ?? '';
                finalResult = content || event;
            }
        }

        // 6. Extract A2UI from LLM response
        let a2uiMessages: unknown[] = [];
        if (finalResult) {
            const extracted = extractA2UIFromResponse(finalResult);
            if (extracted.length > 0) {
                a2uiMessages = extracted;
            } else {
                a2uiMessages = wrapAsResultCard('Result', finalResult);
            }
        }

        // 7. Emit final response with A2UI
        emit({
            id: nextId(),
            timestamp: Date.now(),
            type: 'final_response',
            label: 'Final Response',
            details: typeof finalResult === 'string' ? finalResult : JSON.stringify(finalResult),
            result: finalResult,
            metadata: {
                a2ui: a2uiMessages,
            },
        });

        // Clean up listeners
        paymentEvents.off('payment', paymentHandler);
        paymentEvents.off('tool_call', toolHandler);

    } catch (error) {
        console.error('Agent execution error:', error);
        emit({
            id: nextId(),
            timestamp: Date.now(),
            type: 'error',
            label: 'Agent Error',
            details: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    }

    res.end();
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
    console.log(`Agent server running on http://localhost:${PORT}`);
    console.log(`Using ADK InMemoryRunner with app: ${APP_NAME}`);
});

export default app;
