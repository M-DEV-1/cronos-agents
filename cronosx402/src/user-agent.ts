// User Agent
// Interprets intent, obeys source policy, no hidden sources

import { UserPrompt, SourcePolicy, SourceOption, MCPToolCall } from './types';
import { X402Handler } from './x402-handler';
import axios from 'axios';

export class UserAgent {
  private sourcePolicy: SourcePolicy | null = null;
  private x402Handler: X402Handler;
  private availableSources: Map<string, string> = new Map(); // source_agent_id -> mcp_server_url

  constructor(privateKey: string) {
    this.x402Handler = new X402Handler(privateKey);
    this.registerDefaultSources();
  }

  private registerDefaultSources() {
    // Register available MCP sources
    this.availableSources.set('agent_crypto_com', 'http://localhost:4001');
    this.availableSources.set('agent_music_player', 'http://localhost:4002');
    // Add more sources as needed
  }

  setSourcePolicy(policy: SourcePolicy) {
    this.sourcePolicy = policy;
  }

  async interpretIntent(prompt: UserPrompt): Promise<{
    intent: string;
    requiredTools: string[];
    suggestedSources: SourceOption[];
  }> {
    const intent = this.parseIntent(prompt.prompt);
    const requiredTools = this.determineRequiredTools(intent);
    const suggestedSources = await this.discoverSources(requiredTools);
    const filteredSources = this.applySourcePolicy(suggestedSources);

    return {
      intent,
      requiredTools,
      suggestedSources: filteredSources
    };
  }

  private parseIntent(prompt: string): string {
    const lower = prompt.toLowerCase();
    
    if (lower.match(/\b(stock|price|btc|eth)\b/)) {
      if (lower.includes('alarm') || lower.includes('alert')) {
        return 'price_alarm';
      }
      return 'stock_price_query';
    }
    
    if (lower.match(/\b(music|song|songs|playlist|album|artist)\b/) ||
        (lower.includes('alarm') && lower.match(/\b(tune|ring|song|music)\b/))) {
      return 'music_query';
    }
    
    return 'general_query';
  }

  private determineRequiredTools(intent: string): string[] {
    switch (intent) {
      case 'stock_price_query':
      case 'price_alarm':
        return ['get_snapshot', 'get_metadata'];
      case 'music_query':
        return ['get_top_songs', 'get_song_metadata', 'get_song_audio'];
      default:
        return [];
    }
  }

  private async discoverSources(requiredTools: string[]): Promise<SourceOption[]> {
    const sources: SourceOption[] = [];

    for (const [sourceId, mcpUrl] of this.availableSources.entries()) {
      try {
        const response = await axios.get(`${mcpUrl}/mcp/tools`, { timeout: 5000 });
        const tools = response.data.tools as any[];

        const hasRequiredTools = requiredTools.some(tool =>
          tools.some((t: any) => t.name === tool)
        );

        if (hasRequiredTools) {
          const pricing: any = {};
          const metadata: any = { source_agent_id: sourceId };

          for (const tool of tools) {
            if (tool.pricing) {
              Object.assign(pricing, tool.pricing);
            }
          }

          sources.push({
            source_agent_id: sourceId,
            name: response.data.name || sourceId,
            metadata: metadata,
            pricing_schema: pricing,
            reputation: 0
          });
        }
      } catch (err: any) {
        // Source unavailable, skip
      }
    }

    return sources;
  }

  private applySourcePolicy(sources: SourceOption[]): SourceOption[] {
    if (!this.sourcePolicy) {
      return sources;
    }

    let filtered = sources;

    if (this.sourcePolicy.allowed_sources.length > 0) {
      filtered = filtered.filter(s =>
        this.sourcePolicy!.allowed_sources.includes(s.source_agent_id)
      );
    }

    if (this.sourcePolicy.max_budget > 0) {
      filtered = filtered.filter(s => {
        const estimatedCost = this.estimateCost(s);
        return estimatedCost <= this.sourcePolicy!.max_budget;
      });
    }

    return filtered;
  }

  private estimateCost(source: SourceOption): number {
    if (!source.pricing_schema) return 0;

    if (source.pricing_schema.metadata) {
      return source.pricing_schema.metadata.price;
    }
    if (source.pricing_schema.snapshot) {
      return source.pricing_schema.snapshot.price;
    }
    if (source.pricing_schema.audio) {
      return source.pricing_schema.audio.price;
    }
    if (source.pricing_schema.stream_1s) {
      return source.pricing_schema.stream_1s.price;
    }
    if (source.pricing_schema.ohlc_1m) {
      return source.pricing_schema.ohlc_1m.price;
    }

    return 0;
  }

