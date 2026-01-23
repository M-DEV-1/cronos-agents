# X402 Payment Module for Cronos
 x402 payment implementation using Cronos X402 facilitator with USDC.e token payments.

## Configuration

### Network: Cronos Testnet
- **Chain ID**: 338
- **RPC URL**: `https://evm-t3.cronos.org`
- **USDC.e Contract**: `0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0`
- **Token**: Bridged USDC (Stargate) - 6 decimals
- **Facilitator**: `https://facilitator.cronoslabs.org/v2/x402`

### Payment Flow

1. **Request** → Server returns HTTP 402 with payment requirements
2. **Sign** → Client generates EIP-3009 signature for USDC transfer
3. **Verify** → Server verifies signature via Cronos facilitator
4. **Settle** → Facilitator executes `transferWithAuthorization` on-chain
5. **Receipt** → Server returns X402 receipt with transaction hash

### Fees

- **Gas Fees**: Handled automatically by Cronos facilitator
- **Payment Amount**: Exact USDC amount specified (no additional fees)
- **Token Decimals**: 6 (1 USDC = 1,000,000 micro-units)

### Example Payment

```typescript
// Price: 0.01 USDC
const amount = Math.floor(0.01 * 1e6).toString(); // "10000" micro-units

// Payment requirements
{
  scheme: 'exact',
  network: 'testnet',
  payTo: '0x...',
  asset: '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0', // USDC.e
  maxAmountRequired: '10000', // 0.01 USDC
  maxTimeoutSeconds: 300
}
```

## Usage

```typescript
import { createX402Handler } from './x402/index.js';

const handler = createX402Handler('testnet');

// Execute with automatic payment
const result = await handler.executeWithPayment(url, requestBody);
```

## Requirements

- `AGENT_PRIVATE_KEY` environment variable (wallet with USDC.e balance)
- USDC.e tokens on Cronos testnet
- Network access to Cronos facilitator


