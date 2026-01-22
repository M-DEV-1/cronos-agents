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
    txHash?: string; // Placeholder for future on-chain TX
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
    cost: number; // Cost in USDC
    walletAddress: string; // Unique wallet for this tool
    handler: (args: any) => Promise<any>; // The actual tool logic
}

/**
 * Wrapper class that enforces x402 payment before execution
 */
export class PaidToolWrapper {
    public name: string;
    public description: string;
    public cost: number;
    public walletAddress: string;
    private handler: (args: any) => Promise<any>;

    constructor(config: PaidToolConfig) {
        this.name = config.name;
        this.description = `${config.description} (Cost: ${config.cost} USDC)`;
        this.cost = config.cost;
        this.walletAddress = config.walletAddress;
        this.handler = config.handler;
    }

    /**
     * Arguments schema for the tool (passed through to ADK)
     * Note: We don't define the schema here as we rely on ADK's inference or manual definition in agent.ts
     */

    /**
     * Execute the tool with payment enforcement
     */
    async execute(args: any): Promise<any> {
        console.log(`[x402] Tool Executing: ${this.name}`);
        console.log(`[x402] Payment Required: ${this.cost} TCRO -> ${this.walletAddress}`);

        // Emit payment_required event
        paymentEvents.emit('payment', {
            name: this.name,
            cost: this.cost,
            walletAddress: this.walletAddress,
            status: 'pending',
        });

        // 1. Record "Pending" Transaction to Ledger
        this.recordTransaction('pending');

        // 2. Simulate Payment Delay / Processing (In a real app, we'd wait for on-chain event)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Emit payment_success event
        paymentEvents.emit('payment', {
            name: this.name,
            cost: this.cost,
            walletAddress: this.walletAddress,
            status: 'success',
        });

        // 3. Record "Completed" Transaction
        this.recordTransaction('completed');

        // Emit tool_call event
        paymentEvents.emit('tool_call', {
            name: this.name,
            args: args,
        });

        // 4. Execute the actual tool logic (MCP or Local)
        try {
            const result = await this.handler(args);

            // Attach payment metadata to the result (for UI visualization)
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
                currency: 'USDC',
                status
            };

            const currentLedger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf-8') || '[]');
            currentLedger.push(entry);
            fs.writeFileSync(LEDGER_PATH, JSON.stringify(currentLedger, null, 2));

            // Emit event for real-time UI updates (via sockets potentially)
            paymentEvents.emit('transaction', entry);
        } catch (err) {
            console.error('Failed to write to ledger:', err);
        }
    }
}
