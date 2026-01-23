# X402 Payment Module for Cronos

x402 payment implementation using native TCRO/CRO token payments on Cronos.

## Configuration

### Network: Cronos Testnet
- **Chain ID**: 338
- **RPC URL**: `https://evm-t3.cronos.org`
- **Token**: TCRO (native) - 18 decimals
- **Native Asset Address**: `0x0000000000000000000000000000000000000000`

### Payment Flow

1. **Request** → Server returns HTTP 402 with payment requirements
2. **Transfer** → Client sends native TCRO via `eth_sendTransaction`
3. **Verify** → Server verifies transaction on-chain
4. **Receipt** → Server returns X402 receipt with transaction hash

### Fees

- **Gas Fees**: Paid by sender in TCRO
- **Payment Amount**: Exact TCRO amount specified
- **Token Decimals**: 18 (1 TCRO = 10^18 wei)

### Example Payment

```typescript
// Price: 0.01 TCRO
const amount = ethers.parseEther("0.01").toString(); // "10000000000000000" wei

// Payment requirements
{
  scheme: 'exact',
  network: 'cronos-testnet',
  payTo: '0x...',
  asset: '0x0000000000000000000000000000000000000000', // Native TCRO
  maxAmountRequired: '10000000000000000', // 0.01 TCRO in wei
  maxTimeoutSeconds: 300
}
```

## Usage

```typescript
import { createX402Handler } from './x402/index.js';

const handler = createX402Handler('testnet');

// Check balance
const balance = await handler.getBalance();
console.log(`Wallet balance: ${balance} TCRO`);

// Execute with automatic payment
const result = await handler.executeWithPayment(url, requestBody);
```

## Requirements

- `AGENT_PRIVATE_KEY` environment variable (wallet with TCRO balance)
- TCRO tokens on Cronos testnet (get from [Cronos Testnet Faucet](https://cronos.org/faucet))
- Network access to Cronos testnet RPC
