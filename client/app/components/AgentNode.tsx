'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Zap, CheckCircle, Database, Loader2 } from 'lucide-react';

interface AgentNodeData {
    label: string;
    subtitle?: string;
    type: 'orchestrator' | 'tool' | 'source' | 'result' | 'decision';
    status?: 'idle' | 'running' | 'complete';
    cost?: number;
}

interface AgentNodeProps {
    data: AgentNodeData;
    isConnectable: boolean;
}

const icons = {
    orchestrator: Bot,
    tool: Zap,
    source: Database,
    result: CheckCircle,
    decision: Zap,
};

function AgentNode({ data, isConnectable }: AgentNodeProps) {
    const Icon = icons[data.type] || Bot;
    const isRunning = data.status === 'running';
    const isComplete = data.status === 'complete';

    return (
        <div className={`agent-node ${isRunning ? 'running' : ''} ${isComplete ? 'complete' : ''}`}>
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                style={{
                    background: 'var(--bg-tertiary)',
                    border: '2px solid var(--border-strong)',
                    width: 10,
                    height: 10,
                }}
            />

            <div className="agent-node-header">
                <div className={`agent-node-icon ${data.type}`}>
                    {isRunning ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                        <Icon className="w-4 h-4 text-white" />
                    )}
                </div>
                <div>
                    <div className="agent-node-title">{data.label}</div>
                    {data.subtitle && (
                        <div className="agent-node-subtitle">{data.subtitle}</div>
                    )}
                </div>
            </div>

            {data.cost !== undefined && data.cost > 0 && (
                <div className="agent-node-cost">
                    <Zap className="w-3 h-3" />
                    {data.cost.toFixed(4)} USDC
                </div>
            )}

            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                style={{
                    background: 'var(--bg-tertiary)',
                    border: '2px solid var(--border-strong)',
                    width: 10,
                    height: 10,
                }}
            />
        </div>
    );
}

export default memo(AgentNode);
