/**
 * MCP Client Wrapper
 * Connects ADK agents to MCP servers (Tavily, Brave, GitHub, etc.)
 * 
 * Uses @modelcontextprotocol/sdk to communicate with MCP servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * MCP Server configurations
 */
export const MCP_SERVER_CONFIGS: Record<string, {
    command: string;
    args: string[];
    envVars: string[];
    tools: string[];
}> = {
    tavily: {
        command: 'npx',
        args: ['-y', '@anthropic/tavily-mcp-server'],
        envVars: ['TAVILY_API_KEY'],
        tools: ['search'],
    },
    brave: {
        command: 'npx',
        args: ['-y', '@anthropic/brave-search-mcp-server'],
        envVars: ['BRAVE_API_KEY'],
        tools: ['brave_web_search', 'brave_local_search'],
    },
    github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        envVars: ['GITHUB_TOKEN'],
        tools: ['search_repositories', 'get_file_contents', 'create_issue'],
    },
    filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
        envVars: [],
        tools: ['read_file', 'write_file', 'list_directory'],
    },
};

/**
 * MCP Client manager
 * Manages connections to multiple MCP servers
 */
export class MCPClientManager {
    private clients: Map<string, Client> = new Map();
    private transports: Map<string, StdioClientTransport> = new Map();

    /**
     * Connect to an MCP server
     */
    async connect(serverName: string): Promise<Client> {
        if (this.clients.has(serverName)) {
            return this.clients.get(serverName)!;
        }

        const config = MCP_SERVER_CONFIGS[serverName];
        if (!config) {
            throw new Error(`Unknown MCP server: ${serverName}`);
        }

        // Check required env vars
        for (const envVar of config.envVars) {
            if (!process.env[envVar]) {
                console.warn(`Warning: ${envVar} not set for ${serverName} MCP server`);
            }
        }

        // Create transport
        const transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env: {
                ...process.env,
            },
        });

        // Create client
        const client = new Client(
            { name: `adk-${serverName}-client`, version: '1.0.0' },
            { capabilities: {} }
        );

        // Connect
        await client.connect(transport);

        this.clients.set(serverName, client);
        this.transports.set(serverName, transport);

        return client;
    }

    /**
     * Call a tool on an MCP server
     */
    async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<any> {
        const client = await this.connect(serverName);

        const result = await client.callTool({
            name: toolName,
            arguments: args,
        });

        return result;
    }

    /**
     * List available tools on an MCP server
     */
    async listTools(serverName: string): Promise<any[]> {
        const client = await this.connect(serverName);
        const tools = await client.listTools();
        return tools.tools;
    }

    /**
     * Disconnect from an MCP server
     */
    async disconnect(serverName: string): Promise<void> {
        const client = this.clients.get(serverName);
        const transport = this.transports.get(serverName);

        if (client) {
            await client.close();
            this.clients.delete(serverName);
        }

        if (transport) {
            await transport.close();
            this.transports.delete(serverName);
        }
    }

    /**
     * Disconnect from all servers
     */
    async disconnectAll(): Promise<void> {
        const serverNames = Array.from(this.clients.keys());
        await Promise.all(serverNames.map(name => this.disconnect(name)));
    }
}

// Singleton instance
export const mcpManager = new MCPClientManager();

/**
 * Helper function to call Tavily search
 */
export async function tavilySearch(query: string): Promise<any> {
    try {
        return await mcpManager.callTool('tavily', 'search', { query });
    } catch (error) {
        console.error('Tavily search failed:', error);
        return { error: 'Tavily search failed', fallback: true };
    }
}

/**
 * Helper function to call Brave search
 */
export async function braveSearch(query: string): Promise<any> {
    try {
        return await mcpManager.callTool('brave', 'brave_web_search', { query });
    } catch (error) {
        console.error('Brave search failed:', error);
        return { error: 'Brave search failed', fallback: true };
    }
}

/**
 * Helper function to search GitHub
 */
export async function githubSearch(query: string): Promise<any> {
    try {
        return await mcpManager.callTool('github', 'search_repositories', { query });
    } catch (error) {
        console.error('GitHub search failed:', error);
        return { error: 'GitHub search failed', fallback: true };
    }
}
