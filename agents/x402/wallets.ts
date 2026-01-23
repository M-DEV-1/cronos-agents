/**
 * Tool Wallet Mappings
 * Each source tool has its own wallet address to receive x402 payments on Cronos testnet.
 * 
 * These are REAL testnet wallet addresses generated for the hackathon.
 * Each tool maps to an MCP server or API source where applicable.
 */

import { ToolWallet, ToolPricing } from './types.js';

// MCP Server References (from mcpmarket.com / mcp ecosystem)
export const MCP_SERVERS = {
    TAVILY: {
        name: 'Tavily',
        description: 'AI-optimized search engine for RAG workflows',
        package: '@anthropic/tavily-mcp-server',
        apiEnvVar: 'TAVILY_API_KEY',
        docs: 'https://tavily.com',
    },
    BRAVE_SEARCH: {
        name: 'Brave Search',
        description: 'Privacy-focused web search',
        package: '@anthropic/brave-search-mcp-server',
        apiEnvVar: 'BRAVE_API_KEY',
        docs: 'https://brave.com/search/api',
    },
    GITHUB: {
        name: 'GitHub',
        description: 'Repository and code management',
        package: '@modelcontextprotocol/server-github',
        apiEnvVar: 'GITHUB_TOKEN',
        docs: 'https://github.com',
    },
    FILESYSTEM: {
        name: 'Filesystem',
        description: 'Local file system access',
        package: '@modelcontextprotocol/server-filesystem',
        apiEnvVar: null,
        docs: 'https://modelcontextprotocol.io',
    },
    EXA: {
        name: 'Exa',
        description: 'Neural search engine',
        package: '@modelcontextprotocol/server-exa',
        apiEnvVar: 'EXA_API_KEY',
        docs: 'https://exa.ai',
    },
};

// Pricing tiers
const FREE_PRICING: ToolPricing = {
    default: { price: 0, unit: 'fixed', currency: 'USDC', description: 'Free tool' },
};

const SEARCH_PRICING: ToolPricing = {
    default: { price: 0.001, unit: 'per_request', currency: 'USDC', description: 'Per search query' },
};

const DATA_PRICING: ToolPricing = {
    snapshot: { price: 0.01, unit: 'per_request', currency: 'USDC', description: 'Single data point' },
    stream: { price: 0.05, unit: 'per_second', currency: 'USDC', description: 'Live data stream' },
};

const PREMIUM_PRICING: ToolPricing = {
    default: { price: 0.05, unit: 'per_request', currency: 'USDC', description: 'Premium data access' },
};

/**
 * Tool wallet registry
 * Maps each tool to its receiving wallet and pricing on Cronos testnet
 * 
 * REAL TESTNET WALLETS - Generated for hackathon
 */
