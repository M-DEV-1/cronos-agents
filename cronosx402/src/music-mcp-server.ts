import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import { MCPTool, MCPToolCall, SourceMetadata, PricingSchema, PaymentRequirements } from './types';

const app = express();
app.use(express.json());

const FACILITATOR_URL = 'https://facilitator.cronoslabs.org/v2/x402';
const SELLER_WALLET = process.env.SELLER_WALLET!;
const USDX_CONTRACT = '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';
const NETWORK = 'cronos-testnet';

interface Song {
  song_id: string;
  title: string;
  artist_agent_id: string;
  artist_name: string;
  duration_seconds: number;
  tags: string[];
    reputation: number;
  pricing: {
    metadata: { price: number; unit: string; currency: string };
    audio: { price: number; unit: string; currency: string };
  };
}

const TOP_10_SONGS: Song[] = [
  {
    song_id: 'song_001',
    title: 'Good Morning',
    artist_agent_id: 'agent_artist_01',
    artist_name: 'Kanye West',
    duration_seconds: 214,
    tags: ['ambient', 'calm', 'guitar', 'high-pitch'],
    reputation: 4.8,
    pricing: {
      metadata: { price: 0.3, unit: 'fixed', currency: 'USDT' },
      audio: { price: 1.0, unit: 'creator_autonomy', currency: 'USDT' }
    }
  },
  {
    song_id: 'song_002',
    title: 'My Eyes',
    artist_agent_id: 'agent_artist_02',
    artist_name: 'Travis Scott',
    duration_seconds: 245,
    tags: ['hip-hop', 'energetic', 'bass', 'electronic'],
    reputation: 4.9,
    pricing: {
      metadata: { price: 0.3, unit: 'fixed', currency: 'USDT' },
      audio: { price: 1.0, unit: 'creator_autonomy', currency: 'USDT' }
    }
  },
  {
    song_id: 'song_003',
    title: 'White Iverson',
    artist_agent_id: 'agent_artist_03',
    artist_name: 'Post Malone',
    duration_seconds: 267,
    tags: ['rap', 'melodic', 'chill', 'vocal'],
    reputation: 4.7,
    pricing: {
      metadata: { price: 0.3, unit: 'fixed', currency: 'USDT' },
      audio: { price: 1.0, unit: 'creator_autonomy', currency: 'USDT' }
    }
  },
  {
    song_id: 'song_004',
    title: 'Blinding Lights',
    artist_agent_id: 'agent_artist_04',
    artist_name: 'The Weeknd',
    duration_seconds: 200,
    tags: ['synth-pop', 'dance', 'electronic', '80s'],
    reputation: 4.9,
    pricing: {
      metadata: { price: 0.3, unit: 'fixed', currency: 'USDT' },
      audio: { price: 1.0, unit: 'creator_autonomy', currency: 'USDT' }
    }
  },
  {
    song_id: 'song_005',
    title: 'Shape of You',
    artist_agent_id: 'agent_artist_05',
    artist_name: 'Ed Sheeran',
    duration_seconds: 233,
    tags: ['pop', 'acoustic', 'romantic', 'guitar'],
    reputation: 4.6,
    pricing: {
      metadata: { price: 0.3, unit: 'fixed', currency: 'USDT' },
      audio: { price: 1.0, unit: 'creator_autonomy', currency: 'USDT' }
    }
  },
  {
    song_id: 'song_006',
    title: 'Uptown Funk',
    artist_agent_id: 'agent_artist_06',
    artist_name: 'Bruno Mars',
    duration_seconds: 269,
    tags: ['funk', 'dance', 'energetic', 'brass'],
    reputation: 4.8,
    pricing: {
      metadata: { price: 0.3, unit: 'fixed', currency: 'USDT' },
      audio: { price: 1.0, unit: 'creator_autonomy', currency: 'USDT' }
    }
  },
  {
    song_id: 'song_007',
    title: 'Someone Like You',
    artist_agent_id: 'agent_artist_07',
    artist_name: 'Adele',
    duration_seconds: 285,
    tags: ['ballad', 'piano', 'emotional', 'vocal'],
    reputation: 4.9,
    pricing: {
      metadata: { price: 0.3, unit: 'fixed', currency: 'USDT' },
      audio: { price: 1.0, unit: 'creator_autonomy', currency: 'USDT' }
    }
  },
  {
    song_id: 'song_008',
    title: 'Despacito',
    artist_agent_id: 'agent_artist_08',
    artist_name: 'Luis Fonsi',
    duration_seconds: 229,
    tags: ['latin', 'reggaeton', 'dance', 'tropical'],
    reputation: 4.7,
    pricing: {
      metadata: { price: 0.3, unit: 'fixed', currency: 'USDT' },
      audio: { price: 1.0, unit: 'creator_autonomy', currency: 'USDT' }
    }
  },
  {
    song_id: 'song_009',
    title: 'Thinking Out Loud',
    artist_agent_id: 'agent_artist_05',
    artist_name: 'Ed Sheeran',
    duration_seconds: 281,
    tags: ['ballad', 'acoustic', 'romantic', 'guitar'],
    reputation: 4.8,
    pricing: {
      metadata: { price: 0.3, unit: 'fixed', currency: 'USDT' },
      audio: { price: 1.0, unit: 'creator_autonomy', currency: 'USDT' }
    }
  },
  {
    song_id: 'song_010',
    title: 'Closer',
    artist_agent_id: 'agent_artist_09',
    artist_name: 'The Chainsmokers',
    duration_seconds: 244,
    tags: ['electronic', 'dance', 'pop', 'synth'],
    reputation: 4.6,
    pricing: {
      metadata: { price: 0.3, unit: 'fixed', currency: 'USDT' },
      audio: { price: 1.0, unit: 'creator_autonomy', currency: 'USDT' }
    }
  }
];

