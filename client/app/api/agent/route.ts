import { NextRequest, NextResponse } from 'next/server';

/**
 * Architecture:
 * - Next.js frontend calls this API route
 * - This route proxies to the ADK agent server (server.ts on port 4000)
 * - Agent server runs rootAgent (ADK LlmAgent) with paid tools
 * - Events stream back via SSE
 */

export interface AgentEvent {
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

// Agent server URL (the backend running the ADK agent)
const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
    try {
        const { prompt, userAddress } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!userAddress) {
            return NextResponse.json({ error: 'User wallet address is required' }, { status: 400 });
        }

        // Create a streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const emit = (event: AgentEvent) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                };

                try {
                    // Call the agent server
                    const response = await fetch(`${AGENT_SERVER_URL}/run`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-User-Address': userAddress,
                        },
                        body: JSON.stringify({ prompt }),
                    });

                    if (!response.ok) {
                        emit({
                            id: `error-${Date.now()}`,
                            timestamp: Date.now(),
                            type: 'error',
                            label: 'Agent Error',
                            details: `Agent server returned ${response.status}`,
                        });
                        controller.close();
                        return;
                    }

                    // Stream the response
                    const reader = response.body?.getReader();
                    if (!reader) {
                        throw new Error('No response body');
                    }

                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        // Process SSE events from buffer
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const eventData = line.slice(6);
                                if (eventData.trim()) {
                                    controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Agent execution error:', error);
                    emit({
                        id: `error-${Date.now()}`,
                        timestamp: Date.now(),
                        type: 'error',
                        label: 'Connection Error',
                        details: error instanceof Error ? error.message : 'Failed to connect to agent server',
                    });
                }

                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('API route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
