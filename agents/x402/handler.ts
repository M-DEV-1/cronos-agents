/**
 * X402 Payment Handler
 * Handles x402 payments using USDC (ERC-20) transfers on Base Sepolia testnet
 */

import { ethers } from 'ethers';
import axios from 'axios';
import {
    PaymentRequirements,
    X402PaymentHeader,
    X402Receipt,
    PaidToolResponse,
    BASE_CONFIG,
    CRONOS_CONFIG,
    FACILITATOR_URL,
    BaseNetwork,
    CronosNetwork,
    USDC_ADDRESS,
} from './types.js';
import { getToolWallet, getToolPrice } from './wallets.js';

// ERC-20 ABI for USDC transfers
const ERC20_ABI = [
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
];

/**
 * X402 Handler for Base Sepolia USDC (ERC-20) payments
 * Uses ERC-20 token transfers for USDC payments
 */
export class X402Handler {
    private wallet: ethers.Wallet;
    private network: BaseNetwork;
    private facilitatorUrl: string;
    private usdcContract: ethers.Contract;

    constructor(
        privateKey: string,
        network: BaseNetwork = 'testnet',
        facilitatorUrl: string = FACILITATOR_URL
    ) {
        const config = BASE_CONFIG[network];
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, provider);
        this.network = network;
        this.facilitatorUrl = facilitatorUrl;
        // Initialize USDC contract
        this.usdcContract = new ethers.Contract(config.usdcAddress, ERC20_ABI, this.wallet);
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
        return BASE_CONFIG[this.network];
    }

    /**
     * Get the USDC token balance
     */
    async getBalance(): Promise<string> {
        const balance = await this.usdcContract.balanceOf(this.wallet.address);
        const decimals = await this.usdcContract.decimals();
        return ethers.formatUnits(balance, decimals);
    }

    /**
     * Get the native ETH balance (for gas)
     */
    async getEthBalance(): Promise<string> {
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
     * Create payment header for USDC (ERC-20) transfer
     * Uses EIP-3009 compatible structure for ERC-20 tokens
     */
    async createPaymentHeader(paymentRequirements: PaymentRequirements): Promise<string> {
        const { payTo, maxAmountRequired, maxTimeoutSeconds, asset } = paymentRequirements;

        const nonce = this.generateNonce();
        const validBefore = Math.floor(Date.now() / 1000) + maxTimeoutSeconds;

        // Convert internal network name to facilitator format (CAIP-2)
        const facilitatorNetwork = this.network === 'testnet' ? 'base-sepolia' : 'base-mainnet';

        // For ERC-20 tokens, we sign a message with the token address
        const message = ethers.solidityPackedKeccak256(
            ['address', 'address', 'address', 'uint256', 'uint256', 'bytes32'],
            [this.wallet.address, payTo, asset, maxAmountRequired, validBefore, nonce]
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
                asset: asset, // USDC contract address
            },
        };

        return Buffer.from(JSON.stringify(paymentHeader)).toString('base64');
    }

    /**
     * Create payment requirements for a tool using USDC
     */
    createPaymentRequirements(
        toolName: string,
        priceTier: string = 'default'
    ): PaymentRequirements | null {
        const toolWallet = getToolWallet(toolName);
        if (!toolWallet) return null;

        const price = getToolPrice(toolName, priceTier);
        if (price === 0) return null; // Free tool

        // Convert to USDC units (6 decimals for USDC)
        const amount = ethers.parseUnits(price.toString(), 6).toString();

        // Convert internal network name to facilitator format (CAIP-2)
        const facilitatorNetwork = this.network === 'testnet' ? 'base-sepolia' : 'base-mainnet';

        return {
            scheme: 'exact',
            network: facilitatorNetwork,
            payTo: toolWallet.walletAddress,
            asset: this.networkConfig.usdcAddress, // USDC contract address
            description: `Payment for ${toolName}`,
            mimeType: 'application/json',
            maxAmountRequired: amount,
            maxTimeoutSeconds: 300,
        };
    }

    /**
     * Execute USDC (ERC-20) token transfer
     * This is the core payment method for USDC on Base Sepolia
     */
    async sendUSDCPayment(
        to: string,
        amountUnits: string
    ): Promise<{ txHash: string; from: string; to: string; value: string; blockNumber?: number }> {
        const decimals = await this.usdcContract.decimals();
        const amountFormatted = ethers.formatUnits(amountUnits, decimals);
        console.log(`[x402] Sending ${amountFormatted} USDC to ${to}...`);

        // Execute ERC-20 transfer
        const tx = await this.usdcContract.transfer(to, amountUnits);

        console.log(`[x402] Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`[x402] Transaction confirmed in block ${receipt?.blockNumber}`);

        return {
            txHash: tx.hash,
            from: this.wallet.address,
            to,
            value: amountUnits,
            blockNumber: receipt?.blockNumber,
        };
    }

    /**
     * Verify payment header (for receiving payments)
     * For ERC-20 tokens, verifies signature and payment authorization
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

            if (decoded.payload.asset.toLowerCase() !== paymentRequirements.asset.toLowerCase()) {
                return { isValid: false, invalidReason: 'Asset mismatch' };
            }

            if (BigInt(decoded.payload.value) < BigInt(paymentRequirements.maxAmountRequired)) {
                return { isValid: false, invalidReason: 'Insufficient payment amount' };
            }

            // For ERC-20 tokens, verify the signature with token address
            const message = ethers.solidityPackedKeccak256(
                ['address', 'address', 'address', 'uint256', 'uint256', 'bytes32'],
                [decoded.payload.from, decoded.payload.to, decoded.payload.asset, decoded.payload.value, decoded.payload.validBefore, decoded.payload.nonce]
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
     * Settle payment - for USDC, this executes the actual ERC-20 transfer
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
            // For USDC, execute ERC-20 transfer
            const result = await this.sendUSDCPayment(
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

                    // Cost in USDC (6 decimals)
                    const cost = parseFloat(ethers.formatUnits(paymentRequirements.maxAmountRequired, 6));

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
export function createX402Handler(network: BaseNetwork = 'testnet'): X402Handler {
    const privateKey = process.env.AGENT_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('AGENT_PRIVATE_KEY environment variable is required');
    }
    return new X402Handler(privateKey, network);
}