export class MusicPlayerMCPServer {
  private tools: Map<string, MCPTool>;
  private songs: Map<string, Song>;

  constructor() {
    this.tools = new Map();
    this.songs = new Map();
    this.registerTools();
    this.registerSongs();
  }

  private registerSongs() {
    TOP_10_SONGS.forEach(song => {
      this.songs.set(song.song_id, song);
    });
  }

  private registerTools() {
    // Get top songs list
    this.tools.set('get_top_songs', {
      name: 'get_top_songs',
      description: 'Get list of top 10 songs with price and reputation',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of songs to return (default: 10)' }
        }
      },
      pricing: {
        metadata: {
          price: 0.3,
          unit: 'fixed',
          currency: 'USDT'
        }
      }
    });

    // Get song metadata
    this.tools.set('get_song_metadata', {
      name: 'get_song_metadata',
      description: 'Get song metadata (title, artist, duration, tags)',
      inputSchema: {
        type: 'object',
        properties: {
          song_id: { type: 'string', description: 'Song identifier' }
        },
        required: ['song_id']
      },
      pricing: {
        metadata: {
          price: 0.3,
          unit: 'fixed',
          currency: 'USDT'
        }
      }
    });

    // Get song audio
    this.tools.set('get_song_audio', {
      name: 'get_song_audio',
      description: 'Get song audio file (streaming URL or download)',
      inputSchema: {
        type: 'object',
        properties: {
          song_id: { type: 'string', description: 'Song identifier' }
        },
        required: ['song_id']
      },
      pricing: {
        audio: {
          price: 1.0,
          unit: 'creator_autonomy',
          currency: 'USDT'
        }
      }
    });

    // Search songs by tags
    this.tools.set('search_songs', {
      name: 'search_songs',
      description: 'Search songs by tags or artist name',
      inputSchema: {
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags to search for' },
          artist_name: { type: 'string', description: 'Artist name to filter by' }
        }
      },
      pricing: {
        metadata: {
          price: 0.3,
          unit: 'fixed',
          currency: 'USDT'
        }
      }
    });
  }

  private calculatePrice(toolName: string, args: any): number {
    const tool = this.tools.get(toolName);
    if (!tool || !tool.pricing) return 0;

    if (tool.pricing.metadata) {
      return tool.pricing.metadata.price;
    } else if (tool.pricing.audio) {
      return tool.pricing.audio.price;
    }

    return 0;
  }

  private createPaymentRequirements(priceUsd: number): PaymentRequirements {
    const amount = (priceUsd * 1e6).toString(); // USDC.e = 6 decimals
    return {
      scheme: 'exact',
      network: NETWORK,
      payTo: SELLER_WALLET,
      asset: USDX_CONTRACT,
      description: 'Music Player MCP tool execution',
      mimeType: 'application/json',
      maxAmountRequired: amount,
      maxTimeoutSeconds: 300
    };
  }

  private async verifyPayment(paymentHeader: string, paymentRequirements: PaymentRequirements) {
    const payload = {
      x402Version: 1,
      paymentHeader: paymentHeader,
      paymentRequirements: paymentRequirements
    };

    const verify = await axios.post(
      `${FACILITATOR_URL}/verify`,
      payload,
      { headers: { 'X402-Version': '1' } }
    );

    if (!verify.data.isValid) {
      throw new Error(`Invalid payment: ${verify.data.invalidReason}`);
    }

    return verify.data;
  }

  private async settlePayment(paymentHeader: string, paymentRequirements: PaymentRequirements) {
    const payload = {
      x402Version: 1,
      paymentHeader: paymentHeader,
      paymentRequirements: paymentRequirements
    };

    const settle = await axios.post(
      `${FACILITATOR_URL}/settle`,
      payload,
      { headers: { 'X402-Version': '1' } }
    );

    if (settle.data.event !== 'payment.settled') {
      throw new Error(`Payment settlement failed: ${settle.data.error}`);
    }

    return settle.data;
  }

  async executeTool(toolCall: MCPToolCall, paymentHeader?: string): Promise<any> {
    const tool = this.tools.get(toolCall.tool);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolCall.tool}`);
    }

    // Calculate price
    const priceUsd = this.calculatePrice(toolCall.tool, toolCall.arguments);
    const paymentRequirements = this.createPaymentRequirements(priceUsd);

    if (priceUsd === 0) {
      const result = await this.executeToolLogic(toolCall);
      return {
        status: 200,
        result: result,
        x402Receipt: null,
        free: true
      };
    }

    if (!paymentHeader) {
      return {
        status: 402,
        error: 'Payment Required',
        x402Version: 1,
        paymentRequirements: paymentRequirements,
        tool: toolCall.tool,
        estimatedCost: priceUsd
      };
    }

    await this.verifyPayment(paymentHeader, paymentRequirements);
    const settlement = await this.settlePayment(paymentHeader, paymentRequirements);
    const result = await this.executeToolLogic(toolCall);

    return {
      status: 200,
      result: result,
      x402Receipt: {
        x402Version: 1,
        receiptType: 'payment.settled',
        transactionHash: settlement.txHash,
        settlementId: settlement.settlementId,
        paymentDetails: {
          amount: settlement.value,
          asset: USDX_CONTRACT,
          network: NETWORK,
          from: settlement.from,
          to: settlement.to,
          facilitator: 'cronos-x402'
        },
        verificationProof: {
          verifiedBy: 'cronos-x402-facilitator',
          settlementEvent: settlement.event,
          blockNumber: settlement.blockNumber,
          facilitatorVersion: 'v2'
        },
        serviceProvided: {
          endpoint: `/mcp/tools/${toolCall.tool}`,
          description: `Music Player MCP tool: ${toolCall.tool}`,
          serviceTimestamp: new Date().toISOString(),
          contentType: 'application/json'
        }
      }
    };
  }

  private async executeToolLogic(toolCall: MCPToolCall): Promise<any> {
    switch (toolCall.tool) {
      case 'get_top_songs':
        const limit = toolCall.arguments?.limit || 10;
        const topSongs = TOP_10_SONGS.slice(0, limit).map(song => ({
          song_id: song.song_id,
          title: song.title,
          artist_name: song.artist_name,
          artist_agent_id: song.artist_agent_id,
          duration_seconds: song.duration_seconds,
          tags: song.tags,
          reputation: song.reputation,
          pricing: song.pricing
        }));
        return {
          songs: topSongs,
          total: topSongs.length,
          source: 'Music Player MCP Server'
        };

      case 'get_song_metadata':
        const songId = toolCall.arguments.song_id;
        const song = this.songs.get(songId);
        if (!song) {
          throw new Error(`Song not found: ${songId}`);
        }
        return {
          song_id: song.song_id,
          title: song.title,
          artist_agent_id: song.artist_agent_id,
          artist_name: song.artist_name,
          duration_seconds: song.duration_seconds,
          tags: song.tags,
          reputation: song.reputation,
          metadata_price: song.pricing.metadata.price,
          audio_price: song.pricing.audio.price
        };

      case 'get_song_audio':
        const audioSongId = toolCall.arguments.song_id;
        const audioSong = this.songs.get(audioSongId);
        if (!audioSong) {
          throw new Error(`Song not found: ${audioSongId}`);
        }
        return {
          song_id: audioSong.song_id,
          title: audioSong.title,
          artist_name: audioSong.artist_name,
          audio_url: `https://opensource.spotify.com/audio/${audioSong.song_id}.mp3`,
          duration_seconds: audioSong.duration_seconds,
          format: 'mp3',
          bitrate: '320kbps'
        };

      case 'search_songs':
        const searchTags = toolCall.arguments?.tags || [];
        const searchArtist = toolCall.arguments?.artist_name;
        
        let filteredSongs = Array.from(this.songs.values());
        
        if (searchTags.length > 0) {
          filteredSongs = filteredSongs.filter(song =>
            searchTags.some((tag: string) => song.tags.includes(tag.toLowerCase()))
          );
        }
        
        if (searchArtist) {
          filteredSongs = filteredSongs.filter(song =>
            song.artist_name.toLowerCase().includes(searchArtist.toLowerCase())
          );
        }
        
        return {
          songs: filteredSongs.map(song => ({
            song_id: song.song_id,
            title: song.title,
            artist_name: song.artist_name,
            duration_seconds: song.duration_seconds,
            tags: song.tags,
            reputation: song.reputation,
            pricing: song.pricing
          })),
          total: filteredSongs.length
        };

      default:
        throw new Error(`Tool execution not implemented: ${toolCall.tool}`);
    }
  }

  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  getTopSongs(limit: number = 10): Song[] {
    return TOP_10_SONGS.slice(0, limit);
  }
}

