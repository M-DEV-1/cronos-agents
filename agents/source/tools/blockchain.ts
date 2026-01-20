import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * Blockchain Tool
 * Fetches Cronos blockchain data like balances and transactions.
 * Returns mock data for hackathon prototype.
 */
export const blockchain = new FunctionTool({
    name: 'get_blockchain_data',
    description: 'Get Cronos blockchain data including wallet balances, transaction history, and token balances. Useful for checking payment status.',
    parameters: z.object({
        action: z.enum(['balance', 'transactions', 'tokens']).describe('Type of data to fetch'),
        address: z.string().describe('Wallet address (0x...)'),
    }),
    execute: ({ action, address }) => {
        if (!address.startsWith('0x') || address.length !== 42) {
            return {
                status: 'error',
                error_message: 'Invalid address format. Must be a 42-character hex address starting with 0x.',
            };
        }

        const data = getMockBlockchainData(action, address);
        return {
            status: 'success',
            network: 'Cronos',
            chainId: 25,
            address,
            ...data,
        };
    },
});

function getMockBlockchainData(action: string, address: string) {
    switch (action) {
        case 'balance':
            return {
                balances: [
                    { token: 'CRO', balance: '1,250.50', valueUSD: '$197.58' },
                    { token: 'USDC', balance: '500.00', valueUSD: '$500.00' },
                    { token: 'devUSDC.e', balance: '100.00', valueUSD: '$100.00' },
                ],
                totalValueUSD: '$797.58',
            };

        case 'transactions':
            return {
                recentTransactions: [
                    {
                        hash: '0x' + 'a'.repeat(64),
                        type: 'Transfer',
                        from: address,
                        to: '0x' + 'b'.repeat(40),
                        value: '10 USDC',
                        timestamp: new Date(Date.now() - 3600000).toISOString(),
                        status: 'Confirmed',
                    },
                    {
                        hash: '0x' + 'c'.repeat(64),
                        type: 'x402 Payment',
                        from: address,
                        to: '0x' + 'd'.repeat(40),
                        value: '0.5 USDC',
                        timestamp: new Date(Date.now() - 7200000).toISOString(),
                        status: 'Confirmed',
                    },
                    {
                        hash: '0x' + 'e'.repeat(64),
                        type: 'Receive',
                        from: '0x' + 'f'.repeat(40),
                        to: address,
                        value: '100 CRO',
                        timestamp: new Date(Date.now() - 86400000).toISOString(),
                        status: 'Confirmed',
                    },
                ],
                totalCount: 47,
            };

        case 'tokens':
            return {
                tokens: [
                    { symbol: 'CRO', name: 'Cronos', balance: '1,250.50', contract: 'native' },
                    { symbol: 'USDC', name: 'USD Coin', balance: '500.00', contract: '0xa0b86a33e6064e3e3c58b1f0f3f67b0a9f6f6f6f' },
                    { symbol: 'devUSDC.e', name: 'Dev USDC', balance: '100.00', contract: '0xb0b86a33e6064e3e3c58b1f0f3f67b0a9f6f6f6f' },
                ],
            };

        default:
            return { error: 'Unknown action' };
    }
}
