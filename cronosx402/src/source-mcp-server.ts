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

export class CryptoComMCPServer {
  private tools: Map<string, MCPTool>;
  private pricing: Map<string, PricingSchema>;

  constructor() {
    this.tools = new Map();
    this.pricing = new Map();
    this.registerTools();
  }

  private registerTools() {
    // Register metadata tool
    this.tools.set('get_metadata', {
      name: 'get_metadata',
      description: 'Get instrument and feed description',
      inputSchema: {
        type: 'object',
        properties: {
          feed_id: { type: 'string', description: 'Feed identifier (e.g., price_btc_usdt)' }
        },
        required: ['feed_id']
      },
      pricing: {
        metadata: {
          price: 0,
          unit: 'fixed',
          currency: 'USDT'
        }
      }
    });

    // Register snapshot tool
    this.tools.set('get_snapshot', {
      name: 'get_snapshot',
      description: 'Get latest price snapshot',
      inputSchema: {
        type: 'object',
        properties: {
          feed_id: { type: 'string', description: 'Feed identifier' }
        },
        required: ['feed_id']
      },
      pricing: {
        snapshot: {
          price: 0.01,
          unit: 'per_request',
          currency: 'USDT'
        }
      }
    });

    // Register stream tool
    this.tools.set('get_stream', {
      name: 'get_stream',
      description: 'Get live price updates (1 second)',
      inputSchema: {
        type: 'object',
        properties: {
          feed_id: { type: 'string', description: 'Feed identifier' },
          duration_seconds: { type: 'number', description: 'Stream duration in seconds' }
        },
        required: ['feed_id', 'duration_seconds']
      },
      pricing: {
        stream_1s: {
          price: 0.05,
          unit: 'per_second',
          currency: 'USDT'
        }
      }
    });

    // Register OHLC tool
    this.tools.set('get_ohlc', {
      name: 'get_ohlc',
      description: 'Get 1-minute OHLC candle data',
      inputSchema: {
        type: 'object',
        properties: {
          feed_id: { type: 'string', description: 'Feed identifier' },
          count: { type: 'number', description: 'Number of candles' }
        },
        required: ['feed_id']
      },
      pricing: {
        ohlc_1m: {
          price: 0.02,
          unit: 'per_candle',
          currency: 'USDT'
        }
      }
    });
  }

  private calculatePrice(toolName: string, args: any): number {
    const tool = this.tools.get(toolName);
    if (!tool || !tool.pricing) return 0;

    // Calculate price based on pricing schema
    if (tool.pricing.snapshot) {
      return tool.pricing.snapshot.price;
    } else if (tool.pricing.stream_1s) {
      const duration = args.duration_seconds || 1;
      return tool.pricing.stream_1s.price * duration;
    } else if (tool.pricing.ohlc_1m) {
      const count = args.count || 1;
      return tool.pricing.ohlc_1m.price * count;
    } else if (tool.pricing.metadata) {
      return tool.pricing.metadata.price;
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
      description: 'Crypto.com MCP tool execution',
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

    // If tool is free (price is 0), execute without payment
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
          description: `Crypto.com MCP tool: ${toolCall.tool}`,
          serviceTimestamp: new Date().toISOString(),
          contentType: 'application/json'
        }
      }
    };
  }

  private async executeToolLogic(toolCall: MCPToolCall): Promise<any> {
    // Mock tool execution
    switch (toolCall.tool) {
      case 'get_metadata':
        return {
          feed_id: toolCall.arguments.feed_id,
          source_agent_id: 'agent_crypto_com',
          exchange_name: 'Crypto.com',
          trading_pair: 'BTC/USDT',
          base_asset: 'BTC',
          quote_asset: 'USDT',
          update_frequency: '1s',
          price_type: 'spot',
          data_license: 'exchange-commercial-feed',
          source_url: 'https://crypto.com/exchange'
        };

      case 'get_snapshot':
        return {
          feed_id: toolCall.arguments.feed_id,
          price: 43250.50,
          timestamp: new Date().toISOString()
        };

      case 'get_stream':
        return {
          feed_id: toolCall.arguments.feed_id,
          prices: Array.from({ length: toolCall.arguments.duration_seconds }, (_, i) => ({
            price: 43250 + Math.random() * 100,
            timestamp: new Date(Date.now() + i * 1000).toISOString()
          }))
        };

      case 'get_ohlc':
        return {
          feed_id: toolCall.arguments.feed_id,
          candles: Array.from({ length: toolCall.arguments.count || 1 }, (_, i) => ({
            open: 43200 + Math.random() * 100,
            high: 43300 + Math.random() * 100,
            low: 43100 + Math.random() * 100,
            close: 43250 + Math.random() * 100,
            timestamp: new Date(Date.now() - i * 60000).toISOString()
          }))
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
}

// Express server setup
const mcpServer = new CryptoComMCPServer();

// MCP Tools endpoint
app.post('/mcp/tools', async (req, res) => {
  const toolCall: MCPToolCall = req.body;
  const paymentHeader = req.headers['x-payment'] as string;

  try {
    const result = await mcpServer.executeTool(toolCall, paymentHeader);
    
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
    tools: mcpServer.listTools(),
    source_agent_id: 'agent_crypto_com',
    name: 'Crypto.com MCP Server'
  });
});

// Get tool details
app.get('/mcp/tools/:toolName', (req, res) => {
  const tool = mcpServer.getTool(req.params.toolName);
  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' });
  }
  res.json(tool);
});

// Start server if run directly
const MCP_PORT = 4001;

if (require.main === module) {
  app.listen(MCP_PORT, () => {
    console.log(`Crypto.com MCP Server running on http://localhost:${MCP_PORT}`);
  });
}

export { app as mcpServerApp, mcpServer };

