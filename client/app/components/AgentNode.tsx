'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
    Brain,
    Wrench,
    Clock,
    Layout,
    CheckCircle,
    Loader2,
    AlertCircle,
    Zap,
    Search,
    Github,
    Coins,
    Calendar,
    Cloud,
    Folder,
    Calculator
} from 'lucide-react';
import type { StepKind, StepStatus } from '../types/execution';

interface AgentNodeData {
    label: string;
    kind: StepKind;
    status: StepStatus;
    description?: string;
    toolName?: string;
    cost?: number;
    mcpServer?: string;
}

interface AgentNodeProps {
    data: AgentNodeData;
    isConnectable: boolean;
}

// Kind-based icon mapping
const kindIcons: Record<StepKind, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
    intent: Brain,
    tool: Wrench,
    wait: Clock,
    ui: Layout,
};

// Tool-specific icon mapping
const toolIcons: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
    web_search: Search,
    github_search: Github,
    get_crypto_price: Coins,
    find_events: Calendar,
    get_weather: Cloud,
    list_directory: Folder,
    calculator: Calculator,
};

// Kind-based accent colors
const kindColors: Record<StepKind, string> = {
    intent: '#3B8A8C',      // Teal (accent)
    tool: '#8B5CF6',        // Purple
    wait: '#F59E0B',        // Amber
    ui: '#EC4899',          // Pink
};

// Status-based styling
const statusStyles: Record<StepStatus, { borderColor: string; glow: boolean; icon: React.ComponentType<{ size?: number; className?: string }> | null }> = {
    planned: { borderColor: 'var(--border)', glow: false, icon: null },
    running: { borderColor: '#3B8A8C', glow: true, icon: Loader2 },
    completed: { borderColor: '#22C55E', glow: false, icon: CheckCircle },
    failed: { borderColor: '#EF4444', glow: false, icon: AlertCircle },
};

function AgentNode({ data, isConnectable }: AgentNodeProps) {
    const kindColor = kindColors[data.kind];
    const statusStyle = statusStyles[data.status];

    // Get icon: prefer tool-specific, fall back to kind-based
    const Icon = (data.toolName && toolIcons[data.toolName]) || kindIcons[data.kind];
    const StatusIcon = statusStyle.icon;

    return (
        <div
            className="agent-node"
            data-kind={data.kind}
            data-status={data.status}
            style={{
                borderColor: statusStyle.borderColor,
                boxShadow: statusStyle.glow ? `0 0 20px ${kindColor}40` : undefined,
            }}
        >
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                style={{
                    background: kindColor,
                    width: 10,
                    height: 10,
                    left: -5,
                    border: '2px solid var(--bg-primary)'
                }}
            />

            {/* Left accent bar */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                style={{ background: kindColor }}
            />

            {/* Header */}
            <div className="agent-node-header">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                        background: `${kindColor}15`,
                        color: kindColor,
                    }}
                >
                    <Icon size={20} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="agent-node-title truncate">{data.label}</div>
                    <div className="agent-node-subtitle">
                        {data.kind.toUpperCase()}
                        {data.mcpServer && ` • ${data.mcpServer}`}
                    </div>
                </div>
                {StatusIcon && (
                    <div style={{ color: statusStyle.borderColor }}>
                        <StatusIcon
                            size={18}
                            className={data.status === 'running' ? 'animate-spin' : ''}
                        />
                    </div>
                )}
            </div>

            {/* Footer with cost */}
            <div className="agent-node-footer">
                <div className="flex items-center gap-1.5">
                    <Zap
                        size={12}
                        fill={data.cost ? 'currentColor' : 'none'}
                        style={{ color: data.cost ? 'var(--warning)' : 'var(--text-quaternary)' }}
                    />
                    <span className={data.cost ? 'text-[var(--warning)]' : ''}>
                        {data.cost ? `${data.cost} TCRO` : 'FREE'}
                    </span>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-quaternary)]">
                    {data.status}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                style={{
                    background: kindColor,
                    width: 10,
                    height: 10,
                    right: -5,
                    border: '2px solid var(--bg-primary)'
                }}
            />
        </div>
    );
}

export default memo(AgentNode);
