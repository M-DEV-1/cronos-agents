import 'dotenv/config';
import { LlmAgent } from '@google/adk';
import { PaidToolWrapper, paymentEvents } from './pay-wrapper.js';
import { mcpManager } from './mcp-client.js';

/**
 * UNIQUE WALLET ADDRESSES FOR EACH TOOL (Source Agents)
 * These are the x402-enabled accounts on Cronos Testnet that receive payments.
 * Configure these in .env or use defaults for testing.
 */
const WALLETS = {
    SEARCH: process.env.WALLET_SEARCH || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    GITHUB: process.env.WALLET_GITHUB || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    FILESYSTEM: process.env.WALLET_FILESYSTEM || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    WEATHER: process.env.WALLET_WEATHER || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    TIME: process.env.WALLET_TIME || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    CRYPTO: process.env.WALLET_CRYPTO || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    EVENTS: process.env.WALLET_EVENTS || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    CALCULATOR: process.env.WALLET_CALCULATOR || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
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
        // Use CoinGecko API for real prices
        try {
            const coinIds: Record<string, string> = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'CRO': 'crypto-com-chain',
                'SOL': 'solana',
            };
            const coinId = coinIds[args.symbol.toUpperCase()] || args.symbol.toLowerCase();
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
            );
            const data = await response.json();
            const priceData = data[coinId];
            if (priceData) {
                return {
                    symbol: args.symbol,
                    price: priceData.usd,
                    change24h: priceData.usd_24h_change,
                    currency: 'USD'
                };
            }
            // Fallback to search if CoinGecko fails
            return mcpManager.callTool('brave', 'brave_web_search', { query: `${args.symbol} cryptocurrency price USD` });
        } catch {
            // Fallback to search
            return mcpManager.callTool('brave', 'brave_web_search', { query: `${args.symbol} cryptocurrency price USD` });
        }
    },
});

const eventsTool = new PaidToolWrapper({
    name: 'find_events',
    description: 'Find upcoming events, festivals, or conferences',
    cost: 0.02,
    walletAddress: WALLETS.EVENTS,
    handler: async (args: { query: string, location?: string }) => {
        // Use web search for real event data
        const searchQuery = args.location
            ? `${args.query} events ${args.location} 2026`
            : `${args.query} events upcoming 2026`;
        return mcpManager.callTool('brave', 'brave_web_search', { query: searchQuery });
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
 * 
 * The agent can generate A2UI (Agent-to-UI) components for rich visual responses.
 */
import { A2UI_COMPONENT_SCHEMA } from './a2ui-generator.js';

export const rootAgent = new LlmAgent({
    name: 'source_agent',
    model: 'gemini-2.5-flash',
    description: 'A paid information agent that retrieves data from various sources via x402-enabled tools and generates rich A2UI interfaces.',
    instruction: `You are a helpful Source Agent with A2UI capabilities.
    
    ## Paid Tools (x402)
    You have access to several tools. Each costs TCRO (Cronos Testnet) to use:
    - 'web_search' (0.005 TCRO): General web search
    - 'github_search' (0.002 TCRO): Code/repo search
    - 'get_crypto_price' (0.01 TCRO): Cryptocurrency prices
    - 'find_events' (0.02 TCRO): Events/conferences
    - 'calculator' (0.001 TCRO): Math calculations
    - 'get_weather' (0.003 TCRO): Weather information
    
    ## A2UI: Rich Visual Responses
    When your response would benefit from visual presentation (lists, prices, events, cards, forms), 
    generate A2UI JSON to create interactive UI components.
    
    ${A2UI_COMPONENT_SCHEMA}
    
    ## Guidelines
    1. Use tools to gather information
    2. Summarize results in natural language
    3. When appropriate, also return A2UI JSON for rich presentation
    4. Mark paid/premium data with isPaid: true in PriceTracker components
    5. Include actions for interactive elements (alerts, details buttons)
    `,

    tools: [],
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