'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Zap, CheckCircle, Database, Loader2, Search, Github, Coins, Calendar, Calculator, AlertCircle } from 'lucide-react';

interface AgentNodeData {
    label: string;
    subtitle?: string;
    type: string;
    status?: 'idle' | 'running' | 'complete' | 'error';
    cost?: number;
    icon?: string;
    description?: string;
    metadata?: Record<string, any>;
}

interface AgentNodeProps {
    data: AgentNodeData;
    isConnectable: boolean;
}

const icons: Record<string, any> = {
    orchestrator: Bot,
    tool: Zap,
    source: Database,
    result: CheckCircle,
    decision: Zap,
    search: Search,
    github: Github,
    crypto: Coins,
    events: Calendar,
    calc: Calculator,
};

function AgentNode({ data, isConnectable }: AgentNodeProps) {
    const iconName = data.icon || data.type;
    const Icon = icons[iconName] || icons[data.type] || Bot;

    // Status visual logic
    const isRunning = data.status === 'running';
    const isComplete = data.status === 'complete';
    const isError = data.status === 'error';

    // Status Icon
    let StatusIcon = null;
    let statusColor = 'var(--text-tertiary)';

    if (isRunning) {
        StatusIcon = Loader2;
        statusColor = 'var(--accent)';
    } else if (isComplete) {
        StatusIcon = CheckCircle;
        statusColor = 'var(--success)';
    } else if (isError) {
        StatusIcon = AlertCircle;
        statusColor = 'var(--error)';
    }

    return (
        <div className={`agent-node ${data.status || 'idle'}`}>
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                style={{
                    background: 'var(--text-secondary)',
                    width: 12,
                    height: 12,
                    left: -6,
                    border: '2px solid var(--bg-primary)'
                }}
            />

            <div className="agent-node-header">
                <div style={{ color: isRunning ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    <Icon strokeWidth={1.5} size={24} />
                </div>
                <div>
                    <div className="agent-node-title">{data.label}</div>
                    {data.subtitle && (
                        <div className="agent-node-subtitle">{data.subtitle}</div>
                    )}
                </div>
                {StatusIcon && (
                    <div style={{ marginLeft: 'auto', color: statusColor }}>
                        <StatusIcon className={isRunning ? 'animate-spin' : ''} size={20} />
                    </div>
                )}
            </div>

            {/* Content Area - Visible Description */}
            {data.description && (
                <div style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.4', borderBottom: '1px solid var(--border)' }}>
                    {/* Try to parse if it looks like JSON object, otherwise show text */}
                    {(() => {
                        try {
                            if (data.description?.trim().startsWith('{')) {
                                const parsed = JSON.parse(data.description);
                                return (
                                    <div className="text-xs font-mono bg-black/20 p-2 rounded overflow-auto max-h-[100px]">
                                        {Object.entries(parsed).map(([k, v]) => (
                                            <div key={k}><span className="opacity-50">{k}:</span> {String(v)}</div>
                                        ))}
                                    </div>
                                );
                            }
                        } catch { }
                        return data.description;
                    })()}
                </div>
            )}

            {/* Footer with Cost / Link */}
            <div className="agent-node-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} fill={data.cost ? 'currentColor' : 'none'} />
                    <span style={{ fontWeight: 600 }}>
                        {data.cost !== undefined ? `${data.cost} TCRO` : 'FREE'}
                    </span>
                </div>
                {/* Explorer Link if txHash is present in details or metadata */}
                {data.metadata?.txHash && (
                    <a
                        href={`https://explorer.cronos.org/testnet/tx/${data.metadata.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[var(--accent)] hover:underline flex items-center gap-1"
                        style={{ fontSize: '10px', letterSpacing: '0.5px', color: 'var(--text-tertiary)', textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        VIEW TX ↗
                    </a>
                )}
                {!data.metadata?.txHash && (
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-quaternary)' }}>
                        ERC-8004
                    </div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                style={{
                    background: 'var(--text-secondary)',
                    width: 12,
                    height: 12,
                    right: -6,
                    border: '2px solid var(--bg-primary)'
                }}
            />
        </div>
    );
}

export default memo(AgentNode);
