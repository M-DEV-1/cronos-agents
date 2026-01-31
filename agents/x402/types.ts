/**
 * x402 Payment Types
 * Type definitions for x402 payment system on Base Sepolia testnet
 */

// USDC contract address on Base Sepolia testnet
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Native token address (address(0) represents native ETH)
export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

export const BASE_CONFIG = {
  mainnet: {
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base mainnet
    currency: 'USDC',
    decimals: 6, // USDC has 6 decimals
  },
  testnet: {
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    usdcAddress: USDC_ADDRESS, // USDC on Base Sepolia testnet
    currency: 'USDC',
    decimals: 6, // USDC has 6 decimals
  },
} as const;

export type BaseNetwork = keyof typeof BASE_CONFIG;

// Legacy alias for backward compatibility
export const CRONOS_CONFIG = BASE_CONFIG;
export type CronosNetwork = BaseNetwork;

// Facilitator URL (Coinbase x402 facilitator for Base)
export const FACILITATOR_URL = 'https://facilitator.cdp.coinbase.com/v2/x402';

// Payment Requirements (returned in 402 response)
export interface PaymentRequirements {
  scheme: 'exact' | 'range';
  network: 'base-sepolia' | 'base-mainnet'; // CAIP-2 format: eip155:84532 or eip155:8453
  payTo: string;
  asset: string; // USDC contract address
  description: string;
  mimeType: string;
  maxAmountRequired: string;
  maxTimeoutSeconds: number;
}

// Pricing schema for tools
export interface PricingTier {
  price: number;
  unit: 'fixed' | 'per_request' | 'per_second' | 'per_item';
  currency: string;
  description?: string;
}

export interface ToolPricing {
  [tier: string]: PricingTier;
}

// Tool wallet mapping
export interface ToolWallet {
  toolName: string;
  walletAddress: string;
  pricing: ToolPricing;
  metadata?: Record<string, any>;
}

// X402 Payment Header (EIP-3009)
export interface X402PaymentHeader {
  x402Version: number;
  scheme: string;
  network: 'base-sepolia' | 'base-mainnet'; // CAIP-2 format: eip155:84532 or eip155:8453
  payload: {
    from: string;
    to: string;
    value: string;
    validAfter: number;
    validBefore: number;
    nonce: string;
    signature: string;
    asset: string; // USDC contract address
  };
}

// X402 Receipt
export interface X402Receipt {
  x402Version: number;
  receiptType: string;
  transactionHash: string;
  settlementId: string;
  paymentDetails: {
    amount: string;
    asset: string;
    network: string;
    from: string;
    to: string;
    facilitator: string;
  };
  verificationProof: {
    verifiedBy: string;
    verificationTimestamp?: string;
    settlementEvent: string;
    blockNumber?: number;
    facilitatorVersion: string;
  };
  serviceProvided: {
    endpoint: string;
    description: string;
    serviceTimestamp: string;
    contentType: string;
  };
  metadata?: Record<string, any>;
}

// Agent Response with payment info
export interface PaidToolResponse<T = any> {
  status: 'success' | 'error' | 'payment_required';
  data?: T;
  paid: boolean;
  cost?: number;
  txHash?: string;
  x402Receipt?: X402Receipt;
  error?: string;
}

// Source agent metadata
export interface SourceAgentMetadata {
  source_agent_id: string;
  name: string;
  description: string;
  walletAddress: string;
  pricing: ToolPricing;
  reputation?: number;
  tags?: string[];
}
