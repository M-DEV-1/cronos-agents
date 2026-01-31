import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { InMemoryRunner, isFinalResponse } from '@google/adk';
import { rootAgent } from './agent.js';
import { paymentEvents } from './pay-wrapper.js';
import { createX402Handler } from '../x402/handler.js';
import type { X402Handler } from '../x402/index.js';
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

// X402 handler for client-side payment processing
function getX402Handler(): X402Handler | null {
    if (!process.env.AGENT_PRIVATE_KEY) return null;
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

    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

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
        const paymentHandler = (data: { name: string; cost: number; walletAddress: string; status: string; txHash?: string }) => {
            emit({
                id: nextId(),
                timestamp: Date.now(),
                type: data.status === 'pending' ? 'payment_required' : data.status === 'success' ? 'payment_success' : 'payment_failed',
                agentName: data.name,
                label: data.status === 'pending' ? 'Payment Required' : data.status === 'success' ? 'Payment Confirmed' : 'Payment Failed',
                details: `${data.cost} USDC for ${data.name}`,
                cost: data.cost,
                walletAddress: data.walletAddress,
                metadata: data.txHash ? { txHash: data.txHash } : undefined
            });
        };
        paymentEvents.on('payment', paymentHandler);

        // 4. Track tool calls
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

        // 5. Run the agent
        let finalResult: unknown = null;

        for await (const event of runner.runAsync({
            userId: userAddress,
            sessionId,
            newMessage: createUserContent(prompt),
        })) {
            // Check for errors first
            if ((event as any).errorCode || (event as any).errorMessage) {
                const errorCode = (event as any).errorCode;
                const errorMessage = (event as any).errorMessage || 'Unknown error occurred';
                
                console.error('[AGENT] Error detected:', {
                    errorCode,
                    errorMessage,
                });

                emit({
                    id: nextId(),
                    timestamp: Date.now(),
                    type: 'error',
                    label: `API Error (${errorCode})`,
                    details: errorMessage,
                });

                // Set final result to error message
                finalResult = `Error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`;
                // Break out of loop since we have an error
                break;
            }

            // Debug: log all events with full structure
            console.log('[AGENT] Event received:', {
                type: event.type || 'unknown',
                hasContent: !!event.content,
                hasActions: !!event.actions,
                isFinal: isFinalResponse(event),
                contentKeys: event.content ? Object.keys(event.content) : [],
                contentParts: event.content?.parts ? event.content.parts.length : 0,
                eventKeys: Object.keys(event),
            });

            // Log full event structure for final responses
            if (isFinalResponse(event)) {
                console.log('[AGENT] Full final event structure:', JSON.stringify(event, null, 2));
            }

            if (event.actions?.stateDelta) {
                emit({
                    id: nextId(),
                    timestamp: Date.now(),
                    type: 'orchestrator',
                    label: 'Processing',
                    details: 'Agent is reasoning...',
                });
            }

            // Handle tool calls - emit events for debugging
            if (event.actions?.toolCalls) {
                console.log('[AGENT] Tool calls detected:', event.actions.toolCalls.length);
                for (const toolCall of event.actions.toolCalls || []) {
                    emit({
                        id: nextId(),
                        timestamp: Date.now(),
                        type: 'tool_call',
                        label: `Calling ${toolCall.name}`,
                        details: `Tool: ${toolCall.name}`,
                        agentName: toolCall.name,
                    });
                }
            }

            // Handle tool results
            if (event.actions?.toolResults) {
                console.log('[AGENT] Tool results detected:', event.actions.toolResults.length);
                for (const toolResult of event.actions.toolResults || []) {
                    emit({
                        id: nextId(),
                        timestamp: Date.now(),
                        type: 'tool_result',
                        label: `Tool result`,
                        details: `Result from tool execution`,
                        agentName: toolResult.name,
                    });
                }
            }

            // Check for content in multiple possible locations
            if (isFinalResponse(event)) {
                // Try multiple ways to extract content
                let content = '';
                
                // Method 1: Standard content.parts
                if (event.content?.parts) {
                    content = event.content.parts.map((p: any) => {
                        if (typeof p === 'string') return p;
                        if (p?.text) return p.text;
                        if (p?.inlineData) return '[Binary data]';
                        return '';
                    }).join('');
                }
                
                // Method 2: Direct text property
                if (!content && (event as any).text) {
                    content = (event as any).text;
                }
                
                // Method 3: Content as string
                if (!content && typeof event.content === 'string') {
                    content = event.content;
                }
                
                // Method 4: Check for response in different structure
                if (!content && (event as any).response) {
                    const response = (event as any).response;
                    if (typeof response === 'string') {
                        content = response;
                    } else if (response?.content?.parts) {
                        content = response.content.parts.map((p: any) => p?.text || '').join('');
                    }
                }

                // Method 5: Check if event itself has message/content
                if (!content && (event as any).message) {
                    const message = (event as any).message;
                    if (typeof message === 'string') {
                        content = message;
                    } else if (message?.content?.parts) {
                        content = message.content.parts.map((p: any) => p?.text || '').join('');
                    }
                }

                finalResult = content || event;
                console.log('[AGENT] Final response detected:', {
                    contentLength: content.length,
                    hasContent: !!content,
                    extractedContent: content.slice(0, 200),
                });
            }
        }

        // 6. Emit final response (Raw text/JSON) - Client handles A2UI extraction
        // If no result was captured, check if we have an error
        if (!finalResult || (typeof finalResult === 'object' && Object.keys(finalResult).length === 0)) {
            console.warn('[AGENT] No final result captured, checking for errors...');
            // This shouldn't happen if error handling above worked, but just in case
            finalResult = 'No response generated. Please check the agent logs for errors.';
        }

        console.log('[AGENT] Emitting final response:', {
            hasResult: !!finalResult,
            resultType: typeof finalResult,
            resultLength: typeof finalResult === 'string' ? finalResult.length : 'N/A',
            resultPreview: typeof finalResult === 'string' ? finalResult.slice(0, 100) : 'N/A',
        });
        
        const responseText = typeof finalResult === 'string' 
            ? finalResult 
            : JSON.stringify(finalResult);
            
        emit({
            id: nextId(),
            timestamp: Date.now(),
            type: 'final_response',
            label: 'Final Response',
            details: responseText,
            result: finalResult,
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

// Endpoint to execute tool with x402 payment
app.post('/tools/:toolName', async (req: Request, res: Response) => {
    const { toolName } = req.params;
    const { args, paymentHeader } = req.body;
    const tool = rootAgent.tools.find((t: any) => t.name === toolName);

    if (!tool) return res.status(404).json({ error: 'Tool not found' });

    try {
        const result = await (tool as any).execute(args, { paymentHeader });
        res.json({ success: true, result });
    } catch (error: any) {
        if (error.status === 402) return res.status(402).json(error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint for client to execute tool with automatic x402 payment
app.post('/tools/:toolName/execute', async (req: Request, res: Response) => {
    const { toolName } = req.params;
    const { args } = req.body;

    const x402Handler = getX402Handler();
    if (!x402Handler) return res.status(500).json({ error: 'X402 handler not configured' });

    const toolUrl = `http://localhost:${PORT}/tools/${toolName}`;

    try {
        const result = await x402Handler.executeWithPayment(toolUrl, { args });
        if (result.status === 'error') return res.status(500).json({ error: result.error });

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

app.post('/action', (req, res) => {
    const { action, componentId } = req.body;
    console.log(`[Server] Received User Action: ${action?.name} from ${componentId}`);
    res.json({ status: 'received', action });
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Agent server running on http://0.0.0.0:${PORT}`);
    console.log(`Using ADK InMemoryRunner with app: ${APP_NAME}`);
    if (process.env.AGENT_PRIVATE_KEY) console.log('✅ X402 payment handler configured');
});

export default app;
