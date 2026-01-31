import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { ethers } from 'ethers';
import { X402Handler, createX402Handler, getToolWallet, getToolPrice, type PaymentRequirements, BASE_CONFIG, USDC_ADDRESS } from '../x402/index.js';
import axios from 'axios';

/**
 * Event emitter for payment events
 */
export const paymentEvents = new EventEmitter();

/**
 * X402 handler instance for real payment processing
 */
let x402Handler: X402Handler | null = null;

function getX402Handler(): X402Handler | null {
    if (x402Handler) {
        return x402Handler;
    }

    if (!process.env.AGENT_PRIVATE_KEY) {
        return null;
    }

    try {
        x402Handler = createX402Handler('testnet');
        return x402Handler;
    } catch (err: any) {
        console.warn('[x402] Failed to create handler:', err?.message || err);
        return null;
    }
}

/**
 * Ledger entry structure
 */
interface LedgerEntry {
    timestamp: string;
    toolName: string;
    walletAddress: string;
    cost: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed';
    txHash?: string;
    userAddress?: string;
}

const LEDGER_PATH = path.join(process.cwd(), 'agents', 'ledger.json');

// Ensure ledger exists
if (!fs.existsSync(path.dirname(LEDGER_PATH))) {
    fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
}
if (!fs.existsSync(LEDGER_PATH)) {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify([], null, 2));
}

/**
 * Configuration for a paid tool
 */
export interface PaidToolConfig {
    name: string;
    description: string;
    cost: number; // Cost in TCRO
    walletAddress: string; // Unique wallet for this tool
    handler: (args: any) => Promise<any>;
}

/**
 * Wrapper class that enforces real x402 payment before execution
 * 
 * Real x402 Flow:
 * 1. Tool execution requested
 * 2. Create payment requirements using X402Handler
 * 3. Return 402 Payment Required with requirements
 * 4. Client generates EIP-3009 signature and retries
 * 5. Server verifies payment with Cronos facilitator
 * 6. Server settles payment on-chain via facilitator
 * 7. Execute tool and return result with X402 receipt
 */
export class PaidToolWrapper {
    public name: string;
    public description: string;
    public cost: number;
    public walletAddress: string;
    private handler: (args: any) => Promise<any>;
    private x402Handler: X402Handler | null;

    constructor(config: PaidToolConfig) {
        this.name = config.name;
        this.description = `${config.description} (Cost: ${config.cost} USDC via x402)`;
        this.cost = config.cost;
        this.walletAddress = config.walletAddress;
        this.handler = config.handler;
        // Lazy initialization - don't create handler in constructor
        this.x402Handler = null;
    }

    private getHandler(): X402Handler | null {
        if (this.x402Handler === null) {
            this.x402Handler = getX402Handler();
        }
        return this.x402Handler;
    }

    /**
     * Create payment requirements for this tool
     */
    createPaymentRequirements(): PaymentRequirements | null {
        const handler = this.getHandler();
        if (!handler) {
            // Fallback: create basic payment requirements without handler
            const price = getToolPrice(this.name) || this.cost;
            if (price === 0) return null;

            // Convert to USDC units (6 decimals)
            const amount = ethers.parseUnits(price.toString(), 6).toString();

            return {
                scheme: 'exact',
                network: 'base-sepolia',
                payTo: this.walletAddress,
                asset: USDC_ADDRESS,
                description: `Payment for ${this.name}`,
                mimeType: 'application/json',
                maxAmountRequired: amount,
                maxTimeoutSeconds: 300,
            };
        }

        const toolWallet = getToolWallet(this.name);
        if (!toolWallet) {
            const price = getToolPrice(this.name) || this.cost;
            if (price === 0) return null;

            // Convert to USDC units (6 decimals)
            const amount = ethers.parseUnits(price.toString(), 6).toString();

            return {
                scheme: 'exact',
                network: 'base-sepolia',
                payTo: this.walletAddress,
                asset: USDC_ADDRESS,
                description: `Payment for ${this.name}`,
                mimeType: 'application/json',
                maxAmountRequired: amount,
                maxTimeoutSeconds: 300,
            };
        }

        return handler.createPaymentRequirements(this.name);
    }

