'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Zap, CheckCircle, Database, Loader2, Search, Github, Coins, Calendar, Calculator, AlertCircle, FileText, Globe, MessageSquare } from 'lucide-react';
import { Card } from './ui/card';

interface AgentNodeData {
    label: string;
    type: string;
    status: 'running' | 'complete' | 'error' | 'idle';
    subtitle?: string;
    description?: string;
    toolName?: string;
    cost?: number;
    mcpServer?: string;
    metadata?: Record<string, unknown>;
    icon?: string;
}

interface AgentNodeProps {
    data: AgentNodeData;
    isConnectable: boolean;
}

const icons: Record<string, any> = {
    orchestrator: Bot,
    tool_call: Zap,
    final_response: CheckCircle,
    user_input: MessageSquare,
    error: AlertCircle,
    brave_web_search: Search,
    google_search: Search,
    github_search: Github,
    get_crypto_price: Coins,
    find_events: Calendar,
    calculator: Calculator,
    list_directory: FileText,
    read_file: FileText,
    get_weather: Globe
};

function AgentNode({ data, isConnectable }: AgentNodeProps) {
    const iconName = data.icon || data.type;
    const Icon = icons[iconName] || icons[data.subtitle?.toLowerCase().replace(/ /g, '_') || ''] || Bot;

    // Status visual logic
    const isRunning = data.status === 'running';
    const isComplete = data.status === 'complete';
    const isError = data.status === 'error';

    // Status Colors
    const statusColor = isRunning ? 'var(--accent)' :
        isComplete ? 'var(--success)' :
            isError ? 'var(--error)' : 'var(--text-tertiary)';

    const borderColor = isRunning ? 'var(--accent)' : 'var(--border)';
    const glow = isRunning ? '0 0 20px -5px var(--accent-glow)' : 'none';

    return (
        <div className="relative group">
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className="!bg-[var(--text-secondary)] !w-3 !h-3 !border-2 !border-[var(--bg-primary)] transition-all group-hover:!bg-[var(--accent)]"
                style={{ left: -6 }}
            />

            <Card
                className="w-[280px] overflow-hidden transition-all duration-300 bg-[var(--bg-secondary)]"
                style={{
                    borderColor,
                    boxShadow: glow
                }}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-3 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/50">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-[var(--border)] bg-[var(--bg-primary)]"
                        style={{ color: statusColor }}
                    >
                        <Icon size={20} strokeWidth={1.5} className={isRunning ? 'animate-pulse' : ''} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-[var(--text-primary)] truncate" title={data.label}>
                            {data.label}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)] truncate font-mono uppercase tracking-wider">
                            {data.subtitle || data.type}
                        </div>
                    </div>

                    {isRunning && <Loader2 size={16} className="animate-spin text-[var(--accent)] shrink-0" />}
                    {isError && <AlertCircle size={16} className="text-[var(--error)] shrink-0" />}
                    {/* {isComplete && <CheckCircle size={16} className="text-[var(--success)] shrink-0 opacity-50" />} */}
                </div>

                {/* Content */}
                {data.description && (
                    <div className="p-3 text-xs text-[var(--text-secondary)] leading-relaxed max-h-[120px] overflow-y-auto custom-scrollbar border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                        {(() => {
                            try {
                                if (data.description?.trim().startsWith('{')) {
                                    const parsed = JSON.parse(data.description);
                                    return (
                                        <div className="space-y-1 font-mono">
                                            {Object.entries(parsed).map(([k, v]) => (
                                                <div key={k} className="flex gap-2">
                                                    <span className="text-[var(--text-tertiary)] shrink-0">{k}:</span>
                                                    <span className="text-[var(--text-primary)] break-all">{String(v).slice(0, 100)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                            } catch { }
                            return data.description;
                        })()}
                    </div>
                )}

                {/* Footer */}
                <div className="px-3 py-2 flex items-center justify-between bg-[var(--bg-tertiary)]/30">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                        <Zap size={12} fill={data.cost ? 'currentColor' : 'none'} className={data.cost ? 'text-[var(--warning)]' : 'text-[var(--text-tertiary)]'} />
                        <span className={data.cost ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}>
                            {data.cost !== undefined ? `${data.cost} TCRO` : 'FREE'}
                        </span>
                    </div>

                    {data.metadata?.txHash ? (
                        <a
                            href={`https://explorer.cronos.org/testnet/tx/${data.metadata.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            View TX ↗
                        </a>
                    ) : (
                        <span className="text-[10px] uppercase tracking-wider font-medium text-[var(--text-quaternary)]">
                            ERC-8004
                        </span>
                    )}
                </div>
            </Card>

            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="!bg-[var(--text-secondary)] !w-3 !h-3 !border-2 !border-[var(--bg-primary)] transition-all group-hover:!bg-[var(--accent)]"
                style={{ right: -6 }}
            />
        </div>
    );
}

export default memo(AgentNode);
