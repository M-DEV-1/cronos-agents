/**
 * Paid Tool Wrapper
 * Wraps ADK FunctionTools with x402 payment metadata
 * 
 * Uses REAL testnet wallet addresses generated for the Cronos x402 hackathon.
 * MCP server references included for future integration.
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * Pricing tier definition
 */
interface PricingTier {
    price: number;
    unit: 'fixed' | 'per_request' | 'per_second' | 'per_item';
    currency: string;
    description?: string;
}

/**
 * MCP Server references for future integration
 */
export const MCP_SERVERS = {
    TAVILY: { name: 'Tavily', package: '@anthropic/tavily-mcp-server' },
    BRAVE_SEARCH: { name: 'Brave Search', package: '@anthropic/brave-search-mcp-server' },
    GITHUB: { name: 'GitHub', package: '@modelcontextprotocol/server-github' },
    EXA: { name: 'Exa', package: '@modelcontextprotocol/server-exa' },
};

/**
 * Tool wallet mapping with REAL Cronos testnet addresses
 */
const TOOL_WALLETS: Record<string, {
    walletAddress: string;
    pricing: Record<string, PricingTier>;
    mcpServer?: string;
}> = {
    // Search tools - Tavily MCP
    web_search: {
        walletAddress: '0x87C45698081B7F3ae524435da0d80735513eA5DA',
        pricing: { default: { price: 0.001, unit: 'per_request', currency: 'USDC' } },
        mcpServer: 'Tavily',
    },
    get_news: {
        walletAddress: '0x698be13c3d412192A7De76EF82229493fE34bccc',
        pricing: { default: { price: 0.002, unit: 'per_request', currency: 'USDC' } },
        mcpServer: 'Tavily',
    },
    // Events - Brave Search MCP
    search_events: {
        walletAddress: '0x70149741b02FC6b8d4d7c22DC229D857756e565b',
        pricing: { default: { price: 0.005, unit: 'per_request', currency: 'USDC' } },
        mcpServer: 'Brave Search',
    },
    // Knowledge - Exa MCP
    search_wikipedia: {
        walletAddress: '0x389f72173a13A58BB771fF18cbDB09D870abcA4d',
        pricing: { default: { price: 0.001, unit: 'per_request', currency: 'USDC' } },
        mcpServer: 'Exa',
    },
    // Media - Brave Search MCP
    search_youtube: {
        walletAddress: '0x39636F85050Ca96C1bDb5c32b3B52a2f81F839D8',
        pricing: { default: { price: 0.002, unit: 'per_request', currency: 'USDC' } },
        mcpServer: 'Brave Search',
    },
    // Crypto - Crypto.com API
    get_crypto_price: {
        walletAddress: '0x7DD5aeF0430CB3ED88b662ef840900B412963139',
        pricing: {
            default: { price: 0.01, unit: 'per_request', currency: 'USDC' },
            stream: { price: 0.05, unit: 'per_second', currency: 'USDC' },
        },
        // T = 3 month data -> unit: per_update || per_update pricing
    },
    // Blockchain - Cronos RPC
    get_blockchain_data: {
        walletAddress: '0xA48e87CaF13a33f22e97291a9B3e153f5E43Fbe6',
        pricing: { default: { price: 0.05, unit: 'per_request', currency: 'USDC' } },
    },
    // Developer - GitHub MCP
    get_github_info: {
        walletAddress: '0x3e9e6E727aF6B506284fFC621Ff9eAca0EbEad76',
        pricing: { default: { price: 0.002, unit: 'per_request', currency: 'USDC' } },
        mcpServer: 'GitHub',
    },
    // Free utility tools
    get_weather: {
        walletAddress: '0xeFa4396Ed49bC9584D870ACf8b645072F6600eE1',
        pricing: { default: { price: 0, unit: 'fixed', currency: 'USDC' } },
    },
    calculate: {
        walletAddress: '0x0d56C5ffBCeaa9a17E9f66b9b438c95083a61D89',
        pricing: { default: { price: 0, unit: 'fixed', currency: 'USDC' } },
    },
    manage_reminders: {
        walletAddress: '0x443758B4e1f0fD7b8b05a9A9F0848f940efbd49C',
        pricing: { default: { price: 0, unit: 'fixed', currency: 'USDC' } },
    },
};

/**
 * Tool execution result with payment info
 */
export interface PaidToolResult<T = any> {
    status: 'success' | 'error';
    data?: T;
    payment?: {
        required: boolean;
        price: number;
        currency: string;
        walletAddress: string;
        toolName: string;
    };
    error?: string;
}

/**
 * Get payment info for a tool
 */
export function getPaymentInfo(toolName: string, tier: string = 'default'): {
    required: boolean;
    price: number;
    currency: string;
    walletAddress: string;
    mcpServer?: string;
} {
    const wallet = TOOL_WALLETS[toolName];
    if (!wallet) {
        return { required: false, price: 0, currency: 'USDC', walletAddress: '' };
    }

    const pricingTier = wallet.pricing[tier] || wallet.pricing.default;
    const price = pricingTier?.price || 0;

    return {
        required: price > 0,
        price,
        currency: pricingTier?.currency || 'USDC',
        walletAddress: wallet.walletAddress,
        mcpServer: wallet.mcpServer,
    };
}

/**
 * Create a tool that includes payment metadata in its response
 */
export function createPaidFunctionTool<T extends z.ZodObject<any>>(config: {
    name: string;
    description: string;
    parameters: T;
    pricingTier?: string;
    execute: (args: z.infer<T>) => any;
}): FunctionTool {
    const { name, description, parameters, pricingTier = 'default', execute } = config;

    return new FunctionTool({
        name,
        description: `${description} [x402 enabled]`,
        parameters,
        execute: (args: z.infer<T>) => {
            const paymentInfo = getPaymentInfo(name, pricingTier);
            const result = execute(args);

            // Attach payment metadata to result
            return {
                ...result,
                _x402: {
                    toolName: name,
                    paymentRequired: paymentInfo.required,
                    price: paymentInfo.price,
                    currency: paymentInfo.currency,
                    walletAddress: paymentInfo.walletAddress,
                    mcpServer: paymentInfo.mcpServer,
                },
            };
        },
    });
}

/**
 * Utility to list all tools with their pricing and wallet info
 */
export function listToolsWithPricing(): Array<{
    name: string;
    price: number;
    currency: string;
    walletAddress: string;
    isPaid: boolean;
    mcpServer?: string;
}> {
    return Object.entries(TOOL_WALLETS).map(([name, config]) => {
        const price = config.pricing.default?.price || 0;
        return {
            name,
            price,
            currency: config.pricing.default?.currency || 'USDC',
            walletAddress: config.walletAddress,
            isPaid: price > 0,
            mcpServer: config.mcpServer,
        };
    });
}