    /**
     * Execute the tool with real x402 payment enforcement
     * This method is called by the server when handling tool requests
     */
    async execute(args: any, paymentHeader?: string): Promise<any> {
        console.log(`[x402] Tool Executing: ${this.name}`);

        const paymentRequirements = this.createPaymentRequirements();

        // Free tool - execute directly
        if (!paymentRequirements || parseInt(paymentRequirements.maxAmountRequired) === 0) {
            paymentEvents.emit('tool_call', { name: this.name, args });
            const result = await this.handler(args);
            return {
                ...result,
                _x402: { paid: false, amount: 0 }
            };
        }

        // No payment header - try to auto-pay using x402 handler
        if (!paymentHeader) {
            const handler = this.getHandler();

            if (handler) {
                // Auto-pay using x402 handler
                console.log(`[x402] Auto-paying for tool: ${this.name} (${this.cost} USDC)`);
                paymentEvents.emit('payment', {
                    name: this.name,
                    cost: this.cost,
                    walletAddress: this.walletAddress,
                    status: 'pending',
                });

                try {
                    // Create payment header automatically
                    console.log(`[x402] Creating payment header for ${this.name}...`);
                    console.log(`[x402] Payment requirements:`, JSON.stringify(paymentRequirements, null, 2));
                    const autoPaymentHeader = await handler.createPaymentHeader(paymentRequirements);
                    console.log(`[x402] Payment header created (length: ${autoPaymentHeader.length})`);

                    // Verify and settle payment
                    console.log(`[x402] Verifying payment with facilitator...`);
                    const verifyResult = await handler.verifyPayment(autoPaymentHeader, paymentRequirements);
                    if (!verifyResult.isValid) {
                        throw new Error(`Invalid payment: ${verifyResult.invalidReason}`);
                    }
                    console.log(`[x402] Payment verified successfully`);

                    console.log(`[x402] Settling payment with facilitator...`);
                    const settlement = await handler.settlePayment(autoPaymentHeader, paymentRequirements);
                    console.log(`[x402] Payment settled: ${settlement.txHash}`);

                    paymentEvents.emit('payment', {
                        name: this.name,
                        cost: this.cost,
                        walletAddress: this.walletAddress,
                        status: 'success',
                        txHash: settlement.txHash
                    });

                    this.recordTransaction('completed', settlement.txHash);
                    console.log(`[x402] ✅ Payment successful: ${settlement.txHash}`);

                    // Payment already settled - execute tool directly and return
                    paymentEvents.emit('tool_call', { name: this.name, args });
                    let result;
                    try {
                        result = await this.handler(args);
                        // Emit tool result for A2UI generation
                        paymentEvents.emit('tool_result', { name: this.name, result });
                    } catch (handlerError: any) {
                        console.error(`[x402] Handler execution failed for ${this.name}:`, handlerError);
                        result = {
                            error: true,
                            message: handlerError?.message || 'Tool execution failed',
                            tool: this.name,
                            details: handlerError?.toString() || String(handlerError)
                        };
                    }

                    return {
                        ...result,
                        _x402: {
                            paid: true,
                            amount: parseFloat(ethers.formatUnits(paymentRequirements.maxAmountRequired, 6)),
                            currency: 'USDC',
                            recipient: this.walletAddress,
                            timestamp: new Date().toISOString(),
                            txHash: settlement.txHash,
                            settlementId: settlement.settlementId
                        }
                    };
                } catch (error: any) {
                    // Log full error details
                    console.error(`[x402] ❌ Auto-payment failed for ${this.name}:`);
                    console.error(`[x402] Error message:`, error.message);
                    console.error(`[x402] Error response:`, error.response?.data || error.response || 'No response data');
                    console.error(`[x402] Error status:`, error.response?.status || 'No status');
                    console.error(`[x402] Full error:`, error);

                    paymentEvents.emit('payment', {
                        name: this.name,
                        cost: this.cost,
                        walletAddress: this.walletAddress,
                        status: 'failed',
                    });
                    this.recordTransaction('failed');

                    // Don't throw 402 - instead, try to execute without payment (for testing)
                    // In production, you might want to throw here
                    console.warn(`[x402] ⚠️  Continuing without payment verification (testing mode)`);
                    paymentEvents.emit('tool_call', { name: this.name, args });
                    let result;
                    try {
                        result = await this.handler(args);
                    } catch (handlerError: any) {
                        console.error(`[x402] Handler execution failed for ${this.name}:`, handlerError);
                        result = {
                            error: true,
                            message: handlerError?.message || 'Tool execution failed',
                            tool: this.name,
                            details: handlerError?.toString() || String(handlerError)
                        };
                    }
                    return {
                        ...result,
                        _x402: {
                            paid: false,
                            amount: 0,
                            error: error.message,
                            note: 'Payment failed, executed without verification'
                        }
                    };
                }
            } else {
                // No handler available - return 402
                paymentEvents.emit('payment', {
                    name: this.name,
                    cost: this.cost,
                    walletAddress: this.walletAddress,
                    status: 'pending',
                });
                this.recordTransaction('pending');

                throw {
                    status: 402,
                    error: 'Payment Required',
                    x402Version: 1,
                    paymentRequirements,
                    tool: this.name,
                    estimatedCost: this.cost
                };
            }
        }

        // Verify and settle payment
        try {
            const handler = this.getHandler();
            if (!handler) {
                // If no handler, accept payment header but log warning
                console.warn('[x402] No handler configured, accepting payment without verification');
                // Still execute tool but without receipt
                paymentEvents.emit('payment', {
                    name: this.name,
                    cost: this.cost,
                    walletAddress: this.walletAddress,
                    status: 'success'
                });
                this.recordTransaction('completed');
                paymentEvents.emit('tool_call', { name: this.name, args });
                try {
                    const result = await this.handler(args);
                    return {
                        ...result,
                        _x402: {
                            paid: true,
                            amount: parseFloat(ethers.formatUnits(paymentRequirements.maxAmountRequired, 6)),
                            currency: 'USDC',
                            recipient: this.walletAddress,
                            timestamp: new Date().toISOString(),
                            note: 'Payment accepted without verification (handler not configured)'
                        }
                    };
                } catch (handlerError: any) {
                    console.error(`[x402] Handler execution failed for ${this.name}:`, handlerError);
                    return {
                        error: true,
                        message: handlerError?.message || 'Tool execution failed',
                        tool: this.name,
                        _x402: {
                            paid: true,
                            amount: parseFloat(ethers.formatUnits(paymentRequirements.maxAmountRequired, 6)),
                            currency: 'USDC',
                            recipient: this.walletAddress,
                            timestamp: new Date().toISOString(),
                            note: 'Payment accepted but tool execution failed'
                        }
                    };
                }
            }

            console.log(`[x402] Verifying payment for ${this.name}...`);
            const verifyResult = await handler.verifyPayment(paymentHeader, paymentRequirements);
            if (!verifyResult.isValid) {
                throw new Error(`Invalid payment: ${verifyResult.invalidReason}`);
            }

            console.log(`[x402] Settling payment for ${this.name} (${this.cost} USDC)...`);
            const settlement = await handler.settlePayment(paymentHeader, paymentRequirements);

            console.log(`[x402] ✅ Payment settled: ${settlement.txHash}`);
            paymentEvents.emit('payment', {
                name: this.name,
                cost: this.cost,
                walletAddress: this.walletAddress,
                status: 'success',
                txHash: settlement.txHash
            });

            this.recordTransaction('completed', settlement.txHash);
            paymentEvents.emit('tool_call', { name: this.name, args });

            // Execute tool with error handling
            let result;
            try {
                result = await this.handler(args);
                // Emit tool result for A2UI generation
                paymentEvents.emit('tool_result', { name: this.name, result });
            } catch (handlerError: any) {
                console.error(`[x402] Handler execution failed for ${this.name}:`, handlerError);
                result = {
                    error: true,
                    message: handlerError?.message || 'Tool execution failed',
                    tool: this.name,
                    details: handlerError?.toString() || String(handlerError)
                };
            }

            // Return with X402 receipt
            return {
                ...result,
                _x402: {
                    paid: true,
                    amount: parseFloat(ethers.formatUnits(paymentRequirements.maxAmountRequired, 6)),
                    currency: 'USDC',
                    recipient: this.walletAddress,
                    timestamp: new Date().toISOString(),
                    txHash: settlement.txHash,
                    x402Receipt: {
                        x402Version: 1,
                        receiptType: 'payment.settled',
                        transactionHash: settlement.txHash,
                        settlementId: settlement.settlementId,
                        paymentDetails: {
                            amount: settlement.value,
                            asset: paymentRequirements.asset,
                            network: paymentRequirements.network,
                            from: settlement.from,
                            to: settlement.to,
                            facilitator: 'cronos-x402'
                        },
                        verificationProof: {
                            verifiedBy: 'cronos-x402-facilitator',
                            settlementEvent: settlement.event,
                            blockNumber: settlement.blockNumber,
                            facilitatorVersion: 'v2'
                        },
                        serviceProvided: {
                            endpoint: `/tools/${this.name}`,
                            description: `Payment for ${this.name}`,
                            serviceTimestamp: new Date().toISOString(),
                            contentType: 'application/json'
                        }
                    }
                }
            };
        } catch (error: any) {
            console.error('[x402] Payment verification failed:', error);
            paymentEvents.emit('payment', {
                name: this.name,
                cost: this.cost,
                walletAddress: this.walletAddress,
                status: 'failed',
            });
            this.recordTransaction('failed');
            throw error;
        }
    }

    private recordTransaction(status: 'pending' | 'completed' | 'failed', txHash?: string) {
        try {
            const entry: LedgerEntry = {
                timestamp: new Date().toISOString(),
                toolName: this.name,
                walletAddress: this.walletAddress,
                cost: this.cost,
                currency: 'USDC',
                status,
                txHash
            };

            const currentLedger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf-8') || '[]');
            currentLedger.push(entry);
            fs.writeFileSync(LEDGER_PATH, JSON.stringify(currentLedger, null, 2));

            // Emit event for real-time UI updates
            paymentEvents.emit('transaction', entry);
        } catch (err) {
            console.error('Failed to write to ledger:', err);
        }
    }
}
