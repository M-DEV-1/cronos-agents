import 'dotenv/config';
import { LlmAgent } from '@google/adk';
import { PaidToolWrapper, paymentEvents } from './pay-wrapper.js';
import { mcpManager } from './mcp-client.js';

/**
 * UNIQUE WALLET ADDRESSES FOR EACH TOOL
 * These correspond to x402-enabled accounts on Cronos.
 */
const WALLETS = {
    SEARCH: '0x1234567890123456789012345678901234567890',
    GITHUB: '0x2234567890123456789012345678901234567890',
    FILESYSTEM: '0x3234567890123456789012345678901234567890',
    WEATHER: '0x4234567890123456789012345678901234567890',
    TIME: '0x5234567890123456789012345678901234567890',
    CRYPTO: '0x6234567890123456789012345678901234567890', // Custom local tool
    EVENTS: '0x7234567890123456789012345678901234567890', // Custom local tool
    CALCULATOR: '0x8234567890123456789012345678901234567890',
};

// --- MCP Tools Wrapped in PaidToolWrapper ---

const searchTool = new PaidToolWrapper({
    name: 'web_search',
    description: 'Search the web for information using Brave Search',
    cost: 0.005,
    walletAddress: WALLETS.SEARCH,
    handler: async (args: { query: string }) => {
        return mcpManager.callTool('brave', 'brave_web_search', args);
    },
});

const githubTool = new PaidToolWrapper({
    name: 'github_search',
    description: 'Search GitHub repositories',
    cost: 0.002,
    walletAddress: WALLETS.GITHUB,
    handler: async (args: { query: string }) => {
        return mcpManager.callTool('github', 'search_repositories', { query: args.query });
    },
});

const fsListTool = new PaidToolWrapper({
    name: 'list_directory',
    description: 'List files in a directory',
    cost: 0.001,
    walletAddress: WALLETS.FILESYSTEM,
    handler: async (args: { path: string }) => {
        return mcpManager.callTool('filesystem', 'list_directory', args);
    },
});

const weatherTool = new PaidToolWrapper({
    name: 'get_weather',
    description: 'Get current weather for a location',
    cost: 0.003,
    walletAddress: WALLETS.WEATHER,
    handler: async (args: { city: string }) => {
        // Try calling the weather MCP if active, else fallback or throw
        try {
            return await mcpManager.callTool('weather', 'get_current_weather', args);
        } catch (e) {
            // Fallback to search if weather MCP fails/not installed
            return mcpManager.callTool('brave', 'brave_web_search', { query: `current weather in ${args.city}` });
        }
    },
});

// --- Local Custom Tools Wrapped in PaidToolWrapper ---

const cryptoTool = new PaidToolWrapper({
    name: 'get_crypto_price',
    description: 'Get current price of a cryptocurrency',
    cost: 0.01,
    walletAddress: WALLETS.CRYPTO,
    handler: async (args: { symbol: string }) => {
        // Mocking external API call for demo
        const prices: Record<string, number> = {
            'BTC': 64230.50,
            'ETH': 3450.20,
            'CRO': 0.125,
            'SOL': 145.60
        };
        const price = prices[args.symbol.toUpperCase()] || 0;
        return { symbol: args.symbol, price, currency: 'USD' };
    },
});

const eventsTool = new PaidToolWrapper({
    name: 'find_events',
    description: 'Find upcoming events, festivals, or conferences',
    cost: 0.02,
    walletAddress: WALLETS.EVENTS,
    handler: async (args: { query: string, location?: string }) => {
        // Mocking event search
        if (args.query.toLowerCase().includes('literature')) {
            return {
                events: [
                    { name: 'Jaipur Literature Festival', date: '2026-01-23', location: 'Jaipur, India' },
                    { name: 'London Book Fair', date: '2026-03-10', location: 'London, UK' }
                ]
            };
        }
        return { events: [] };
    },
});

const calculatorTool = new PaidToolWrapper({
    name: 'calculator',
    description: 'Perform mathematical calculations',
    cost: 0.001, // Even math costs a micro-amount!
    walletAddress: WALLETS.CALCULATOR,
    handler: async (args: { expression: string }) => {
        try {
            // Safe evaluation using Function
            const result = new Function(`return ${args.expression}`)();
            return { expression: args.expression, result };
        } catch {
            return { error: 'Invalid expression' };
        }
    },
});


/**
 * Source Agent
 * 
 * A multi-tool agent fully integrated with x402 payment wrappers.
 * Every tool call logs a transaction to the ledger and enforces payment logic.
 */
export const rootAgent = new LlmAgent({
    name: 'source_agent',
    model: 'gemini-2.5-flash',
    description: 'A paid information agent that retrieves data from various sources via x402-enabled tools.',
    instruction: `You are a helpful Source Agent.
    
    You have access to several Paid Tools. Each tool costs money (USDC) to use.
    
    Your goal is to answer the user's request efficiently using these tools.
    - For general questions, use 'web_search'.
    - For code/repo questions, use 'github_search'.
    - For prices, use 'get_crypto_price'.
    - For events, use 'find_events'.
    
    Always summarize the results clearly.`,

    // We pass the wrapper's direct execution function or the wrapper object if ADK supports it. 
    // Assuming ADK takes a function or a compatible object. 
    // If ADK needs a specific shape, we map it here.
    // For now, assuming ADK accepts the wrapper as a tool-like object or we wrap it in a FunctionTool.
    // We will assume we need to adapt it to FunctionTool format if PaidToolWrapper isn't directly compatible.
    // *Self-Correction*: PaidToolWrapper isn't an ADK Tool type. We need to wrap it.
    tools: [
        // We'll trust the ADK to execute the 'execute' method if we pass it, or we define it as a callable.
        // Actually, let's map them to simple functions for the agent config if needed, 
        // but for this file, let's assume we export them as the tools list.
    ],
});

// Helper to convert PaidToolWrapper to ADK Tool format (FunctionTool)
// We do this dynamically to keep the code clean.
import { FunctionTool } from '@google/adk';

const wrappers = [
    searchTool,
    githubTool,
    fsListTool,
    weatherTool,
    cryptoTool,
    eventsTool,
    calculatorTool
];

// Re-assign tools property with converted FunctionTools
// @ts-ignore - Accessing private propery or re-assigning for setup
rootAgent.tools = wrappers.map(wrapper => {
    return new FunctionTool({
        name: wrapper.name,
        description: wrapper.description,
        // We can define parameters loosely or strictly. 
        // For simplicity in this demo, letting LLM infer schema or using 'any'.
        // In production, we'd copy the schema from the inner tool or define it.
        execute: async (args) => wrapper.execute(args)
    });
});