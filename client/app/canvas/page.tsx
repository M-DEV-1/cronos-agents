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
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import dagre from 'dagre';
import {
    Zap, Layers, X, Play, Grid3X3, MessageSquare,
    AlertTriangle, Loader2, Sparkles, GripVertical,
    CheckCircle2, XCircle, Clock, ArrowRight
} from 'lucide-react';
import AgentNode from '../components/AgentNode';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { useAccount } from 'wagmi';
import A2UIRenderer from '../components/A2UIRenderer';
import type { A2UIMessage } from '../types/a2ui';
import { MOCK_A2UI_PAYLOAD } from './mock-a2ui-data';

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
    if (nodes.length === 0) return { nodes: [], edges: [] };

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 240, height: 100 });
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
                x: nodeWithPosition.x - 120,
                y: nodeWithPosition.y - 50,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

// --- EXECUTION STATUS ---
type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error';

function CanvasContent() {
    const searchParams = useSearchParams();
    const promptParam = searchParams.get('prompt') || '';
    const { isConnected, address } = useAccount();
    const reactFlowInstance = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // View mode - canvas or chat
    const [viewMode, setViewMode] = useState<'canvas' | 'chat'>('canvas');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
    const [prompt, setPrompt] = useState(promptParam);
    const [totalCost, setTotalCost] = useState(0);

    // Track all events locally for the graph view
    const [events, setEvents] = useState<AgentEvent[]>([]);

    // A2UI State - store raw result for display
    const [a2uiMessages, setA2UIMessages] = useState<A2UIMessage[]>([]);
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isResizing, setIsResizing] = useState(false);

    // DEBUG: Inject test message to verify SDK
    /*
    useEffect(() => {
        const testMsg: any = {
            surfaceUpdate: {
                components: [{
                    id: "test_root",
                    component: { Card: { title: { literalString: "SDK Test" }, child: "test_text" } }
                }, {
                    id: "test_text",
                    component: { Text: { text: { literalString: "If you can see this, A2UI SDK is working." } } }
                }]
            }
        };
        const beginMsg: any = { beginRendering: { root: "test_root" } };
        setA2UIMessages([testMsg, beginMsg]);
    }, []);
    */

    const executionRef = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Event to Node Mapper - only meaningful events
    useEffect(() => {
        if (events.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        // Only show semantic nodes
        const meaningfulTypes = ['user_input', 'tool_call', 'payment_success', 'final_response', 'error'];
        const filteredEvents = events.filter(ev => meaningfulTypes.includes(ev.type));

        if (filteredEvents.length === 0) return;

        const rawNodes: Node[] = filteredEvents.map((ev, index) => ({
            id: ev.id,
            type: 'agent',
            position: { x: 0, y: 0 },
            data: {
                label: ev.label,
                subtitle: ev.agentName || ev.type.replace(/_/g, ' ').toUpperCase(),
                type: ev.type,
                status: ev.type === 'error' ? 'error' :
                    ev.type === 'final_response' ? 'complete' :
                        (ev.id === filteredEvents[filteredEvents.length - 1].id && executionStatus === 'running' ? 'running' : 'complete'),
                description: ev.details && ev.details.length > 300 ? ev.details.slice(0, 300) + '...' : ev.details,
                cost: ev.cost,
            }
        }));

        const rawEdges: Edge[] = filteredEvents.slice(0, -1).map((ev, index) => ({
            id: `edge-${index}`,
            source: ev.id,
            target: filteredEvents[index + 1].id,
            animated: executionStatus === 'running' && index === filteredEvents.length - 2,
            style: { stroke: 'var(--border-strong)', strokeWidth: 2 },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges, 'TB');
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        if (executionStatus !== 'running') {
            setTimeout(() => reactFlowInstance.fitView({ padding: 0.3, duration: 400 }), 100);
        }
    }, [events, executionStatus, reactFlowInstance, setNodes, setEdges]);

    // Scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Sidebar resize handler
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        const newWidth = window.innerWidth - e.clientX;
        setSidebarWidth(Math.min(Math.max(newWidth, 300), 600));
    }, [isResizing]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    // Run agent
    const handleRun = async () => {
        if (!prompt.trim() || !isConnected || !address) return;

        const executionId = ++executionRef.current;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setExecutionStatus('running');
        setEvents([]);
        setA2UIMessages([]);
        setChatMessages(prev => [...prev, {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            timestamp: Date.now()
        }]);

        let workflowCost = 0;
        let finalResultText = '';

        try {
            const response = await fetch('/api/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, userAddress: address }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

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
                    if (!line.startsWith('data: ')) continue;
                    const eventData = line.slice(6).trim();
                    if (!eventData) continue;

                    try {
                        const event: AgentEvent = JSON.parse(eventData);
                        if (executionRef.current !== executionId) continue;

                        setEvents(prev => {
                            if (prev.some(e => e.id === event.id)) return prev;
                            return [...prev, event];
                        });

                        if (event.type === 'payment_success' && event.cost) {
                            workflowCost += event.cost;
                            setTotalCost(prev => prev + event.cost!);
                        }

                        if (event.type === 'final_response') {
                            const resultText = event.details || 'Completed';
                            finalResultText = resultText;

                            // Client-side A2UI Extraction
                            const content = resultText;
                            const messages: A2UIMessage[] = [];

                            if (typeof content === 'string') {
                                const lines = content.split('\n');
                                for (const line of lines) {
                                    const trimmed = line.trim();
                                    // Robust check for A2UI JSON
                                    if (trimmed.startsWith('{') && (
                                        trimmed.includes('"surfaceUpdate"') ||
                                        trimmed.includes('"dataModelUpdate"') ||
                                        trimmed.includes('"beginRendering"')
                                    )) {
                                        try {
                                            console.log('[Extract] Found potential A2UI line:', trimmed.slice(0, 50));
                                            const parsed = JSON.parse(trimmed);
                                            messages.push(parsed);
                                        } catch (e) {
                                            console.warn('[Extract] A2UI Parse Error:', e);
                                        }
                                    }
                                }
                                console.log('[Extract] Total messages parsed:', messages.length);
                            }

                            if (messages.length > 0) {
                                setA2UIMessages(messages);
                            } else if (event.metadata?.a2ui && Array.isArray(event.metadata.a2ui)) {
                                // Fallback just in case
                                setA2UIMessages(event.metadata.a2ui as A2UIMessage[]);
                            }
                        }
                    } catch (e) {
                        console.error('Failed to parse event:', e);
                    }
                }
            }

            // Add assistant message to chat
            if (finalResultText) {
                setChatMessages(prev => [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: finalResultText,
                    timestamp: Date.now(),
                    cost: workflowCost > 0 ? workflowCost : undefined,
                }]);
                setExecutionStatus('completed');

                // HARDCODED OVERRIDE: Inject Mock A2UI for demonstration
                // as requested by user ("A2UI isn't working... hardcode for JSON-data inferred UI")
                setTimeout(() => {
                    setA2UIMessages(MOCK_A2UI_PAYLOAD as any);
                }, 500);
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                console.error('Agent execution error:', error);
                setEvents(prev => [...prev, {
                    id: `error-${Date.now()}`,
                    timestamp: Date.now(),
                    type: 'error',
                    label: 'Error',
                    details: error instanceof Error ? error.message : 'Unknown error',
                }]);
                setExecutionStatus('error');
            }
        }

        setPrompt('');
    };

    // Status indicator
    const StatusIndicator = () => {
        const config = {
            idle: { icon: Clock, color: 'var(--text-tertiary)', label: 'Ready' },
            running: { icon: Loader2, color: 'var(--accent)', label: 'Running' },
            completed: { icon: CheckCircle2, color: 'var(--success)', label: 'Done' },
            error: { icon: XCircle, color: 'var(--error)', label: 'Error' },
        }[executionStatus];
        const Icon = config.icon;

        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <Icon
                    size={14}
                    className={executionStatus === 'running' ? 'animate-spin' : ''}
                    style={{ color: config.color }}
                />
                <span className="text-xs font-medium text-[var(--text-secondary)]">{config.label}</span>
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
            <Navbar />

            <div className="flex-1 flex overflow-hidden" style={{ paddingTop: '64px' }}>
                {/* Main Canvas/Chat Area */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* Top Bar */}
                    <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                        {/* View Toggle */}
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-tertiary)]">
                            <button
                                onClick={() => setViewMode('canvas')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'canvas'
                                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                    }`}
                            >
                                <Grid3X3 size={12} /> Canvas
                            </button>
                            <button
                                onClick={() => setViewMode('chat')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'chat'
                                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                    }`}
                            >
                                <MessageSquare size={12} /> Chat
                            </button>
                        </div>

                        {/* Status + Cost */}
                        <div className="flex items-center gap-3">
                            <StatusIndicator />
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                                <Zap size={12} className="text-[var(--warning)]" />
                                <span className="text-xs font-mono font-medium text-[var(--text-primary)]">
                                    {totalCost.toFixed(4)} TCRO
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Canvas View */}
                    {viewMode === 'canvas' && (
                        <div className="flex-1 relative">
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                nodeTypes={nodeTypes}
                                fitView
                                minZoom={0.2}
                                maxZoom={2}
                                className="bg-[var(--bg-primary)]"
                                proOptions={{ hideAttribution: true }}
                            >
                                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.03)" />
                                <Controls className="!bg-[var(--bg-tertiary)] !border-[var(--border)] !rounded-lg" />
                            </ReactFlow>

                            {/* Empty State */}
                            {events.length === 0 && executionStatus === 'idle' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-3">
                                            <Layers size={24} className="text-[var(--text-tertiary)]" />
                                        </div>
                                        <p className="text-sm font-medium text-[var(--text-secondary)]">No active workflow</p>
                                        <p className="text-xs text-[var(--text-tertiary)]">Enter a prompt below to start</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chat View */}
                    {viewMode === 'chat' && (
                        <div className="flex-1 overflow-y-auto p-4">
                            {chatMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <MessageSquare size={40} strokeWidth={1} className="text-[var(--text-tertiary)] mb-3" />
                                    <p className="text-sm font-medium text-[var(--text-secondary)]">Start a conversation</p>
                                    <p className="text-xs text-[var(--text-tertiary)]">Ask anything, pay per result</p>
                                </div>
                            ) : (
                                <div className="max-w-2xl mx-auto space-y-3">
                                    {chatMessages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === 'user'
                                                ? 'bg-[var(--accent)] text-white'
                                                : msg.role === 'system'
                                                    ? 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20'
                                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)]'
                                                }`}>
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                {msg.cost && (
                                                    <p className="text-xs mt-1 opacity-60 flex items-center gap-1">
                                                        <Zap size={10} /> {msg.cost.toFixed(4)} TCRO
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Prompt Bar */}
                    <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                        <div className="max-w-2xl mx-auto flex gap-2">
                            <input
                                className="flex-1 h-10 px-4 rounded-lg text-sm bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                placeholder={isConnected ? "Ask the agents..." : "Connect wallet to start"}
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                disabled={executionStatus === 'running' || !isConnected}
                                onKeyDown={e => e.key === 'Enter' && handleRun()}
                            />
                            <Button
                                onClick={handleRun}
                                disabled={!isConnected || executionStatus === 'running' || !prompt.trim()}
                                className="h-10 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40"
                            >
                                {executionStatus === 'running' ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <Play size={14} fill="currentColor" className="mr-1.5" />
                                        Run
                                    </>
                                )}
                            </Button>
                        </div>
                        {!isConnected && (
                            <p className="text-center text-xs text-[var(--warning)] mt-2 flex items-center justify-center gap-1.5">
                                <AlertTriangle size={12} />
                                Connect wallet to Cronos Testnet
                            </p>
                        )}
                    </div>
                </div>

                {/* Resize Handle */}
                <div
                    className="w-1 hover:w-1.5 bg-[var(--border)] hover:bg-[var(--accent)] cursor-col-resize transition-all hidden lg:block"
                    onMouseDown={() => setIsResizing(true)}
                />

                {/* A2UI Sidebar */}
                <aside
                    className="hidden lg:flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border)]"
                    style={{ width: sidebarWidth }}
                >
                    {/* Header */}
                    <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-[var(--accent)]" />
                            <span className="text-sm font-medium text-[var(--text-primary)]">A2UI</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-quaternary)]">
                            Interactive
                        </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {executionStatus === 'running' ? (
                            /* Loading State */
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-4">
                                    <Loader2 size={28} className="animate-spin text-[var(--accent)]" />
                                </div>
                                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Building your app...</p>
                                <p className="text-xs text-[var(--text-tertiary)]">Agents are generating your interface</p>
                            </div>
                        ) : a2uiMessages.length > 0 ? (
                            /* A2UI Content */
                            <A2UIRenderer
                                messages={a2uiMessages}
                                onAction={async (payload) => {
                                    console.log('A2UI Action:', payload);
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
                            /* Empty State */
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
                                    <Layers size={24} className="text-[var(--text-tertiary)]" />
                                </div>
                                <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">No interface yet</p>
                                <p className="text-xs text-[var(--text-tertiary)] max-w-[200px]">
                                    Run a workflow and agents will build an interactive UI here
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer - Powered by A2UI */}
                    <div className="h-10 flex items-center justify-center border-t border-[var(--border)] bg-[var(--bg-tertiary)]">
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-quaternary)]">
                            Powered by <span className="text-[var(--accent)]">A2UI</span>
                        </span>
                    </div>
                </aside>

                {/* Mobile Sidebar (overlay) */}
                {/* TODO: Add mobile sidebar toggle */}
            </div>
        </div>
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
