# X402 Payment Module for Base Sepolia

x402 payment implementation using USDC (ERC-20) token payments on Base Sepolia testnet.

## Configuration

### Network: Base Sepolia Testnet
- **Chain ID**: 84532
- **RPC URL**: `https://sepolia.base.org`
- **Token**: USDC (ERC-20) - 6 decimals
- **USDC Contract Address**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Payment Flow

1. **Request** → Server returns HTTP 402 with payment requirements
2. **Transfer** → Client sends USDC via ERC-20 `transfer()` function
3. **Verify** → Server verifies transaction on-chain
4. **Receipt** → Server returns X402 receipt with transaction hash

### Fees

- **Gas Fees**: Paid by sender in native ETH (Base Sepolia)
- **Payment Amount**: Exact USDC amount specified
- **Token Decimals**: 6 (1 USDC = 10^6 units)

### Example Payment

```typescript
// Price: 0.01 USDC
const amount = ethers.parseUnits("0.01", 6).toString(); // "10000" units (6 decimals)

// Payment requirements
{
  scheme: 'exact',
  network: 'base-sepolia',
  payTo: '0x...',
  asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC contract
  maxAmountRequired: '10000', // 0.01 USDC (6 decimals)
  maxTimeoutSeconds: 300
}
```

## Usage

```typescript
import { createX402Handler } from './x402/index.js';

const handler = createX402Handler('testnet');

// Check USDC balance
const balance = await handler.getBalance();
console.log(`Wallet balance: ${balance} USDC`);

// Check ETH balance (for gas)
const ethBalance = await handler.getEthBalance();
console.log(`ETH balance: ${ethBalance} ETH`);

// Execute with automatic payment
const result = await handler.executeWithPayment(url, requestBody);
```

## Requirements

- `AGENT_PRIVATE_KEY` environment variable (wallet with USDC and ETH balance)
- USDC tokens on Base Sepolia testnet
- Native ETH on Base Sepolia testnet for gas fees
- Network access to Base Sepolia testnet RPC

## Getting Testnet Tokens

- **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **USDC on Base Sepolia**: Use the faucet or bridge from other testnets
- **RPC Endpoint**: `https://sepolia.base.org`
- **Chain ID**: 84532