  async executeToolCall(
    sourceId: string,
    toolCall: MCPToolCall
  ): Promise<any> {
    const mcpUrl = this.availableSources.get(sourceId);
    if (!mcpUrl) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    // Check source policy
    if (this.sourcePolicy && 
        this.sourcePolicy.allowed_sources.length > 0 && 
        !this.sourcePolicy.allowed_sources.includes(sourceId)) {
      throw new Error(`Source ${sourceId} is not allowed by policy`);
    }

    // Execute tool with automatic payment handling
    const url = `${mcpUrl}/mcp/tools`;
    const response = await this.x402Handler.requestWithAutoPayment(url, toolCall);

    // Handle response structure from MCP server
    // MCP server returns: { status: 200, result: {...}, x402Receipt: {...} }
    // or AgentResponse: { ok: true, paid: true, data: {...}, x402Receipt: {...} }
    const mcpResponse = response as any;
    
    if (mcpResponse.result !== undefined) {
      // MCP server response format
      return {
        tool: toolCall.tool,
        result: mcpResponse.result,
        x402Receipt: mcpResponse.x402Receipt,
        timestamp: new Date().toISOString()
      };
    } else if (mcpResponse.data !== undefined) {
      // AgentResponse format
      return {
        tool: toolCall.tool,
        result: mcpResponse.data,
        x402Receipt: mcpResponse.x402Receipt,
        timestamp: new Date().toISOString()
      };
    }

    // Fallback: return entire response
    return {
      tool: toolCall.tool,
      result: response,
      timestamp: new Date().toISOString()
    };
  }

  async executeWithSourceSelection(
    prompt: UserPrompt,
    selectedSourceId: string
  ): Promise<any> {
    // Interpret intent
    const { requiredTools } = await this.interpretIntent(prompt);

    // Execute tools from selected source
    const results = [];
    let topSongsResult: any = null;

    // For music queries, execute get_top_songs first to get song IDs
    if (requiredTools.includes('get_top_songs')) {
      const toolCall: MCPToolCall = {
        tool: 'get_top_songs',
        arguments: this.getToolArguments(prompt, 'get_top_songs')
      };
      topSongsResult = await this.executeToolCall(selectedSourceId, toolCall);
      results.push(topSongsResult);
    }

    // Execute remaining tools, using results from previous tools if needed
    for (const toolName of requiredTools) {
      if (toolName === 'get_top_songs') {
        continue; // Already executed
      }

      const toolCall: MCPToolCall = {
        tool: toolName,
        arguments: this.getToolArguments(prompt, toolName, topSongsResult)
      };

      const result = await this.executeToolCall(selectedSourceId, toolCall);
      results.push(result);
    }

    return {
      prompt: prompt.prompt,
      source: selectedSourceId,
      results: results,
      totalCost: this.calculateTotalCost(results)
    };
  }

  private getToolArguments(prompt: UserPrompt, toolName: string, previousResult?: any): Record<string, any> {
    const args: Record<string, any> = {};

    if (toolName === 'get_snapshot' || toolName === 'get_metadata') {
      const match = prompt.prompt.match(/\b([A-Z]{2,5})\b/);
      args.feed_id = match ? `price_${match[1].toLowerCase()}_usdt` : 'price_btc_usdt';
    } else if (toolName === 'get_top_songs') {
      args.limit = 10;
    } else if (toolName === 'get_song_metadata' || toolName === 'get_song_audio') {
      if (previousResult?.result?.songs?.length > 0) {
        const songs = previousResult.result.songs;
        const best = songs.sort((a: any, b: any) => (b.reputation || 0) - (a.reputation || 0))[0];
        args.song_id = best.song_id;
      } else {
        args.song_id = 'song_001';
      }
    } else if (toolName === 'search_songs') {
      const lower = prompt.prompt.toLowerCase();
      if (lower.includes('kanye') || lower.includes('west')) args.artist_name = 'Kanye West';
      else if (lower.includes('travis') || lower.includes('scott')) args.artist_name = 'Travis Scott';
      else if (lower.includes('post') || lower.includes('malone')) args.artist_name = 'Post Malone';
    }

    return args;
  }

  private calculateTotalCost(results: any[]): number {
    // Calculate total cost from results
    let total = 0;
    for (const result of results) {
      if (result.x402Receipt?.paymentDetails?.amount) {
        const amount = parseInt(result.x402Receipt.paymentDetails.amount);
        total += amount / 1e6; // Convert from micro-units to USDT
      }
    }
    return total;
  }
}