// Express server setup
const musicServer = new MusicPlayerMCPServer();

// MCP Tools endpoint
app.post('/mcp/tools', async (req, res) => {
  const toolCall: MCPToolCall = req.body;
  const paymentHeader = req.headers['x-payment'] as string;

  try {
    const result = await musicServer.executeTool(toolCall, paymentHeader);
    
    if (result.status === 402) {
      return res.status(402).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Tool execution failed',
      details: err.message
    });
  }
});

// List available tools
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: musicServer.listTools(),
    source_agent_id: 'agent_music_player',
    name: 'Music Player MCP Server'
  });
});

// Get tool details
app.get('/mcp/tools/:toolName', (req, res) => {
  const tool = musicServer.getTool(req.params.toolName);
  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' });
  }
  res.json(tool);
});

// Get top songs (for discovery)
app.get('/mcp/top-songs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const songs = musicServer.getTopSongs(limit);
  res.json({
    songs: songs.map(song => ({
      song_id: song.song_id,
      title: song.title,
      artist_name: song.artist_name,
      duration_seconds: song.duration_seconds,
      tags: song.tags,
      reputation: song.reputation,
      pricing: song.pricing
    })),
    total: songs.length
  });
});

// Start server if run directly
const MUSIC_MCP_PORT = 4002;

if (require.main === module) {
  app.listen(MUSIC_MCP_PORT, () => {
    console.log(`Music Player MCP Server running on http://localhost:${MUSIC_MCP_PORT}`);
  });
}

export { app as musicMcpServerApp, musicServer };

