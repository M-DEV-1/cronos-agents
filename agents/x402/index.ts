/**
 * x402 Payment Module
 * Exports all x402 payment functionality for use in agents
 */

// Types
export {
    BASE_CONFIG,
    CRONOS_CONFIG, // Legacy alias
    USDC_ADDRESS,
    FACILITATOR_URL,
    NATIVE_TOKEN_ADDRESS,
    type BaseNetwork,
    type CronosNetwork, // Legacy alias
    type PaymentRequirements,
    type PricingTier,
    type ToolPricing,
    type ToolWallet,
    type X402PaymentHeader,
    type X402Receipt,
    type PaidToolResponse,
    type SourceAgentMetadata,
} from './types.js';

// Wallet registry
export {
    TOOL_WALLETS,
    getToolWallet,
    getToolPrice,
    isToolPaid,
    getPaidTools,
    getFreeTools,
} from './wallets.js';

// Handler
export { X402Handler, createX402Handler } from './handler.js';
