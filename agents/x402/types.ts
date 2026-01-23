/**
 * x402 Payment Types
 * Type definitions for x402 payment system on Cronos
 */

// Network configuration
export const CRONOS_CONFIG = {
  mainnet: {
    chainId: 25,
    rpcUrl: 'https://evm.cronos.org',
    usdcContract: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59', // USDC on Cronos mainnet
  },
  testnet: {
    chainId: 338,
    rpcUrl: 'https://evm-t3.cronos.org',
    usdcContract: '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0', // USDC.e on testnet
  },
} as const;

export type CronosNetwork = keyof typeof CRONOS_CONFIG;

// Facilitator URL
export const FACILITATOR_URL = 'https://facilitator.cronoslabs.org/v2/x402';

// Payment Requirements (returned in 402 response)
export interface PaymentRequirements {
  scheme: 'exact' | 'range';
  network: 'cronos-testnet' | 'cronos-mainnet'; // Facilitator expects full network name
  payTo: string;
  asset: string;
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
  network: 'cronos-testnet' | 'cronos-mainnet'; // Facilitator expects full network name
  payload: {
    from: string;
    to: string;
    value: string;
    validAfter: number;
    validBefore: number;
    nonce: string;
    signature: string;
    asset: string;
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
