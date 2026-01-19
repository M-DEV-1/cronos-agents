// Type definitions for x402 system

export interface PaymentRequirements {
  scheme: 'exact' | 'range';
  network: string;
  payTo: string;
  asset: string;
  description: string;
  mimeType: string;
  maxAmountRequired: string;
  maxTimeoutSeconds: number;
}

export interface SourceMetadata {
  feed_id?: string;
  source_agent_id: string;
  exchange_name?: string;
  trading_pair?: string;
  base_asset?: string;
  quote_asset?: string;
  update_frequency?: string;
  price_type?: string;
  data_license?: string;
  source_url?: string;
  song_id?: string;
  title?: string;
  artist_agent_id?: string;
  artist_name?: string;
  duration_seconds?: number;
  tags?: string[];
}

export interface PricingSchema {
  metadata?: {
    price: number;
    unit: 'fixed' | 'per_request' | 'per_second' | 'per_candle' | 'creator_autonomy';
    currency: string;
  };
  snapshot?: {
    price: number;
    unit: 'fixed' | 'per_request' | 'per_second' | 'per_candle' | 'creator_autonomy';
    currency: string;
  };
  stream_1s?: {
    price: number;
    unit: 'fixed' | 'per_request' | 'per_second' | 'per_candle' | 'creator_autonomy';
    currency: string;
  };
  ohlc_1m?: {
    price: number;
    unit: 'fixed' | 'per_request' | 'per_second' | 'per_candle' | 'creator_autonomy';
    currency: string;
  };
  audio?: {
    price: number;
    unit: 'fixed' | 'per_request' | 'per_second' | 'per_candle' | 'creator_autonomy';
    currency: string;
  };
}

export interface SourceOption {
  source_agent_id: string;
  name: string;
  metadata: SourceMetadata;
  pricing_schema: PricingSchema;
  reputation?: number;
}

export interface UserPrompt {
  prompt: string;
  source_policy?: {
    allowed_sources?: string[];
    max_budget?: number;
    preferred_currency?: string;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  pricing?: PricingSchema;
}

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, any>;
}

export interface SourcePolicy {
  allowed_sources: string[];
  max_budget: number;
  preferred_currency: string;
  require_metadata: boolean;
}

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
    facilitator?: string;
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

export interface AgentResponse {
  ok: boolean;
  paid: boolean;
  txHash?: string;
  settlementId?: string;
  x402Receipt?: X402Receipt;
  data?: any;
  source?: string;
  cost?: number;
  proof_hash?: string;
}

