import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Event emitter for payment events
 */
export const paymentEvents = new EventEmitter();

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
 * Wrapper class that enforces x402 payment before execution
 * 
 * x402 Flow:
 * 1. Tool execution requested
 * 2. Emit payment_required event (frontend shows wallet popup)
 * 3. Record pending transaction
 * 4. Continue with execution (payment happens async on frontend)
 * 5. Record completed transaction
 * 
 * Note: In production, this would verify on-chain payment before execution.
 * For demo purposes, we trust the frontend to handle the payment.
 */
export class PaidToolWrapper {
    public name: string;
    public description: string;
    public cost: number;
    public walletAddress: string;
    private handler: (args: any) => Promise<any>;

    constructor(config: PaidToolConfig) {
        this.name = config.name;
        this.description = `${config.description} (Cost: ${config.cost} TCRO via x402)`;
        this.cost = config.cost;
        this.walletAddress = config.walletAddress;
        this.handler = config.handler;
    }

    /**
     * Execute the tool with x402 payment enforcement
     */
    async execute(args: any): Promise<any> {
        console.log(`[x402] Tool Executing: ${this.name}`);
        console.log(`[x402] Payment Required: ${this.cost} TCRO -> ${this.walletAddress}`);

        // 1. Emit payment_required event - frontend will trigger wallet
        paymentEvents.emit('payment', {
            name: this.name,
            cost: this.cost,
            walletAddress: this.walletAddress,
            status: 'pending',
        });

        // 2. Record "Pending" Transaction to Ledger
        this.recordTransaction('pending');

        // 3. WAIT for payment confirmation
        console.log(`[x402] Tool PAUSED. Waiting for payment confirmation event...`);

        try {
            // Create a promise that resolves when 'payment_confirmed' is emitted for this tool
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    cleanup();
                    reject(new Error('Payment timeout - transaction not received in time'));
                }, 300000); // 5 minute timeout

                const onConfirmed = (data: { name: string }) => {
                    if (data.name === this.name) {
                        console.log(`[x402] Payment confirmed for ${this.name}, resuming execution.`);
                        cleanup();
                        resolve();
                    }
                };

                const cleanup = () => {
                    clearTimeout(timeout);
                    paymentEvents.off('payment_confirmed', onConfirmed);
                };

                paymentEvents.on('payment_confirmed', onConfirmed);
            });

            // 4. Emit payment_success event
            paymentEvents.emit('payment', {
                name: this.name,
                cost: this.cost,
                walletAddress: this.walletAddress,
                status: 'success',
            });

            // 5. Record "Completed" Transaction
            this.recordTransaction('completed');

            // 6. Emit tool_call event for visualization
            paymentEvents.emit('tool_call', {
                name: this.name,
                args: args,
            });

            // 7. Execute the actual tool logic
            const result = await this.handler(args);

            // Return result with x402 metadata
            return {
                ...result,
                _x402: {
                    paid: true,
                    amount: this.cost,
                    currency: 'TCRO',
                    recipient: this.walletAddress,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('[x402] Payment or Execution failed:', error);
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

    private recordTransaction(status: 'pending' | 'completed' | 'failed') {
        try {
            const entry: LedgerEntry = {
                timestamp: new Date().toISOString(),
                toolName: this.name,
                walletAddress: this.walletAddress,
                cost: this.cost,
                currency: 'TCRO',
                status
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
