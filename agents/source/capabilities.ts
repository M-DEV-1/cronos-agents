export interface Capability {
    id: string;
    description: string;
    mcpServer: string | null; // null = custom handler
    tool: string;
    cost: number;
    walletAddress: string;
    keywords: string[]; // For intent matching
}

const WALLETS = {
    SEARCH: process.env.WALLET_SEARCH || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    GITHUB: process.env.WALLET_GITHUB || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    CRYPTO: process.env.WALLET_CRYPTO || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    EVENTS: process.env.WALLET_EVENTS || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    WEATHER: process.env.WALLET_WEATHER || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    FILESYSTEM: process.env.WALLET_FILESYSTEM || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
    CALCULATOR: process.env.WALLET_CALCULATOR || '0x87C45698081B7F3ae524435da0d80735513eA5DA',
};

export const CAPABILITY_REGISTRY: Record<string, Capability> = {
    web_search: {
        id: 'web_search',
        description: 'Search the web for information',
        mcpServer: 'brave',
        tool: 'brave_web_search',
        cost: 0.005,
        walletAddress: WALLETS.SEARCH,
        keywords: ['search', 'find', 'look up', 'what is', 'who is', 'where is'],
    },
    github_search: {
        id: 'github_search',
        description: 'Search GitHub repositories and code',
        mcpServer: 'github',
        tool: 'search_repositories',
        cost: 0.002,
        walletAddress: WALLETS.GITHUB,
        keywords: ['github', 'repo', 'repository', 'code', 'open source'],
    },
    crypto_price: {
        id: 'crypto_price',
        description: 'Get cryptocurrency prices',
        mcpServer: null, // Custom CoinGecko handler
        tool: 'get_crypto_price',
        cost: 0.01,
        walletAddress: WALLETS.CRYPTO,
        keywords: ['price', 'btc', 'eth', 'cro', 'sol', 'crypto', 'bitcoin', 'ethereum'],
    },
    events_discovery: {
        id: 'events_discovery',
        description: 'Find events, festivals, and conferences',
        mcpServer: 'brave', // Uses search
        tool: 'find_events',
        cost: 0.02,
        walletAddress: WALLETS.EVENTS,
        keywords: ['event', 'festival', 'conference', 'concert', 'meetup'],
    },
    weather: {
        id: 'weather',
        description: 'Get weather information',
        mcpServer: 'weather',
        tool: 'get_current_weather',
        cost: 0.003,
        walletAddress: WALLETS.WEATHER,
        keywords: ['weather', 'temperature', 'forecast', 'rain', 'sunny'],
    },
    filesystem: {
        id: 'filesystem',
        description: 'List files and directories',
        mcpServer: 'filesystem',
        tool: 'list_directory',
        cost: 0.001,
        walletAddress: WALLETS.FILESYSTEM,
        keywords: ['file', 'folder', 'directory', 'list', 'read'],
    },
    calculator: {
        id: 'calculator',
        description: 'Perform mathematical calculations',
        mcpServer: null,
        tool: 'calculator',
        cost: 0.001,
        walletAddress: WALLETS.CALCULATOR,
        keywords: ['calculate', 'math', 'compute', 'add', 'subtract', 'multiply', 'divide'],
    },
};

export function routeIntent(prompt: string): Capability | null {
    const lowerPrompt = prompt.toLowerCase();

    // Score each capability by keyword match
    let bestMatch: { capability: Capability; score: number } | null = null;

    for (const capability of Object.values(CAPABILITY_REGISTRY)) {
        let score = 0;
        for (const keyword of capability.keywords) {
            if (lowerPrompt.includes(keyword)) {
                score += keyword.length;
            }
        }
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { capability, score };
        }
    }

    return bestMatch?.capability || null;
}

export function routeAllIntents(prompt: string): Capability[] {
    const lowerPrompt = prompt.toLowerCase();
    const matches: Capability[] = [];

    for (const capability of Object.values(CAPABILITY_REGISTRY)) {
        for (const keyword of capability.keywords) {
            if (lowerPrompt.includes(keyword)) {
                matches.push(capability);
                break;
            }
        }
    }

    return matches;
}
