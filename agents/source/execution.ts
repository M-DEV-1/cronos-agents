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

// In-memory execution store
// can replace this with a) redis, or b) an actual DB
const runs = new Map<string, ExecutionRun>();

export const executionStore = {
    create(prompt: string, userId?: string): ExecutionRun {
        const run: ExecutionRun = {
            runId: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            prompt,
            steps: [],
            status: 'planning',
            totalCost: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            userId,
        };
        runs.set(run.runId, run);
        return run;
    },

    get(runId: string): ExecutionRun | undefined {
        return runs.get(runId);
    },

    update(runId: string, updates: Partial<ExecutionRun>): ExecutionRun | undefined {
        const run = runs.get(runId);
        if (!run) return undefined;
        Object.assign(run, updates, { updatedAt: Date.now() });
        return run;
    },

    addStep(runId: string, step: Omit<ExecutionStep, 'stepId' | 'status'>): ExecutionStep | undefined {
        const run = runs.get(runId);
        if (!run) return undefined;

        const newStep: ExecutionStep = {
            ...step,
            stepId: `step_${run.steps.length}_${Date.now()}`,
            status: 'planned',
        };
        run.steps.push(newStep);
        run.updatedAt = Date.now();
        return newStep;
    },

    updateStep(runId: string, stepId: string, updates: Partial<ExecutionStep>): ExecutionStep | undefined {
        const run = runs.get(runId);
        if (!run) return undefined;

        const step = run.steps.find(s => s.stepId === stepId);
        if (!step) return undefined;

        Object.assign(step, updates);
        run.updatedAt = Date.now();
        return step;
    },

    delete(runId: string): boolean {
        return runs.delete(runId);
    },

    // Utility to generate step ID
    generateStepId(index: number): string {
        return `step_${index}_${Date.now()}`;
    }
};

/**
 * Plan execution steps from a prompt
 * In production, this would use an LLM to decompose the prompt.
 * For now, we create a basic intent → tool → result flow.
 */
export function planStepsFromPrompt(prompt: string): Omit<ExecutionStep, 'stepId' | 'status'>[] {
    const lowerPrompt = prompt.toLowerCase();
    const steps: Omit<ExecutionStep, 'stepId' | 'status'>[] = [];

    // Costs from capability registry
    const COSTS = {
        web_search: 0.005,
        github_search: 0.002,
        get_crypto_price: 0.01,
        find_events: 0.02,
        get_weather: 0.003,
        calculator: 0.001,
    };

    // Always start with intent (free)
    steps.push({
        kind: 'intent',
        label: 'Understanding Request',
        description: prompt.slice(0, 100),
        cost: 0,
    });

    // Detect tool needs from prompt
    if (lowerPrompt.includes('price') || lowerPrompt.includes('btc') || lowerPrompt.includes('eth') || lowerPrompt.includes('cro') || lowerPrompt.includes('crypto')) {
        steps.push({
            kind: 'tool',
            label: 'Crypto Price Lookup',
            toolName: 'get_crypto_price',
            mcpServer: 'coingecko',
            cost: COSTS.get_crypto_price,
        });
    }

    if (lowerPrompt.includes('search') || lowerPrompt.includes('find') || lowerPrompt.includes('look up')) {
        steps.push({
            kind: 'tool',
            label: 'Web Search',
            toolName: 'web_search',
            mcpServer: 'brave',
            cost: COSTS.web_search,
        });
    }

    if (lowerPrompt.includes('github') || lowerPrompt.includes('repo') || lowerPrompt.includes('repository')) {
        steps.push({
            kind: 'tool',
            label: 'GitHub Search',
            toolName: 'github_search',
            mcpServer: 'github',
            cost: COSTS.github_search,
        });
    }

    if (lowerPrompt.includes('event') || lowerPrompt.includes('festival') || lowerPrompt.includes('conference')) {
        steps.push({
            kind: 'tool',
            label: 'Event Discovery',
            toolName: 'find_events',
            mcpServer: 'brave',
            cost: COSTS.find_events,
        });
    }

    if (lowerPrompt.includes('weather')) {
        steps.push({
            kind: 'tool',
            label: 'Weather Lookup',
            toolName: 'get_weather',
            mcpServer: 'weather',
            cost: COSTS.get_weather,
        });
    }

    if (lowerPrompt.includes('alarm') || lowerPrompt.includes('alert') || lowerPrompt.includes('notify') || lowerPrompt.includes('monitor')) {
        steps.push({
            kind: 'wait',
            label: 'Monitoring',
            description: 'Waiting for condition...',
            cost: 0,
        });
    }

    // Always end with UI step for result presentation (free)
    steps.push({
        kind: 'ui',
        label: 'Presenting Results',
        description: 'Generating interactive display',
        cost: 0,
    });

    return steps;
}

