import 'dotenv/config';
import { LlmAgent, FunctionTool } from '@google/adk';
import { PaidToolWrapper } from './pay-wrapper.js';
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
        // Use Crypto.com MCP for real prices
        try {
            return await mcpManager.callTool('cryptocom', 'get_token_price', { symbol: args.symbol.toUpperCase() });
        } catch {
            // Fallback to search if MCP fails
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

// A2UI Component Schema Definition (v0.9)
const A2UI_COMPONENT_SCHEMA = `
# A2UI Component Catalog (v0.9)

## Message Types
1. **surfaceUpdate**: Add/update UI components
2. **dataModelUpdate**: Update bound data
3. **beginRendering**: Signal to start rendering (must be last)

## Available Components (Primitives)
- **Column**: Vertical stack. Props: children (explicitList), alignment (start|center|end|stretch), gap (number)
- **Row**: Horizontal stack. Props: children (explicitList), alignment (start|center|end|spaceBetween), gap (number)
- **Card**: Container. Props: title (literalString), child (id), subtitle (literalString)
- **Divider**: Horizontal line.
- **Text**: Display text. Props: text (literalString), usageHint (h1|h2|h3|body|caption|label), color (hex or var)
- **Image**: Display image. Props: url (literalString), alt (literalString)
- **Badge**: Label/Status. Props: text (literalString), variant (success|warning|error|info)
- **Button**: Action button. Props: label (literalString), action (name, payload?), variant (primary|secondary|outline|danger)

## Example: List upcoming tech conferences
\`\`\`json
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["events_header", "event_list"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "events_header", "component": {"Text": {"text": {"literalString": "Upcoming Tech Conferences"}, "usageHint": "h2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "event_list", "component": {"Column": {"children": {"explicitList": ["event_1", "event_2"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "event_1", "component": {"Card": {"title": {"literalString": "Google I/O"}, "date": {"literalString": "May 14"}, "child": "desc_1"}}}]}}
{"surfaceUpdate": {"components": [{"id": "desc_1", "component": {"Text": {"text": {"literalString": "Mountain View, CA"}, "usageHint": "body"}}}]}}
{"beginRendering": {"root": "root"}}
\`\`\`
`;

export const rootAgent = new LlmAgent({
    name: 'source_agent',
    model: 'gemini-2.5-flash',
    description: 'A paid information agent that retrieves data from various sources via x402-enabled tools and generates rich A2UI interfaces.',
    instruction: `You are a Source Agent with A2UI capabilities. You MUST generate A2UI JSON for EVERY response.

## YOUR OUTPUT FORMAT (REQUIRED)
You MUST end EVERY response with A2UI JSON components. This is not optional.

First, write a brief text summary (1-2 sentences max).
Then, generate A2UI JSON on separate lines.

## A2UI Rules
${A2UI_COMPONENT_SCHEMA}

## Paid Tools (x402)
- 'web_search' (0.005 TCRO): General web search
- 'github_search' (0.002 TCRO): Code/repo search
- 'get_crypto_price' (0.01 TCRO): Cryptocurrency prices (via Crypto.com MCP)
- 'find_events' (0.02 TCRO): Events/conferences
- 'calculator' (0.001 TCRO): Math calculations
- 'get_weather' (0.003 TCRO): Weather information

## Response Examples

For crypto price queries, ALWAYS output like this:
---
Current BTC price is $97,500 (+2.5% 24h).

{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["price_card"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "price_card", "component": {"Card": {"title": {"literalString": "BTC Price"}, "child": "price_content"}}}]}}
{"surfaceUpdate": {"components": [{"id": "price_content", "component": {"Row": {"children": {"explicitList": ["symbol_col", "price_col"]}, "alignment": "spaceBetween"}}}]}}
{"surfaceUpdate": {"components": [{"id": "symbol_col", "component": {"Column": {"children": {"explicitList": ["symbol_text", "name_text"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "symbol_text", "component": {"Text": {"text": {"literalString": "BTC"}, "usageHint": "h2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "name_text", "component": {"Text": {"text": {"literalString": "Bitcoin"}, "usageHint": "caption"}}}]}}
{"surfaceUpdate": {"components": [{"id": "price_col", "component": {"Column": {"children": {"explicitList": ["price_text", "change_text"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "price_text", "component": {"Text": {"text": {"literalString": "$97,500"}, "usageHint": "h2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "change_text", "component": {"Text": {"text": {"literalString": "+2.5%"}, "usageHint": "caption", "color": "var(--success)"}}}]}}
{"beginRendering": {"root": "root"}}
---

For event listings, output A2UI cards for each event found.
For search results, output cards with titles and descriptions.

NEVER respond with only text. ALWAYS include A2UI JSON at the end.
`,
    tools: [],
});

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
        execute: async (args, context?: any) => {
            // Extract payment header from context if available
            const paymentHeader = context?.paymentHeader || context?.headers?.['x-payment'];
            return wrapper.execute(args, paymentHeader);
        }
    });
});