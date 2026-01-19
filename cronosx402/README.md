# X402 Agent Payment System

X402 implementation with full A2UI (Agent-to-User Interface) support, featuring source discovery, MCP server integration, and automatic payment handling via Cronos X402 facilitator.

## What is X402?

X402 is a protocol for machine-payable APIs. Servers return HTTP 402 (Payment Required) responses with payment requirements, and clients automatically sign and submit payments using EIP-3009 signatures. The Cronos X402 facilitator verifies signatures and settles payments on-chain.

## Architecture

The system consists of four main components:

1. **A2UI Server** - Web interface for users to submit prompts and select sources
2. **User Agent** - Interprets user intent, discovers sources, and executes tool calls
3. **Source MCP Servers** - Expose tools and enforce pricing (e.g., Crypto.com, Music Player)
4. **X402 Handler** - Handles payment signing, settlement, and retry logic

```
User → A2UI → User Agent → MCP Server → [402 Payment] → X402 Handler → Facilitator → Blockchain
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- USDC.e tokens on Cronos testnet (for payments)
- Wallet with private key

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```env
SELLER_WALLET=0xYourSellerWalletAddress
AGENT_PRIVATE_KEY=YourBuyerPrivateKey
```

### Run

Start all services:

```bash
npm run dev:full
```

This starts:
- A2UI Server: http://localhost:3000
- Crypto.com MCP: http://localhost:4001
- Music Player MCP: http://localhost:4002

Open http://localhost:3000 in your browser.

## Usage

### Web Interface

1. Enter a prompt (e.g., "Get BTC price" or "Best song of 2010 decade")
2. Set your budget
3. Select a source from available options
4. Execute and view results with cost breakdown

### API

Submit prompt:
```bash
curl -X POST http://localhost:3000/api/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Get BTC price", "source_policy": {"max_budget": 1.0}}'
```

Execute with source:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Get BTC price", "selected_source_id": "agent_crypto_com"}'
```

## Available Sources

### Crypto.com MCP Server

Provides crypto price data:
- `get_metadata` - Instrument info (free)
- `get_snapshot` - Latest price (0.01 USDT)
- `get_stream` - Live updates (0.05 USDT/sec)
- `get_ohlc` - OHLC candles (0.02 USDT/candle)

### Music Player MCP Server

Provides music catalog:
- `get_top_songs` - Top 10 songs with prices (0.3 USDT)
- `get_song_metadata` - Song details (0.3 USDT)
- `get_song_audio` - Audio URL (1.0 USDT)
- `search_songs` - Search by tags/artist (0.3 USDT)

## Payment Flow

1. User Agent makes request to MCP server
2. Server returns 402 with payment requirements
3. X402 Handler generates EIP-3009 signature
4. Request retried with X-Payment header
5. Server verifies via Cronos facilitator
6. Facilitator settles on-chain
7. Server returns data + X402 receipt

Free tools (price = 0) skip payment automatically.

## Project Structure

```
src/
  a2ui-server.ts      - Web server and API endpoints
  user-agent.ts       - Intent interpretation and source discovery
  x402-handler.ts     - Payment signing and retry logic
  source-mcp-server.ts - Crypto.com MCP implementation
  music-mcp-server.ts - Music Player MCP implementation
  types.ts            - TypeScript type definitions

public/
  index.html          - Web UI
```

## Adding New Sources

1. Create a new MCP server class (extend the pattern from `source-mcp-server.ts`)
2. Register in `user-agent.ts`:
   ```typescript
   this.availableSources.set('agent_my_source', 'http://localhost:4003');
   ```
3. Expose tools via `/mcp/tools` endpoint
4. Implement pricing and payment verification

## Development

Build:
```bash
npm run build
```

Run individual services:
```bash
npm run start:a2ui   # A2UI server only
npm run start:mcp    # Crypto.com MCP only
npm run start:music  # Music Player MCP only
