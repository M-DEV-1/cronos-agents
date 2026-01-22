import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Ledger API Route
 * Returns x402 transaction ledger data
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

export async function GET() {
    try {
        // Path to ledger.json (adjust based on deployment)
        const ledgerPath = join(process.cwd(), '..', 'agents', 'source', 'agents', 'ledger.json');

        if (!existsSync(ledgerPath)) {
            return NextResponse.json({ entries: [], total: 0 });
        }

        const ledgerData = readFileSync(ledgerPath, 'utf-8');
        const entries: LedgerEntry[] = JSON.parse(ledgerData);

        // Calculate totals
        const completedEntries = entries.filter(e => e.status === 'completed');
        const totalVolume = completedEntries.reduce((sum, e) => sum + e.cost, 0);
        const totalTransactions = entries.length;
        const successfulTransactions = completedEntries.length;

        return NextResponse.json({
            entries: entries.reverse(), // Most recent first
            stats: {
                totalTransactions,
                successfulTransactions,
                failedTransactions: entries.filter(e => e.status === 'failed').length,
                pendingTransactions: entries.filter(e => e.status === 'pending').length,
                totalVolume,
                currency: 'TCRO',
            },
        });
    } catch (error) {
        console.error('Error reading ledger:', error);
        return NextResponse.json({ entries: [], stats: null, error: 'Failed to read ledger' }, { status: 500 });
    }
}
