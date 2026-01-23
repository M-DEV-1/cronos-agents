/**
 * Execution Model Types (Client-side)
 * 
 * Mirrors the server-side execution model for type safety.
 */

export type StepKind = 'intent' | 'tool' | 'wait' | 'ui';
export type StepStatus = 'planned' | 'running' | 'completed' | 'failed';
export type RunStatus = 'planning' | 'executing' | 'waiting' | 'completed' | 'failed';

export interface ExecutionStep {
    stepId: string;
    kind: StepKind;
    label: string;
    description?: string;
    toolName?: string;
    mcpServer?: string;
    status: StepStatus;
    result?: unknown;
    a2ui?: unknown[];
    cost?: number;
    startedAt?: number;
    completedAt?: number;
}

export interface ExecutionRun {
    runId: string;
    prompt: string;
    steps: ExecutionStep[];
    status: RunStatus;
    totalCost: number;
    createdAt: number;
    updatedAt: number;
    userId?: string;
}

/**
 * SSE Event Types
 */
export type SSEEventType =
    | 'run_started'
    | 'step_started'
    | 'step_completed'
    | 'step_failed'
    | 'a2ui'
    | 'run_completed'
    | 'run_failed'
    | 'payment_required'
    | 'payment_success';

export interface SSEEvent {
    type: SSEEventType;
    runId?: string;
    stepId?: string;
    steps?: ExecutionStep[];
    result?: unknown;
    a2ui?: unknown[];
    cost?: number;
    walletAddress?: string;
    error?: string;
    timestamp: number;
}
