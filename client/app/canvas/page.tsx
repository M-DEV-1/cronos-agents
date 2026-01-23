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
import { Zap, Layers, X, Play, Calendar, Bell, TrendingUp, Grid3X3, MessageSquare, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import AgentNode from '../components/AgentNode';
import { Navbar } from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAccount } from 'wagmi';
import A2UIRenderer from '../components/A2UIRenderer';
import type { A2UIMessage } from '../types/a2ui';
import type { ExecutionRun, ExecutionStep, StepStatus } from '../types/execution';

const nodeTypes = { agent: AgentNode };

// --- DAGRE LAYOUT ---
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    if (nodes.length === 0) return { nodes: [], edges: [] };

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 260, height: 90 });
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
                x: nodeWithPosition.x - 130,
                y: nodeWithPosition.y - 45,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

// Chat message type
interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    cost?: number;
}

function CanvasContent() {
    const searchParams = useSearchParams();
    const promptParam = searchParams.get('prompt') || '';

    const { isConnected, address } = useAccount();

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const reactFlowInstance = useReactFlow();

    // View mode - canvas or chat
    const [viewMode, setViewMode] = useState<'canvas' | 'chat'>('canvas');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Execution state
    const [run, setRun] = useState<ExecutionRun | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [prompt, setPrompt] = useState(promptParam);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [totalCost, setTotalCost] = useState(0);
    const [pendingPayment, setPendingPayment] = useState<{ cost: number; walletAddress: string; toolName: string } | null>(null);

    // A2UI State - store raw result for display
    const [a2uiMessages, setA2UIMessages] = useState<A2UIMessage[]>([]);
    const [lastResult, setLastResult] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Map ExecutionSteps to React Flow nodes
    useEffect(() => {
        if (!run || run.steps.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const rawNodes: Node[] = run.steps.map((step) => ({
            id: step.stepId,
            type: 'agent',
            position: { x: 0, y: 0 },
            data: {
                label: step.label,
                kind: step.kind,
                status: step.status,
                description: step.description,
                toolName: step.toolName,
                mcpServer: step.mcpServer,
                cost: step.cost,
            }
        }));

        const rawEdges: Edge[] = run.steps.slice(0, -1).map((step, index) => ({
            id: `edge-${index}`,
            source: step.stepId,
            target: run.steps[index + 1].stepId,
            animated: run.steps[index + 1].status === 'running',
            style: {
                stroke: run.steps[index + 1].status === 'running' ? '#3B8A8C' : 'var(--text-quaternary)',
                strokeWidth: 2,
            },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges, 'TB');
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        setTimeout(() => reactFlowInstance.fitView({ padding: 0.2, duration: 400 }), 100);
    }, [run, reactFlowInstance, setNodes, setEdges]);

    // Payment tracking (server handles actual x402 payments automatically)
    // This just updates the UI when we receive payment events
    const trackPayment = useCallback((cost: number, walletAddress: string, toolName: string) => {
        console.log(`[x402] Server processing payment: ${cost} TCRO for ${toolName}`);
        setTotalCost(prev => prev + cost);
    }, []);

    // Run agent
    const handleRun = async () => {
        if (!prompt.trim()) return;
        if (!isConnected || !address) {
            alert("Connect your wallet to Cronos Testnet to proceed.");
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsExecuting(true);
        setA2UIMessages([]);
        setLastResult(null);

        // Add user message to chat
        setChatMessages(prev => [...prev, {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            timestamp: Date.now(),
        }]);

        const newRun: ExecutionRun = {
            runId: `run_${Date.now()}`,
            prompt,
            steps: [],
            status: 'planning',
            totalCost: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        setRun(newRun);

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
                    if (line.startsWith('data: ')) {
                        const eventData = line.slice(6).trim();
                        if (!eventData) continue;

                        try {
                            const event = JSON.parse(eventData);

                            switch (event.type) {
                                case 'run_started':
                                    if (event.steps) {
                                        setRun(prev => prev ? {
                                            ...prev,
                                            runId: event.runId || prev.runId,
                                            steps: event.steps,
                                            status: 'executing',
                                        } : prev);
                                    }
                                    break;

                                case 'step_started':
                                    updateStepStatus(event.stepId, 'running', { startedAt: Date.now() });
                                    break;

                                case 'step_completed':
                                    updateStepStatus(event.stepId, 'completed', {
                                        completedAt: Date.now(),
                                        result: event.result,
                                        cost: event.cost,
                                    });
                                    if (event.cost) workflowCost += event.cost;
                                    break;

                                case 'step_failed':
                                    updateStepStatus(event.stepId, 'failed');
                                    break;

                                case 'a2ui':
                                    if (event.a2ui && Array.isArray(event.a2ui)) {
                                        setA2UIMessages(event.a2ui);
                                        setIsSidebarOpen(true);
                                    }
                                    break;

                                case 'payment_required':
                                    if (event.cost && event.walletAddress) {
                                        setPendingPayment({
                                            cost: event.cost,
                                            walletAddress: event.walletAddress,
                                            toolName: event.toolName || 'tool'
                                        });
                                        const success = await processPayment(event.cost, event.walletAddress, event.toolName);
                                        if (!success && event.stepId) {
                                            updateStepStatus(event.stepId, 'failed');
                                        }
                                        setPendingPayment(null);
                                    }
                                }
                                return [...prev, event];
                            });

                            // Handle payment events - server processes these automatically
                            // Just track the status in the UI
                            if (event.type === 'payment_required' && event.cost && event.walletAddress) {
                                const toolName = event.agentName || 'unknown_tool';
                                // Show pending status briefly (server handles auto-payment)
                                setPendingPayment({ cost: event.cost, walletAddress: event.walletAddress, toolName });
                            }

                            // Payment success - update UI and track cost
                            if (event.type === 'payment_success' && event.cost) {
                                trackPayment(event.cost, event.walletAddress || '', event.agentName || '');
                                setPendingPayment(null);
                            }

                            // Payment failed (shouldn't happen with auto-pay, but handle it)
                            if (event.type === 'payment_failed') {
                                setPendingPayment(null);
                            }

                                case 'run_completed':
                                    setRun(prev => prev ? { ...prev, status: 'completed', totalCost: workflowCost } : prev);
                                    break;

                                case 'run_failed':
                                    setRun(prev => prev ? { ...prev, status: 'failed' } : prev);
                                    break;

                                // Legacy events for backward compatibility
                                case 'user_input':
                                    setRun(prev => {
                                        if (!prev) return prev;
                                        const intentStep: ExecutionStep = {
                                            stepId: `step_intent_${Date.now()}`,
                                            kind: 'intent',
                                            label: 'Understanding Request',
                                            description: event.details,
                                            status: 'completed',
                                            cost: 0,
                                        };
                                        return { ...prev, steps: [...prev.steps, intentStep], status: 'executing' };
                                    });
                                    break;

                                case 'tool_call':
                                    setRun(prev => {
                                        if (!prev) return prev;
                                        const toolStep: ExecutionStep = {
                                            stepId: `step_tool_${Date.now()}`,
                                            kind: 'tool',
                                            label: event.label || event.agentName || 'Tool Call',
                                            toolName: event.agentName,
                                            status: 'running',
                                            cost: event.cost || 0.01,
                                        };
                                        return { ...prev, steps: [...prev.steps, toolStep] };
                                    });
                                    break;

                                case 'final_response':
                                    // Capture result for display
                                    const resultText = event.details || 'Completed';
                                    finalResultText = resultText;
                                    setLastResult(resultText);

                                    // Extract A2UI if present
                                    if (event.metadata?.a2ui && Array.isArray(event.metadata.a2ui)) {
                                        setA2UIMessages(event.metadata.a2ui);
                                        setIsSidebarOpen(true);
                                    }

                                    // Mark tool steps complete, add UI step
                                    setRun(prev => {
                                        if (!prev) return prev;
                                        const updatedSteps = prev.steps.map(s =>
                                            s.status === 'running' ? { ...s, status: 'completed' as StepStatus } : s
                                        );
                                        const uiStep: ExecutionStep = {
                                            stepId: `step_ui_${Date.now()}`,
                                            kind: 'ui',
                                            label: 'Results',
                                            status: 'completed',
                                            cost: 0,
                                        };
                                        return { ...prev, steps: [...updatedSteps, uiStep], status: 'completed' };
                                    });
                                    break;

                                case 'error':
                                    setRun(prev => {
                                        if (!prev) return prev;
                                        const errorStep: ExecutionStep = {
                                            stepId: `step_error_${Date.now()}`,
                                            kind: 'intent',
                                            label: 'Error',
                                            description: event.details,
                                            status: 'failed',
                                            cost: 0,
                                        };
                                        return { ...prev, steps: [...prev.steps, errorStep], status: 'failed' };
                                    });
                                    break;
                            }
                        } catch (e) {
                            console.error('Failed to parse event:', e);
                        }
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
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                console.error('Agent execution error:', error);
                setRun(prev => prev ? { ...prev, status: 'failed' } : prev);
                setChatMessages(prev => [...prev, {
                    id: `system-${Date.now()}`,
                    role: 'system',
                    content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    timestamp: Date.now(),
                }]);
            }
        }

        setIsExecuting(false);
        setPendingPayment(null);
        setTotalCost(prev => prev + workflowCost);
        setPrompt('');
    };

    // Handle A2UI actions
    const handleA2UIAction = async (payload: unknown) => {
        console.log('A2UI Action:', payload);
        try {
            await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ runId: run?.runId, action: payload }),
            });
        } catch (e) {
            console.error('Failed to send action:', e);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
            <Navbar />

            <div className="flex-1 flex pt-16 overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 relative flex flex-col">

                    {/* Top Bar */}
                    <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
                        {/* View Mode Toggle */}
                        <div className="glass rounded-xl p-1 flex">
                            <button
                                onClick={() => setViewMode('canvas')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'canvas'
                                        ? 'bg-[var(--accent)] text-white'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <Grid3X3 size={14} />
                                Canvas
                            </button>
                            <button
                                onClick={() => setViewMode('chat')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'chat'
                                        ? 'bg-[var(--accent)] text-white'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <MessageSquare size={14} />
                                Chat
                            </button>
                        </div>

                        {/* Run Status + Cost */}
                        <div className="flex items-center gap-3">
                            {run && (
                                <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${run.status === 'executing' ? 'bg-[var(--accent)] animate-pulse' :
                                            run.status === 'completed' ? 'bg-[var(--success)]' :
                                                run.status === 'failed' ? 'bg-[var(--error)]' :
                                                    'bg-[var(--text-tertiary)]'
                                        }`} />
                                    <span className="text-xs text-[var(--text-secondary)] capitalize">
                                        {run.status} • {run.steps.length} steps
                                    </span>
                                </div>
                            )}
                            <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-2">
                                <Zap size={12} className="text-[var(--warning)]" />
                                <span className="text-sm font-mono text-[var(--text-primary)]">
                                    {totalCost.toFixed(4)} TCRO
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Processing Payment Indicator */}
                    {pendingPayment && (
                        <div className="absolute top-16 right-4 z-30 glass-strong rounded-xl px-4 py-3 flex items-center gap-3">
                            <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
                            <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">
                                    Processing x402 Payment
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    {pendingPayment.cost} TCRO for {pendingPayment.toolName}
                                </p>
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
                            className="flex-1"
                            proOptions={{ hideAttribution: true }}
                        >
                            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.03)" />
                            <Controls showInteractive={false} className="!bg-[var(--bg-tertiary)] !border-[var(--border)] !rounded-lg" />
                        </ReactFlow>
                    )}

                    {/* Chat View */}
                    {viewMode === 'chat' && (
                        <div className="flex-1 flex flex-col overflow-hidden pt-16">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {chatMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <MessageSquare size={48} strokeWidth={1} className="text-[var(--text-tertiary)] mb-4" />
                                        <p className="text-[var(--text-secondary)] font-medium">Start a conversation</p>
                                        <p className="text-sm text-[var(--text-tertiary)]">Pay per result</p>
                                    </div>
                                ) : (
                                    chatMessages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                    ? 'bg-[var(--accent)] text-white'
                                                    : msg.role === 'system'
                                                        ? 'bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]'
                                                        : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)]'
                                                }`}>
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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

                    {/* Empty State */}
                    {viewMode === 'canvas' && !run && !isExecuting && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                                    <Layers size={28} strokeWidth={1.5} className="text-[var(--text-tertiary)]" />
                                </div>
                                <p className="text-[var(--text-secondary)] font-medium mb-1">No active workflow</p>
                                <p className="text-sm text-[var(--text-tertiary)]">Enter a prompt to start</p>
                            </div>
                        </div>
                    )}

                    {/* Prompt Bar */}
                    <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                        <div className="max-w-2xl mx-auto flex gap-3">
                            <input
                                className="flex-1 input h-12"
                                placeholder={isConnected ? "What would you like to do?" : "Connect wallet to start..."}
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                disabled={isExecuting || !isConnected}
                                onKeyDown={e => e.key === 'Enter' && handleRun()}
                            />
                            <button
                                onClick={handleRun}
                                disabled={!isConnected || isExecuting || !prompt.trim()}
                                className="btn-primary h-12 px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExecuting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                                Run
                            </button>
                        </div>
                        {!isConnected && (
                            <p className="text-center text-sm text-[var(--warning)] mt-2 flex items-center justify-center gap-2">
                                <AlertTriangle size={14} />
                                Connect wallet to Cronos Testnet
                            </p>
                        )}
                    </div>
                </div>

                {/* Sidebar (A2UI) */}
                <aside
                    className={`
                        fixed inset-y-0 right-0 z-40 w-80 lg:w-96 bg-[var(--bg-secondary)] border-l border-[var(--border)]
                        transition-transform duration-300 transform pt-16
                        lg:relative lg:transform-none
                        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                    `}
                >
                    <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--border)]">
                        <h2 className="font-semibold text-[var(--text-primary)]">A2UI</h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-hover)]">
                            <X size={18} className="text-[var(--text-secondary)]" />
                        </button>
                    </div>

                    <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-4">
                        {a2uiMessages.length > 0 ? (
                            <A2UIRenderer messages={a2uiMessages} onAction={handleA2UIAction} />
                        ) : lastResult ? (
                            // Show result text when no A2UI but we have a result
                            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
                                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Result</h3>
                                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{lastResult}</p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                                    <Layers size={24} strokeWidth={1.5} className="text-[var(--text-tertiary)]" />
                                </div>
                                <p className="text-sm text-[var(--text-tertiary)] max-w-[200px]">
                                    Interactive widgets will appear here
                                </p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Mobile Sidebar Toggle */}
                {(a2uiMessages.length > 0 || lastResult) && (
                    <button
                        className="lg:hidden fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full bg-[var(--accent)] text-white shadow-lg flex items-center justify-center"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <Layers size={20} />
                    </button>
                )}
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
