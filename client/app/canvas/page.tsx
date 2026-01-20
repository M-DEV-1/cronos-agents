'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    type Node,
    type Edge,
} from '@xyflow/react';
import { ArrowLeft, Zap, MessageSquare, Grid3X3, Send, Calendar, Bell, TrendingUp } from 'lucide-react';
import AgentNode from '../components/AgentNode';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const nodeTypes = {
    agent: AgentNode,
};

interface A2UIWidget {
    id: string;
    type: 'event_card' | 'reminder' | 'price_alert';
    title: string;
    data: Record<string, unknown>;
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

function CanvasContent() {
    const searchParams = useSearchParams();
    const prompt = searchParams.get('prompt') || '';

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [widgets, setWidgets] = useState<A2UIWidget[]>([]);
    const [totalCost, setTotalCost] = useState(0);
    const [view, setView] = useState<'canvas' | 'chat'>('canvas');
    const [followUpPrompt, setFollowUpPrompt] = useState('');

    useEffect(() => {
        if (prompt) {
            runWorkflow(prompt);
        }
    }, [prompt]);

    const runWorkflow = async (userPrompt: string) => {
        setNodes([]);
        setEdges([]);
        setWidgets([]);
        setTotalCost(0);

        // Determine query type
        const isEventQuery = /festival|event|conference|concert/i.test(userPrompt);
        const isCryptoQuery = /cro|btc|eth|price|crypto/i.test(userPrompt);
        const isReminderQuery = /remind/i.test(userPrompt);

        // Build nodes
        const workflowNodes: Node[] = [
            {
                id: '1',
                type: 'agent',
                position: { x: 50, y: 200 },
                data: { label: 'Agent H', subtitle: 'Orchestrator', type: 'orchestrator', status: 'complete' },
            },
            {
                id: '2',
                type: 'agent',
                position: { x: 300, y: 200 },
                data: {
                    label: isEventQuery ? 'Events Agent' : isCryptoQuery ? 'Crypto Agent' : 'Search Agent',
                    subtitle: 'Source Agent',
                    type: 'source',
                    status: 'running',
                    cost: isEventQuery ? 0.005 : isCryptoQuery ? 0.01 : 0.001,
                },
            },
            {
                id: '3',
                type: 'agent',
                position: { x: 550, y: 200 },
                data: {
                    label: 'Response',
                    subtitle: isEventQuery ? 'JLF 2026 found' : isCryptoQuery ? 'CRO: $0.089' : 'Results',
                    type: 'result',
                    status: 'idle',
                },
            },
        ];

        const workflowEdges: Edge[] = [
            { id: 'e1-2', source: '1', target: '2', animated: true },
            { id: 'e2-3', source: '2', target: '3' },
        ];

        setNodes(workflowNodes);
        setEdges(workflowEdges);
        setTotalCost(isEventQuery ? 0.005 : isCryptoQuery ? 0.01 : 0.001);

        // Simulate execution
        await delay(1500);

        // Update node statuses
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === '2') {
                    return { ...node, data: { ...node.data, status: 'complete' } };
                }
                if (node.id === '3') {
                    return { ...node, data: { ...node.data, status: 'complete' } };
                }
                return node;
            })
        );

        // Update edge animation
        setEdges((eds) =>
            eds.map((edge) => ({ ...edge, animated: false }))
        );

        // Add widget
        if (isEventQuery) {
            setWidgets([{
                id: 'w1',
                type: isReminderQuery ? 'reminder' : 'event_card',
                title: isReminderQuery ? 'Set Reminder' : 'Jaipur Literature Festival',
                data: { date: 'Jan 23-27, 2026', location: 'Diggi Palace, Jaipur' },
            }]);
        } else if (isCryptoQuery) {
            setWidgets([{
                id: 'w1',
                type: 'price_alert',
                title: 'CRO Price',
                data: { symbol: 'CRO', currentPrice: 0.089 },
            }]);
        }
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const handleFollowUp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!followUpPrompt.trim()) return;
        runWorkflow(followUpPrompt);
        setFollowUpPrompt('');
    };

    return (
        <div className="h-screen flex" style={{ background: 'var(--bg-primary)' }}>
            {/* Main Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header
                    className="h-14 flex items-center justify-between px-4"
                    style={{ borderBottom: '1px solid var(--border)' }}
                >
                    <div className="flex items-center gap-4">
                        <a
                            href="/"
                            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                            style={{ background: 'var(--bg-secondary)' }}
                        >
                            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        </a>

                        {/* View Toggle */}
                        <div className="view-toggle">
                            <button
                                onClick={() => setView('chat')}
                                className={`view-toggle-btn ${view === 'chat' ? 'active' : ''}`}
                            >
                                <MessageSquare className="w-4 h-4 inline-block mr-2" />
                                Chat
                            </button>
                            <button
                                onClick={() => setView('canvas')}
                                className={`view-toggle-btn ${view === 'canvas' ? 'active' : ''}`}
                            >
                                <Grid3X3 className="w-4 h-4 inline-block mr-2" />
                                Canvas
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2" style={{ color: 'var(--warning)' }}>
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-medium">{totalCost.toFixed(4)} USDC</span>
                    </div>
                </header>

                {/* Canvas / Chat View */}
                <div className="flex-1 relative">
                    {view === 'canvas' ? (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodeTypes={nodeTypes}
                            fitView
                            panOnDrag
                            zoomOnScroll
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                        >
                            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                            <Controls showInteractive={false} />
                        </ReactFlow>
                    ) : (
                        <div className="p-6 max-w-2xl mx-auto">
                            <div className="space-y-4">
                                <div
                                    className="p-4 rounded-xl"
                                    style={{ background: 'var(--bg-secondary)' }}
                                >
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>Prompt:</strong> {prompt}
                                    </p>
                                </div>
                                {widgets.length > 0 && (
                                    <div
                                        className="p-4 rounded-xl"
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        <p style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                                            Found: {widgets[0].title}
                                        </p>
                                        {'date' in widgets[0].data && (
                                            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '4px' }}>
                                                {String(widgets[0].data.date)} - {String(widgets[0].data.location || '')}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Follow-up Input */}
                <form
                    onSubmit={handleFollowUp}
                    className="p-4"
                    style={{ borderTop: '1px solid var(--border)' }}
                >
                    <div className="max-w-2xl mx-auto flex gap-2">
                        <input
                            type="text"
                            placeholder="Ask a follow-up..."
                            value={followUpPrompt}
                            onChange={(e) => setFollowUpPrompt(e.target.value)}
                            className="flex-1 h-11 px-4 rounded-xl outline-none"
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!followUpPrompt.trim()}
                            className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                            style={{
                                background: followUpPrompt.trim() ? 'var(--accent)' : 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                            }}
                        >
                            <Send className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </form>
            </div>

            {/* A2UI Sidebar */}
            <aside
                className="w-80 flex flex-col"
                style={{
                    background: 'var(--bg-secondary)',
                    borderLeft: '1px solid var(--border)',
                }}
            >
                <div
                    className="h-14 flex items-center px-4"
                    style={{ borderBottom: '1px solid var(--border)' }}
                >
                    <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-quaternary)' }}
                    >
                        A2UI Components
                    </span>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                    {widgets.length === 0 ? (
                        <div className="text-center py-12" style={{ color: 'var(--text-quaternary)' }}>
                            <Grid3X3 className="w-8 h-8 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Widgets appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {widgets.map((widget) => (
                                <WidgetCard key={widget.id} widget={widget} />
                            ))}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}

function WidgetCard({ widget }: { widget: A2UIWidget }) {
    const icons = {
        event_card: Calendar,
        reminder: Bell,
        price_alert: TrendingUp,
    };
    const Icon = icons[widget.type] || Calendar;

    return (
        <Card className="animate-in" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    {widget.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1" style={{ color: 'var(--text-tertiary)' }}>
                {widget.type === 'event_card' && (
                    <>
                        <p><span style={{ color: 'var(--text-secondary)' }}>Date:</span> {String(widget.data.date)}</p>
                        <p><span style={{ color: 'var(--text-secondary)' }}>Location:</span> {String(widget.data.location)}</p>
                    </>
                )}
                {widget.type === 'price_alert' && (
                    <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {String(widget.data.symbol)}: ${Number(widget.data.currentPrice).toFixed(4)}
                    </p>
                )}
                <Button size="sm" className="w-full mt-3" style={{ background: 'var(--accent)' }}>
                    {widget.type === 'reminder' ? 'Set Reminder' : 'Take Action'}
                </Button>
            </CardContent>
        </Card>
    );
}

export default function CanvasPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
                Loading...
            </div>
        }>
            <CanvasContent />
        </Suspense>
    );
}
