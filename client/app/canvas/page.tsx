'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    type Node,
    type Edge,
    Panel,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import dagre from 'dagre';
import { Zap, Layers, X, Play, Calendar, Bell, TrendingUp, Grid3X3, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import AgentNode from '../components/AgentNode';
import { Navbar } from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAccount, useSendTransaction, useSwitchChain, useChainId } from 'wagmi';
import { cronosTestnet } from 'wagmi/chains';
import { parseEther } from 'viem';
import A2UIRenderer from '../components/A2UIRenderer';
import type { A2UIMessage } from '../types/a2ui';

// --- TYPES ---
type EventType = 'user_input' | 'orchestrator' | 'payment_required' | 'payment_success' | 'payment_failed' | 'tool_call' | 'tool_result' | 'final_response' | 'error';

interface AgentEvent {
    id: string;
    timestamp: number;
    type: EventType;
    agentName?: string;
    label: string;
    details?: string;
    cost?: number;
    walletAddress?: string;
    result?: unknown;
    metadata?: Record<string, unknown>;
}

interface A2UIWidget {
    id: string;
    type: 'event_card' | 'reminder' | 'price_alert' | 'search_result' | 'generic';
    title: string;
    data: Record<string, unknown>;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    cost?: number;
}

const nodeTypes = { agent: AgentNode };

// --- DAGRE LAYOUT ---
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 280, height: 140 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - 140,
                y: nodeWithPosition.y - 70,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

// --- WIDGET GENERATOR (A2UI) ---
const generateWidgets = (result: unknown): A2UIWidget[] => {
    const widgets: A2UIWidget[] = [];

    if (!result || typeof result !== 'object') return widgets;

    const data = result as Record<string, unknown>;

    // Check for event data
    if (data.events && Array.isArray(data.events)) {
        for (const event of data.events.slice(0, 3)) {
            widgets.push({
                id: `widget-event-${Date.now()}-${Math.random()}`,
                type: 'event_card',
                title: String(event.name || 'Event'),
                data: event,
            });
        }
    }

    // Check for price data
    if (data.price !== undefined || data.symbol) {
        widgets.push({
            id: `widget-price-${Date.now()}`,
            type: 'price_alert',
            title: `${data.symbol || 'Price'} Price`,
            data: data,
        });
    }

    // Check for search results
    if (data.results && Array.isArray(data.results)) {
        for (const result of data.results.slice(0, 3)) {
            widgets.push({
                id: `widget-search-${Date.now()}-${Math.random()}`,
                type: 'search_result',
                title: String(result.title || 'Result'),
                data: result,
            });
        }
    }

    // Fallback: create generic widget if we have data but no specific type matched
    if (widgets.length === 0 && Object.keys(data).length > 0) {
        widgets.push({
            id: `widget-generic-${Date.now()}`,
            type: 'generic',
            title: 'Result',
            data: data,
        });
    }

    return widgets;
};

