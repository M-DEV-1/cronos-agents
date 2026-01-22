import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { rootAgent } from './agent.js';
import { paymentEvents } from './pay-wrapper.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

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
app.post('/run', async (req, res) => {
    const { prompt } = req.body;
    const userAddress = req.headers['x-user-address'] as string;

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

    let eventId = 0;
    const nextId = () => `evt-${++eventId}`;

    try {
        // 1. Emit user input
        emit({
            id: nextId(),
            timestamp: Date.now(),
            type: 'user_input',
            label: 'User Request',
            details: prompt,
        });

        // 2. Emit orchestrator start
        emit({
            id: nextId(),
            timestamp: Date.now(),
            type: 'orchestrator',
            agentName: 'Source Agent',
            label: 'Orchestrator',
            details: 'Analyzing request and selecting tools...',
        });

        // Set up payment event listener
        const paymentHandler = (data: { name: string; cost: number; walletAddress: string; status: 'pending' | 'success' | 'failed' }) => {
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

        // Set up tool call listener
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

        // 3. Run the agent
        // Using ADK's run method with the prompt
        // @ts-ignore - ADK interface varies
        const result = await rootAgent.run({
            messages: [{ role: 'user', content: prompt }],
            context: { userAddress },
        });

        // 4. Emit final response
        emit({
            id: nextId(),
            timestamp: Date.now(),
            type: 'final_response',
            label: 'Final Response',
            details: typeof result === 'string' ? result : JSON.stringify(result),
            result: result,
            metadata: {
                // Extract widget hints from result if available
                hasWidgets: true,
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
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
    console.log(`Agent server running on http://localhost:${PORT}`);
});

export default app;
