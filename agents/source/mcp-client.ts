import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPClientManager {
    private clients: Map<string, Client> = new Map();
    private transports: Map<string, StdioClientTransport> = new Map();

    async connect(serverName: string): Promise<Client> {
        if (this.clients.has(serverName)) {
            return this.clients.get(serverName)!;
        }

        const config = MCP_SERVER_CONFIGS[serverName];
        if (!config) {
            throw new Error(`Unknown MCP server: ${serverName}`);
        }

        console.log(`Connecting to MCP server: ${serverName}...`);

        const transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env: config.envVars.reduce((acc, varName) => {
                const val = process.env[varName];
                if (val) acc[varName] = val;
                return acc;
            }, {} as Record<string, string>)
        });

        const client = new Client(
            { name: "cronos-agent-client", version: "1.0.0" },
            { capabilities: {} }
        );

        await client.connect(transport);

        this.clients.set(serverName, client);
        this.transports.set(serverName, transport);

        console.log(`Connected to ${serverName}`);
        return client;
    }

    async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<any> {
        try {
            const client = await this.connect(serverName);
            console.log(`Calling tool ${toolName} on ${serverName} with args:`, JSON.stringify(args));
            const result = await client.callTool({
                name: toolName,
                arguments: args
            });
            
            // Sanitize result - ensure it's never a string starting with "exception"
            let sanitizedResult = result;
            
            // Check if result is a string that looks like an error
            if (typeof result === 'string') {
                const lowerResult = result.toLowerCase().trim();
                if (lowerResult.startsWith('exception') || lowerResult.startsWith('error')) {
                    console.error(`[MCP] Tool ${toolName} returned error string:`, result);
                    return {
                        error: true,
                        message: 'Tool execution failed',
                        tool: toolName,
                        server: serverName,
                        details: result
                    };
                }
                // If it's a valid JSON string, try to parse it
                if (result.trim().startsWith('{') || result.trim().startsWith('[')) {
                    try {
                        sanitizedResult = JSON.parse(result);
                    } catch {
                        // Not JSON, return as string
                        sanitizedResult = result;
                    }
                }
            }
            
            // Check if result contains error-like properties
            if (result && typeof result === 'object') {
                // Check for MCP error structure
                if (result.content && Array.isArray(result.content)) {
                    for (const item of result.content) {
                        if (typeof item === 'string' && item.toLowerCase().includes('exception')) {
                            console.error(`[MCP] Tool ${toolName} result contains exception:`, item);
                            return {
                                error: true,
                                message: 'Tool execution failed',
                                tool: toolName,
                                server: serverName,
                                details: item
                            };
                        }
                    }
                }
                
                // Check for text property that might contain exception
                if (result.text && typeof result.text === 'string' && result.text.toLowerCase().includes('exception')) {
                    console.error(`[MCP] Tool ${toolName} result.text contains exception:`, result.text);
                    return {
                        error: true,
                        message: 'Tool execution failed',
                        tool: toolName,
                        server: serverName,
                        details: result.text
                    };
                }
            }
            
            console.log(`Tool ${toolName} completed successfully`);
            return sanitizedResult;
        } catch (error: any) {
            console.error(`[MCP] Error calling tool ${toolName} on ${serverName}:`, error);
            
            // Extract error message safely
            let errorMessage = 'Unknown error occurred';
            if (error?.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                try {
                    errorMessage = JSON.stringify(error);
                } catch {
                    errorMessage = String(error);
                }
            }
            
            // Return a proper error object instead of throwing
            return {
                error: true,
                message: errorMessage,
                tool: toolName,
                server: serverName,
                details: error?.toString() || String(error)
            };
        }
    }

    async closeAll() {
        for (const [name, transport] of this.transports) {
            console.log(`Closing connection to ${name}`);
            await transport.close();
        }
        this.clients.clear();
        this.transports.clear();
    }
}

export const mcpManager = new MCPClientManager();

/**
 * MCP Server Configurations
 * Sourced from mcpmarket.com and official repositories.
 */
export const MCP_SERVER_CONFIGS: Record<string, {
    command: string;
    args: string[];
    envVars: string[];
    tools: string[];
}> = {
    // Web Search (Official) -> Replaces deprecated @anthropic/brave...
    brave: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-brave-search'], // Updated package
        envVars: ['BRAVE_API_KEY'],
        tools: ['brave_web_search', 'brave_local_search'],
    },
    // GitHub
    github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        envVars: ['GITHUB_TOKEN'],
        tools: ['search_repositories', 'get_file_contents', 'create_issue'],
    },
    // Filesystem
    filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
        envVars: [],
        tools: ['read_file', 'write_file', 'list_directory'],
    },
    // Weather (Official MCP)
    weather: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-weather'],
        envVars: ['OPENWEATHERMAP_API_KEY'],
        tools: ['get_current_weather', 'get_forecast'],
    },
    // Time (Official MCP)
    time: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-time'],
        envVars: [],
        tools: ['get_current_time', 'convert_time'],
    },
    // CoinGecko Market Data (Official)
    coingecko: {
        command: 'npx',
        args: ['-y', '@coingecko/coingecko-mcp@latest'],
        envVars: ['COINGECKO_API_KEY'],
        tools: ['get_simple_price', 'get_coins_list', 'get_coins_markets'],
    }
};