function CanvasContent() {
    const searchParams = useSearchParams();
    const promptParam = searchParams.get('prompt') || '';

    const { isConnected, address } = useAccount();
    const { sendTransactionAsync } = useSendTransaction();
    const { switchChainAsync } = useSwitchChain();
    const chainId = useChainId();

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const reactFlowInstance = useReactFlow();

    const [events, setEvents] = useState<AgentEvent[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [widgets, setWidgets] = useState<A2UIWidget[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [prompt, setPrompt] = useState(promptParam);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'canvas' | 'chat'>('canvas');
    const [totalCost, setTotalCost] = useState(0);
    const [pendingPayment, setPendingPayment] = useState<{ cost: number; walletAddress: string; toolName: string } | null>(null);

    // A2UI State
    const [a2uiMessages, setA2UIMessages] = useState<A2UIMessage[]>([]);

    const executionRef = useRef(0);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Event to Node Mapper with Dagre Layout
    useEffect(() => {
        if (events.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const rawNodes: Node[] = events.map((ev) => ({
            id: ev.id,
            type: 'agent',
            position: { x: 0, y: 0 },
            data: {
                label: ev.label,
                subtitle: ev.agentName || ev.type.replace(/_/g, ' ').toUpperCase(),
                type: ev.type,
                status: ev.type === 'payment_failed' || ev.type === 'error' ? 'error' : (ev.id === events[events.length - 1].id && isExecuting ? 'running' : 'complete'),
                description: ev.details,
                cost: ev.cost,
            }
        }));

        const rawEdges: Edge[] = events.slice(0, -1).map((ev, index) => ({
            id: `edge-${index}`,
            source: ev.id,
            target: events[index + 1].id,
            animated: isExecuting && index === events.length - 2,
            type: 'default',
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges, 'LR');
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setTimeout(() => reactFlowInstance.fitView({ padding: 0.2, duration: 500 }), 100);
    }, [events, isExecuting, reactFlowInstance, setNodes, setEdges]);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Process x402 payment when required
    const processPayment = useCallback(async (cost: number, walletAddress: string, toolName: string): Promise<boolean> => {
        if (!address) return false;

        try {
            // Force switch to Cronos Testnet if on wrong chain
            if (chainId !== cronosTestnet.id) {
                try {
                    await switchChainAsync({ chainId: cronosTestnet.id });
                } catch (switchError) {
                    console.error('Failed to switch network:', switchError);
                    alert("Please switch your wallet to Cronos Testnet");
                    return false;
                }
            }

            const hash = await sendTransactionAsync({
                to: walletAddress as `0x${string}`,
                value: parseEther(cost.toString()),
            });

            // Call confirmation proxy (avoids CORS)
            await fetch('/api/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toolName: toolName,
                    txHash: hash
                })
            });

            // Update local state if needed (e.g. to show link immediately)
            // But usually the backend emits 'payment_success' with details soon.
            // We can optimistic update here if desired, but let's rely on server event stream.

            setTotalCost(prev => prev + cost);
            return true;

            setTotalCost(prev => prev + cost);
            return true;
        } catch (error) {
            console.error('Payment failed:', error);
            return false;
        }
    }, [address, sendTransactionAsync, pendingPayment]);

    // Run the agent via API
    const handleRun = async () => {
        if (!prompt.trim()) return;
        if (!isConnected || !address) {
            alert("Connect your wallet to Cronos Testnet to proceed.");
            return;
        }

        const executionId = executionRef.current + 1;
        executionRef.current = executionId;

        // Abort any previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsExecuting(true);
        setEvents([]);
        setWidgets([]);
        setChatMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: prompt, timestamp: Date.now() }]);

        let workflowCost = 0;

        try {
            const response = await fetch('/api/agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    userAddress: address,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const eventData = line.slice(6).trim();
                        if (!eventData) continue;

                        try {
                            const event: AgentEvent = JSON.parse(eventData);

                            if (executionRef.current !== executionId) continue;

                            // Deduplicate events by ID AND by type+agentName combo
                            setEvents(prev => {
                                // Check if event with this ID already exists
                                if (prev.some(e => e.id === event.id)) {
                                    return prev; // Skip duplicate
                                }
                                // For payment_required, also dedupe by agentName to prevent multiple pending payments for same tool
                                if (event.type === 'payment_required' && event.agentName) {
                                    const existingPending = prev.find(e =>
                                        e.type === 'payment_required' && e.agentName === event.agentName
                                    );
                                    if (existingPending) {
                                        return prev; // Skip duplicate payment request for same tool
                                    }
                                }
                                return [...prev, event];
                            });

                            // Handle payment_required - process x402 payment
                            if (event.type === 'payment_required' && event.cost && event.walletAddress) {
                                // Store toolName (agentName) for confirmation
                                const toolName = event.agentName || 'unknown_tool';
                                setPendingPayment({ cost: event.cost, walletAddress: event.walletAddress, toolName });

                                const success = await processPayment(event.cost, event.walletAddress, toolName);
                                if (!success) {
                                    setEvents(prev => [...prev, {
                                        id: `payment-fail-${Date.now()}`,
                                        timestamp: Date.now(),
                                        type: 'payment_failed',
                                        label: 'Payment Failed',
                                        details: 'x402 transaction rejected by user',
                                    }]);
                                    break;
                                }
                                workflowCost += event.cost;
                                setPendingPayment(null);
                            }

                            // Handle final_response - process A2UI from metadata
                            if (event.type === 'final_response' && event.metadata?.a2ui) {
                                const msgs = event.metadata.a2ui as A2UIMessage[];
                                setA2UIMessages(msgs);
                                setIsSidebarOpen(true);
                            }
                        } catch (e) {
                            console.error('Failed to parse event:', e);
                        }
                    }
                }
            }

            if (executionRef.current === executionId) {
                const lastEvent = events[events.length - 1];
                setChatMessages(prev => [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: lastEvent?.details || 'Task completed.',
                    timestamp: Date.now(),
                    cost: workflowCost > 0 ? workflowCost : undefined,
                }]);
            }
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                console.log('Request aborted');
            } else {
                console.error('Agent execution error:', error);
                setEvents(prev => [...prev, {
                    id: `error-${Date.now()}`,
                    timestamp: Date.now(),
                    type: 'error',
                    label: 'Error',
                    details: error instanceof Error ? error.message : 'Unknown error',
                }]);
                setChatMessages(prev => [...prev, {
                    id: `system-${Date.now()}`,
                    role: 'system',
                    content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    timestamp: Date.now(),
                }]);
            }
        }

        if (executionRef.current === executionId) {
            setIsExecuting(false);
            setPendingPayment(null);
        }

        setPrompt('');
    };

    return (
        <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
            <Navbar />

            <div className="flex-1 flex pt-20 lg:pt-24 overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 relative flex flex-col">

                    {/* View Toggle - Centered */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex glass rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('canvas')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'canvas'
                                ? 'bg-[var(--accent)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <Grid3X3 size={16} />
                            <span className="hidden sm:inline">Canvas</span>
                        </button>
                        <button
                            onClick={() => setViewMode('chat')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'chat'
                                ? 'bg-[var(--accent)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <MessageSquare size={16} />
                            <span className="hidden sm:inline">Chat</span>
                        </button>
                    </div>

                    {/* Cost Display */}
                    <div className="absolute top-4 right-4 z-20 glass rounded-xl px-4 py-2 flex items-center gap-2">
                        <Zap size={16} className="text-[var(--warning)]" />
                        <span className="text-sm font-mono text-[var(--text-primary)]">{totalCost.toFixed(4)} TCRO</span>
                    </div>

                    {/* Pending Payment Overlay */}
                    {pendingPayment && (
                        <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center">
                            <div className="glass-strong rounded-2xl p-8 text-center max-w-md">
                                <Loader2 size={48} className="animate-spin text-[var(--accent)] mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">x402 Payment Required</h3>
                                <p className="text-[var(--text-secondary)] mb-4">
                                    Confirm the transaction in your wallet
                                </p>
                                <div className="text-2xl font-mono text-[var(--accent)]">
                                    {pendingPayment.cost} TCRO
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Canvas View */}
                    {viewMode === 'canvas' && (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodeTypes={nodeTypes}
                            fitView
                            minZoom={0.3}
                            maxZoom={2}
                            className="flex-1 bg-[var(--bg-primary)]"
                        >
                            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.03)" />
                            <Controls className="!bg-[var(--bg-tertiary)] !border-[var(--border)] !rounded-xl !shadow-lg" />
                        </ReactFlow>
                    )}

                    {/* Chat View */}
                    {viewMode === 'chat' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {chatMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <MessageSquare size={48} strokeWidth={1} className="text-[var(--text-tertiary)] mb-4" />
                                        <p className="text-[var(--text-secondary)] font-medium">Start a conversation</p>
                                        <p className="text-sm text-[var(--text-tertiary)]">Ask your agents anything, pay per result.</p>
                                    </div>
                                ) : (
                                    chatMessages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                ? 'bg-[var(--accent)] text-white'
                                                : msg.role === 'system'
                                                    ? 'bg-[var(--error)] bg-opacity-20 text-[var(--error)] border border-[var(--error)]'
                                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)]'
                                                }`}>
                                                <p className="text-sm">{msg.content}</p>
                                                {msg.cost && (
                                                    <p className="text-xs mt-1 opacity-70 flex items-center gap-1">
                                                        <Zap size={10} /> {msg.cost.toFixed(4)} TCRO
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        </div>
                    )}

                    {/* Prompt Bar (shared) */}
                    <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                        <div className="max-w-3xl mx-auto flex gap-2">
                            <input
                                className="flex-1 input"
                                placeholder={isConnected ? "Ask the agents..." : "Connect wallet to start..."}
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                disabled={isExecuting || !isConnected}
                                onKeyDown={e => e.key === 'Enter' && handleRun()}
                            />
                            <button
                                onClick={handleRun}
                                disabled={!isConnected || isExecuting || !prompt.trim()}
                                className={`btn-primary flex items-center gap-2 ${(!isConnected || !prompt.trim()) && 'opacity-50 cursor-not-allowed'
                                    }`}
                            >
                                {isExecuting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                                Run
                            </button>
                        </div>
                        {!isConnected && (
                            <p className="text-center text-sm text-[var(--warning)] mt-2 flex items-center justify-center gap-2">
                                <AlertTriangle size={14} />
                                Connect wallet to Cronos Testnet for x402 payments (TCRO)
                            </p>
                        )}
                    </div>
                </div>

                {/* Sidebar (A2UI Widgets) */}
                <aside
                    className={`
                        fixed inset-y-0 right-0 z-40 w-full sm:w-80 lg:w-96 bg-[var(--bg-secondary)] border-l border-[var(--border)] shadow-2xl transition-transform duration-300 transform pt-20 lg:pt-24
                        lg:relative lg:transform-none lg:shadow-none
                        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                    `}
                >
                    <div className="lg:hidden absolute top-20 left-0 right-0 h-14 flex items-center justify-between px-4 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                        <h2 className="font-semibold text-[var(--text-primary)]">A2UI Widgets</h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)]">
                            <X size={20} className="text-[var(--text-secondary)]" />
                        </button>
                    </div>

                    <div className="h-full overflow-y-auto p-4 lg:p-6 lg:pt-6">
                        {a2uiMessages.length > 0 ? (
                            <A2UIRenderer
                                messages={a2uiMessages}
                                onAction={async (payload) => {
                                    console.log('A2UI User Action:', payload);
                                    try {
                                        await fetch('/api/action', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(payload),
                                        });
                                    } catch (e) {
                                        console.error('Failed to send action:', e);
                                    }
                                }}
                            />
                        ) : (
                            <div className="pt-10 text-center opacity-60">
                                <Layers size={40} strokeWidth={1} className="mx-auto mb-4 text-[var(--text-tertiary)]" />
                                <p className="text-sm text-[var(--text-tertiary)]">A2UI widgets will appear here</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Mobile Sidebar Toggle */}
                <button
                    className="lg:hidden fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-[var(--accent)] text-white shadow-lg flex items-center justify-center"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    <Layers size={24} />
                </button>
            </div>
        </div>
    );
}

function WidgetCard({ widget }: { widget: A2UIWidget }) {
    const icons: Record<string, React.ComponentType<{ size?: number }>> = {
        event_card: Calendar,
        reminder: Bell,
        price_alert: TrendingUp,
        search_result: Layers,
        generic: Zap,
    };
    const Icon = icons[widget.type] || Zap;

    return (
        <Card className="bg-[var(--bg-tertiary)] border-[var(--border)]">
            <CardHeader className="pb-2 pt-4 px-4 border-b border-[var(--border)] flex flex-row items-center gap-3 space-y-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center shrink-0 text-[var(--accent)]">
                    <Icon size={20} />
                </div>
                <CardTitle className="text-base font-semibold text-[var(--text-primary)]">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4 space-y-2 text-[var(--text-secondary)]">
                {widget.type === 'event_card' && (
                    <>
                        {widget.data.date && (
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-tertiary)]">Date</span>
                                <span>{String(widget.data.date)}</span>
                            </div>
                        )}
                        {widget.data.location && (
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-tertiary)]">Location</span>
                                <span className="text-right">{String(widget.data.location)}</span>
                            </div>
                        )}
                    </>
                )}
                {widget.type === 'price_alert' && (
                    <div className="flex items-baseline justify-between">
                        <span className="text-[var(--text-tertiary)]">Price</span>
                        <span className="text-2xl font-bold text-[var(--text-primary)]">
                            ${Number(widget.data.price || widget.data.currentPrice || 0).toFixed(4)}
                        </span>
                    </div>
                )}
                {widget.type === 'search_result' && (
                    <>
                        {widget.data.description && (
                            <p className="text-sm text-[var(--text-secondary)]">{String(widget.data.description).slice(0, 150)}...</p>
                        )}
                        {widget.data.url && (
                            <a href={String(widget.data.url)} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] hover:underline">
                                View Source →
                            </a>
                        )}
                    </>
                )}
                {widget.type === 'generic' && (
                    <pre className="text-xs bg-[var(--bg-primary)] p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(widget.data, null, 2)}
                    </pre>
                )}
            </CardContent>
        </Card>
    );
}

export default function CanvasPage() {
    return (
        <ReactFlowProvider>
            <Suspense fallback={<div className="h-screen w-screen bg-[var(--bg-primary)]" />}>
                <CanvasContent />
            </Suspense>
        </ReactFlowProvider>
    );
}
