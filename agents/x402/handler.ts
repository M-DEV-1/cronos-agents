/**
 * X402 Payment Handler
 * Handles x402 payments using Cronos facilitator and EIP-3009 signatures
 */

import { ethers } from 'ethers';
import axios from 'axios';
import {
    PaymentRequirements,
    X402PaymentHeader,
    X402Receipt,
    PaidToolResponse,
    CRONOS_CONFIG,
    FACILITATOR_URL,
    CronosNetwork,
} from './types.js';
import { getToolWallet, getToolPrice } from './wallets.js';

/**
 * X402 Handler for Cronos payments
 */
export class X402Handler {
    private wallet: ethers.Wallet;
    private network: CronosNetwork;
    private facilitatorUrl: string;

    constructor(
        privateKey: string,
        network: CronosNetwork = 'testnet',
        facilitatorUrl: string = FACILITATOR_URL
    ) {
        const config = CRONOS_CONFIG[network];
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, provider);
        this.network = network;
        this.facilitatorUrl = facilitatorUrl;
    }

    /**
     * Get the wallet address
     */
    get address(): string {
        return this.wallet.address;
    }

    /**
     * Get network configuration
     */
    get networkConfig() {
        return CRONOS_CONFIG[this.network];
    }

    /**
     * Generate a random nonce for EIP-3009
     */
    private generateNonce(): string {
        return ethers.hexlify(ethers.randomBytes(32));
    }

    /**
     * Create EIP-3009 payment header for x402
     */
    async createPaymentHeader(paymentRequirements: PaymentRequirements): Promise<string> {
        const { payTo, asset, maxAmountRequired, maxTimeoutSeconds } = paymentRequirements;

        const nonce = this.generateNonce();
        const validAfter = 0;
        const validBefore = Math.floor(Date.now() / 1000) + maxTimeoutSeconds;

        // EIP-712 domain for USDC token on Cronos
        const domain = {
            name: 'Bridged USDC (Stargate)',
            version: '1',
            chainId: this.networkConfig.chainId,
            verifyingContract: asset,
        };

        // EIP-712 typed data for TransferWithAuthorization
        const types = {
            TransferWithAuthorization: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'bytes32' },
            ],
        };

        const message = {
            from: this.wallet.address,
            to: payTo,
            value: maxAmountRequired,
            validAfter,
            validBefore,
            nonce,
        };

        // Sign using EIP-712
        const signature = await this.wallet.signTypedData(domain, types, message);

        // Convert internal network name to facilitator format for payment header
        const facilitatorNetwork = this.network === 'testnet' ? 'cronos-testnet' : 'cronos-mainnet';

        const paymentHeader: X402PaymentHeader = {
            x402Version: 1,
            scheme: 'exact',
            network: facilitatorNetwork,
            payload: {
                from: this.wallet.address,
                to: payTo,
                value: maxAmountRequired,
                validAfter,
                validBefore,
                nonce,
                signature,
                asset,
            },
        };

        return Buffer.from(JSON.stringify(paymentHeader)).toString('base64');
    }

    /**
     * Create payment requirements for a tool
     */
    createPaymentRequirements(
        toolName: string,
        priceTier: string = 'default'
    ): PaymentRequirements | null {
        const toolWallet = getToolWallet(toolName);
        if (!toolWallet) return null;

        const price = getToolPrice(toolName, priceTier);
        if (price === 0) return null; // Free tool

        const amount = Math.floor(price * 1e6).toString(); // Convert to 6 decimals (USDC)

        // Convert internal network name to facilitator format
        const facilitatorNetwork = this.network === 'testnet' ? 'cronos-testnet' : 'cronos-mainnet';

        return {
            scheme: 'exact',
            network: facilitatorNetwork,
            payTo: toolWallet.walletAddress,
            asset: this.networkConfig.usdcContract,
            description: `Payment for ${toolName}`,
            mimeType: 'application/json',
            maxAmountRequired: amount,
            maxTimeoutSeconds: 300,
        };
    }

    /**
     * Verify payment with facilitator
     */
    async verifyPayment(
        paymentHeader: string,
        paymentRequirements: PaymentRequirements
    ): Promise<{ isValid: boolean; invalidReason?: string }> {
        const payload = {
            x402Version: 1,
            paymentHeader,
            paymentRequirements,
        };

        try {
            const response = await axios.post(`${this.facilitatorUrl}/verify`, payload, {
                headers: { 'X402-Version': '1' },
            });

            return response.data;
        } catch (error: any) {
            console.error('[x402] Verify payment error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
            });
            throw error;
        }
    }

    /**
     * Settle payment with facilitator
     */
    async settlePayment(
        paymentHeader: string,
        paymentRequirements: PaymentRequirements
    ): Promise<{
        event: string;
        txHash: string;
        settlementId: string;
        value: string;
        from: string;
        to: string;
        blockNumber?: number;
        timestamp?: string;
    }> {
        const payload = {
            x402Version: 1,
            paymentHeader,
            paymentRequirements,
        };

        try {
            const response = await axios.post(`${this.facilitatorUrl}/settle`, payload, {
                headers: { 'X402-Version': '1' },
            });

            if (response.data.event !== 'payment.settled') {
                throw new Error(`Settlement failed: ${response.data.error || 'Unknown error'}`);
            }

            return response.data;
        } catch (error: any) {
            console.error('[x402] Settle payment error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
            });
            throw error;
        }
    }

    /**
     * Execute a paid request with automatic payment handling
     */
    async executeWithPayment<T>(
        url: string,
        requestBody: any = {},
        options: { maxRetries?: number } = {}
    ): Promise<PaidToolResponse<T>> {
        const { maxRetries = 1 } = options;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Initial request
                let response;
                try {
                    response = await axios.post(url, requestBody, {
                        headers: {
                            'X402-Version': '1',
                            'Content-Type': 'application/json',
                        },
                    });

                    // If successful, return data
                    if (response.status === 200) {
                        return {
                            status: 'success',
                            data: response.data,
                            paid: false,
                            cost: 0,
                        };
                    }
                } catch (err: any) {
                    if (err.response?.status === 402) {
                        response = err.response;
                    } else {
                        throw err;
                    }
                }

                // Handle 402 Payment Required
                if (response.status === 402) {
                    const paymentRequirements = response.data.paymentRequirements as PaymentRequirements;

                    // Skip payment if free
                    if (parseInt(paymentRequirements.maxAmountRequired) === 0) {
                        const retryResponse = await axios.post(url, requestBody, {
                            headers: {
                                'X402-Version': '1',
                                'Content-Type': 'application/json',
                            },
                        });
                        return {
                            status: 'success',
                            data: retryResponse.data,
                            paid: false,
                            cost: 0,
                        };
                    }

                    // Generate payment header
                    const paymentHeader = await this.createPaymentHeader(paymentRequirements);

                    // Retry with payment
                    const paidResponse = await axios.post(url, requestBody, {
                        headers: {
                            'X-Payment': paymentHeader,
                            'X402-Version': '1',
                            'Content-Type': 'application/json',
                        },
                    });

                    const cost = parseInt(paymentRequirements.maxAmountRequired) / 1e6;

                    return {
                        status: 'success',
                        data: paidResponse.data.data || paidResponse.data,
                        paid: true,
                        cost,
                        txHash: paidResponse.data.txHash,
                        x402Receipt: paidResponse.data.x402Receipt,
                    };
                }

                return { status: 'success', data: response.data, paid: false };
            } catch (err: any) {
                if (attempt === maxRetries) {
                    return {
                        status: 'error',
                        paid: false,
                        error: err.message || 'Request failed',
                    };
                }
            }
        }

        return { status: 'error', paid: false, error: 'Max retries exceeded' };
    }
}

/**
 * Factory function to create handler from environment
 */
export function createX402Handler(network: CronosNetwork = 'testnet'): X402Handler {
    const privateKey = process.env.AGENT_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('AGENT_PRIVATE_KEY environment variable is required');
    }
    return new X402Handler(privateKey, network);
}
