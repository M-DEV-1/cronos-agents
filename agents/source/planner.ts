/**
 * LLM-based Planner using Gemini
 * 
 * Uses Gemini to:
 * 1. Classify user intent
 * 2. Plan execution steps
 * 3. Generate A2UI schema
 */

import 'dotenv/config';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';

interface PlannedStep {
    kind: 'intent' | 'tool' | 'wait' | 'ui';
    label: string;
    description?: string;
    toolName?: string;
    mcpServer?: string;
    cost: number;
}

interface PlanResult {
    steps: PlannedStep[];
    intents: string[];
    capabilities: string[];
}

// Tool costs
const TOOL_COSTS: Record<string, number> = {
    web_search: 0.005,
    github_search: 0.002,
    get_crypto_price: 0.01,
    find_events: 0.02,
    get_weather: 0.003,
    calculator: 0.001,
    list_directory: 0.001,
};

// Available tools with descriptions
const AVAILABLE_TOOLS = `
Available tools:
- web_search (0.005 TCRO): Search the web for information using Brave Search
- github_search (0.002 TCRO): Search GitHub repositories and code
- get_crypto_price (0.01 TCRO): Get current cryptocurrency prices (BTC, ETH, CRO, etc.)
- find_events (0.02 TCRO): Find events, festivals, conferences
- get_weather (0.003 TCRO): Get weather information for a location
- calculator (0.001 TCRO): Perform mathematical calculations
- list_directory (0.001 TCRO): List files in a directory
`;

const PLANNING_PROMPT = `You are a task planner for an AI agent system. Given a user prompt, you must plan the execution steps.

${AVAILABLE_TOOLS}

For each prompt, output a JSON object with:
1. "intents": array of detected user intents (e.g., "get_price", "search", "find_events")
2. "capabilities": array of tool names to use
3. "steps": array of execution steps

Each step has:
- "kind": "intent" | "tool" | "wait" | "ui"
- "label": human-readable label
- "description": optional description
- "toolName": for tool steps, the tool to call
- "mcpServer": for tool steps, "brave", "github", or null
- "cost": the TCRO cost (0 for non-tool steps)

Rules:
1. Always start with an "intent" step
2. Use minimal tools needed
3. Always end with a "ui" step for results
4. For crypto prices, use get_crypto_price
5. For searches/lookups, use web_search
6. For GitHub-related queries, use github_search
7. For alarms/alerts/monitoring, add a "wait" step

Output ONLY valid JSON, no markdown or explanation.

User prompt: `;

/**
 * Call Gemini API directly
 */
async function callGemini(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('GOOGLE_API_KEY not configured');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 1024,
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Plan execution steps using Gemini
 */
export async function planWithLLM(prompt: string): Promise<PlanResult> {
    try {
        const response = await callGemini(PLANNING_PROMPT + prompt);

        // Extract JSON from response (handle potential markdown wrapping)
        let jsonStr = response.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
        }

        const plan = JSON.parse(jsonStr) as PlanResult;

        // Ensure costs are set correctly
        plan.steps = plan.steps.map(step => ({
            ...step,
            cost: step.kind === 'tool' && step.toolName
                ? (TOOL_COSTS[step.toolName] || 0.01)
                : 0,
        }));

        return plan;
    } catch (error) {
        console.error('[Planner] LLM planning failed, using fallback:', error);
        return fallbackPlan(prompt);
    }
}

/**
 * Fallback planning when LLM fails
 */
function fallbackPlan(prompt: string): PlanResult {
    const lowerPrompt = prompt.toLowerCase();
    const steps: PlannedStep[] = [];
    const intents: string[] = [];
    const capabilities: string[] = [];

    // Intent step
    steps.push({
        kind: 'intent',
        label: 'Understanding Request',
        description: prompt.slice(0, 100),
        cost: 0,
    });

    // Detect tools needed
    if (lowerPrompt.includes('price') || lowerPrompt.includes('btc') || lowerPrompt.includes('eth') || lowerPrompt.includes('crypto')) {
        intents.push('get_crypto_price');
        capabilities.push('get_crypto_price');
        steps.push({
            kind: 'tool',
            label: 'Crypto Price Lookup',
            toolName: 'get_crypto_price',
            mcpServer: 'coingecko',
            cost: TOOL_COSTS.get_crypto_price,
        });
    }

    if (lowerPrompt.includes('search') || lowerPrompt.includes('find') || lowerPrompt.includes('look')) {
        intents.push('search');
        capabilities.push('web_search');
        steps.push({
            kind: 'tool',
            label: 'Web Search',
            toolName: 'web_search',
            mcpServer: 'brave',
            cost: TOOL_COSTS.web_search,
        });
    }

    if (lowerPrompt.includes('github') || lowerPrompt.includes('repo')) {
        intents.push('github_search');
        capabilities.push('github_search');
        steps.push({
            kind: 'tool',
            label: 'GitHub Search',
            toolName: 'github_search',
            mcpServer: 'github',
            cost: TOOL_COSTS.github_search,
        });
    }

    if (lowerPrompt.includes('weather')) {
        intents.push('weather');
        capabilities.push('get_weather');
        steps.push({
            kind: 'tool',
            label: 'Weather Lookup',
            toolName: 'get_weather',
            mcpServer: 'weather',
            cost: TOOL_COSTS.get_weather,
        });
    }

    if (lowerPrompt.includes('alarm') || lowerPrompt.includes('alert') || lowerPrompt.includes('monitor')) {
        intents.push('monitoring');
        steps.push({
            kind: 'wait',
            label: 'Monitoring',
            description: 'Waiting for condition...',
            cost: 0,
        });
    }

    // UI step
    steps.push({
        kind: 'ui',
        label: 'Presenting Results',
        description: 'Generating interactive display',
        cost: 0,
    });

    return { steps, intents, capabilities };
}

/**
 * Classify intent using Gemini
 */
export async function classifyIntent(prompt: string): Promise<string[]> {
    const plan = await planWithLLM(prompt);
    return plan.intents;
}