export const TOOL_WALLETS: Record<string, ToolWallet> = {
    // Search & Discovery Tools (Tavily / Brave MCP)
    web_search: {
        toolName: 'web_search',
        walletAddress: '0x87C45698081B7F3ae524435da0d80735513eA5DA', // Wallet 1
        pricing: SEARCH_PRICING,
        metadata: {
            source_agent_id: 'agent_web_search',
            category: 'search',
            mcp_server: MCP_SERVERS.TAVILY,
        },
    },

    get_news: {
        toolName: 'get_news',
        walletAddress: '0x698be13c3d412192A7De76EF82229493fE34bccc', // Wallet 2
        pricing: { default: { price: 0.002, unit: 'per_request', currency: 'USDC' } },
        metadata: {
            source_agent_id: 'agent_news',
            category: 'news',
            mcp_server: MCP_SERVERS.TAVILY,
        },
    },

    search_events: {
        toolName: 'search_events',
        walletAddress: '0x70149741b02FC6b8d4d7c22DC229D857756e565b', // Wallet 3
        pricing: { default: { price: 0.005, unit: 'per_request', currency: 'USDC' } },
        metadata: {
            source_agent_id: 'agent_events',
            category: 'events',
            mcp_server: MCP_SERVERS.BRAVE_SEARCH,
        },
    },

    search_wikipedia: {
        toolName: 'search_wikipedia',
        walletAddress: '0x389f72173a13A58BB771fF18cbDB09D870abcA4d', // Wallet 4
        pricing: SEARCH_PRICING,
        metadata: {
            source_agent_id: 'agent_wikipedia',
            category: 'knowledge',
            mcp_server: MCP_SERVERS.EXA,
        },
    },

    search_youtube: {
        toolName: 'search_youtube',
        walletAddress: '0x39636F85050Ca96C1bDb5c32b3B52a2f81F839D8', // Wallet 5
        pricing: { default: { price: 0.002, unit: 'per_request', currency: 'USDC' } },
        metadata: {
            source_agent_id: 'agent_youtube',
            category: 'media',
            mcp_server: MCP_SERVERS.BRAVE_SEARCH,
        },
    },

    // Crypto & Blockchain Tools (Custom/Crypto.com)
    get_crypto_price: {
        toolName: 'get_crypto_price',
        walletAddress: '0x7DD5aeF0430CB3ED88b662ef840900B412963139', // Wallet 6
        pricing: DATA_PRICING,
        metadata: {
            source_agent_id: 'agent_crypto_price',
            category: 'finance',
            api_source: 'Crypto.com Exchange API',
        },
    },

    get_blockchain_data: {
        toolName: 'get_blockchain_data',
        walletAddress: '0xA48e87CaF13a33f22e97291a9B3e153f5E43Fbe6', // Wallet 7
        pricing: PREMIUM_PRICING,
        metadata: {
            source_agent_id: 'agent_blockchain',
            category: 'blockchain',
            api_source: 'Cronos RPC / Cronoscan API',
        },
    },

    // Developer Tools (GitHub MCP)
    get_github_info: {
        toolName: 'get_github_info',
        walletAddress: '0x3e9e6E727aF6B506284fFC621Ff9eAca0EbEad76', // Wallet 8
        pricing: { default: { price: 0.002, unit: 'per_request', currency: 'USDC' } },
        metadata: {
            source_agent_id: 'agent_github',
            category: 'developer',
            mcp_server: MCP_SERVERS.GITHUB,
        },
    },

    // Utility Tools (Free - no payment required)
    get_weather: {
        toolName: 'get_weather',
        walletAddress: '0xeFa4396Ed49bC9584D870ACf8b645072F6600eE1', // Wallet 9
        pricing: FREE_PRICING,
        metadata: {
            source_agent_id: 'agent_weather',
            category: 'utility',
            api_source: 'OpenWeatherMap',
        },
    },

    calculate: {
        toolName: 'calculate',
        walletAddress: '0x0d56C5ffBCeaa9a17E9f66b9b438c95083a61D89', // Wallet 10
        pricing: FREE_PRICING,
        metadata: {
            source_agent_id: 'agent_calculator',
            category: 'utility',
        },
    },

    manage_reminders: {
        toolName: 'manage_reminders',
        walletAddress: '0x443758B4e1f0fD7b8b05a9A9F0848f940efbd49C', // Wallet 11
        pricing: FREE_PRICING,
        metadata: {
            source_agent_id: 'agent_reminders',
            category: 'utility',
        },
    },
};

/**
 * Get wallet info for a tool
 */
export function getToolWallet(toolName: string): ToolWallet | undefined {
    return TOOL_WALLETS[toolName];
}

/**
 * Get price for a tool execution
 */
export function getToolPrice(toolName: string, tier: string = 'default'): number {
    const wallet = TOOL_WALLETS[toolName];
    if (!wallet) return 0;

    // Try requested tier, then default, then first available tier
    const pricingTier = wallet.pricing[tier] || wallet.pricing.default || Object.values(wallet.pricing)[0];
    return pricingTier?.price || 0;
}

/**
 * Check if a tool requires payment
 */
export function isToolPaid(toolName: string): boolean {
    return getToolPrice(toolName) > 0;
}

/**
 * Get all paid tools
 */
export function getPaidTools(): ToolWallet[] {
    return Object.values(TOOL_WALLETS).filter(w =>
        Object.values(w.pricing).some(p => p.price > 0)
    );
}

/**
 * Get all free tools
 */
export function getFreeTools(): ToolWallet[] {
    return Object.values(TOOL_WALLETS).filter(w =>
        Object.values(w.pricing).every(p => p.price === 0)
    );
}

/**
 * Get tools by MCP server
 */
export function getToolsByMCP(mcpName: string): ToolWallet[] {
    return Object.values(TOOL_WALLETS).filter(w =>
        w.metadata?.mcp_server?.name === mcpName
    );
}
