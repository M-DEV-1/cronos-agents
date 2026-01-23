/**
 * X402 Payment Handler
 * Handles x402 payments using native TCRO transfers on Cronos Testnet
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
    NATIVE_TOKEN_ADDRESS,
} from './types.js';
import { getToolWallet, getToolPrice } from './wallets.js';

/**
 * X402 Handler for Cronos native token (TCRO/CRO) payments
 * Uses direct wallet transfers instead of EIP-3009 for native tokens
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
     * Get the native token balance
     */
    async getBalance(): Promise<string> {
        const balance = await this.wallet.provider!.getBalance(this.wallet.address);
        return ethers.formatEther(balance);
    }

    /**
     * Generate a random nonce for tracking
     */
    private generateNonce(): string {
        return ethers.hexlify(ethers.randomBytes(32));
    }

    /**
     * Create payment header for native token transfer
     * For native tokens, this is a simpler structure than EIP-3009
     */
    async createPaymentHeader(paymentRequirements: PaymentRequirements): Promise<string> {
        const { payTo, maxAmountRequired, maxTimeoutSeconds } = paymentRequirements;

        const nonce = this.generateNonce();
        const validBefore = Math.floor(Date.now() / 1000) + maxTimeoutSeconds;

        // Convert internal network name to facilitator format
        const facilitatorNetwork = this.network === 'testnet' ? 'cronos-testnet' : 'cronos-mainnet';

        // For native tokens, we sign a simple message instead of EIP-712
        const message = ethers.solidityPackedKeccak256(
            ['address', 'address', 'uint256', 'uint256', 'bytes32'],
            [this.wallet.address, payTo, maxAmountRequired, validBefore, nonce]
        );
        const signature = await this.wallet.signMessage(ethers.getBytes(message));

        const paymentHeader: X402PaymentHeader = {
            x402Version: 1,
            scheme: 'exact',
            network: facilitatorNetwork,
            payload: {
                from: this.wallet.address,
                to: payTo,
                value: maxAmountRequired,
                validAfter: 0,
                validBefore,
                nonce,
                signature,
                asset: NATIVE_TOKEN_ADDRESS, // Native token
            },
        };

        return Buffer.from(JSON.stringify(paymentHeader)).toString('base64');
    }

    /**
     * Create payment requirements for a tool using native TCRO
     */
    createPaymentRequirements(
        toolName: string,
        priceTier: string = 'default'
    ): PaymentRequirements | null {
        const toolWallet = getToolWallet(toolName);
        if (!toolWallet) return null;

        const price = getToolPrice(toolName, priceTier);
        if (price === 0) return null; // Free tool

        // Convert to wei (18 decimals for native TCRO)
        const amount = ethers.parseEther(price.toString()).toString();

        // Convert internal network name to facilitator format
        const facilitatorNetwork = this.network === 'testnet' ? 'cronos-testnet' : 'cronos-mainnet';

        return {
            scheme: 'exact',
            network: facilitatorNetwork,
            payTo: toolWallet.walletAddress,
            asset: NATIVE_TOKEN_ADDRESS, // Native TCRO
            description: `Payment for ${toolName}`,
            mimeType: 'application/json',
            maxAmountRequired: amount,
            maxTimeoutSeconds: 300,
        };
    }

    /**
     * Execute native token transfer directly (bypasses facilitator)
     * This is the core payment method for TCRO
     */
    async sendNativePayment(
        to: string,
        amountWei: string
    ): Promise<{ txHash: string; from: string; to: string; value: string; blockNumber?: number }> {
        console.log(`[x402] Sending ${ethers.formatEther(amountWei)} TCRO to ${to}...`);

        const tx = await this.wallet.sendTransaction({
            to,
            value: amountWei,
        });

        console.log(`[x402] Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`[x402] Transaction confirmed in block ${receipt?.blockNumber}`);

        return {
            txHash: tx.hash,
            from: this.wallet.address,
            to,
            value: amountWei,
            blockNumber: receipt?.blockNumber,
        };
    }

    /**
     * Verify payment header (for receiving payments)
     * For native tokens, we may skip facilitator verification
     */
    async verifyPayment(
        paymentHeader: string,
        paymentRequirements: PaymentRequirements
    ): Promise<{ isValid: boolean; invalidReason?: string }> {
        try {
            // Decode the payment header
            const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString()) as X402PaymentHeader;

            // Basic validation
            if (decoded.payload.to !== paymentRequirements.payTo) {
                return { isValid: false, invalidReason: 'Recipient mismatch' };
            }

            if (BigInt(decoded.payload.value) < BigInt(paymentRequirements.maxAmountRequired)) {
                return { isValid: false, invalidReason: 'Insufficient payment amount' };
            }

            // For native tokens, verify the signature
            const message = ethers.solidityPackedKeccak256(
                ['address', 'address', 'uint256', 'uint256', 'bytes32'],
                [decoded.payload.from, decoded.payload.to, decoded.payload.value, decoded.payload.validBefore, decoded.payload.nonce]
            );

            const recoveredAddress = ethers.verifyMessage(ethers.getBytes(message), decoded.payload.signature);

            if (recoveredAddress.toLowerCase() !== decoded.payload.from.toLowerCase()) {
                return { isValid: false, invalidReason: 'Invalid signature' };
            }

            // Check expiry
            if (decoded.payload.validBefore < Math.floor(Date.now() / 1000)) {
                return { isValid: false, invalidReason: 'Payment authorization expired' };
            }

            return { isValid: true };
        } catch (error: any) {
            console.error('[x402] Verify payment error:', error.message);
            return { isValid: false, invalidReason: error.message };
        }
    }

    /**
     * Settle payment - for native tokens, this executes the actual transfer
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
        try {
            // For native TCRO, execute direct transfer
            const result = await this.sendNativePayment(
                paymentRequirements.payTo,
                paymentRequirements.maxAmountRequired
            );

            return {
                event: 'payment.settled',
                txHash: result.txHash,
                settlementId: `settle-${Date.now()}-${result.txHash.slice(0, 8)}`,
                value: result.value,
                from: result.from,
                to: result.to,
                blockNumber: result.blockNumber,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error('[x402] Settle payment error:', {
                message: error.message,
            });
            throw new Error(`Settlement failed: ${error.message}`);
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
                    if (BigInt(paymentRequirements.maxAmountRequired) === 0n) {
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

                    // Cost in TCRO (18 decimals)
                    const cost = parseFloat(ethers.formatEther(paymentRequirements.maxAmountRequired));

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
