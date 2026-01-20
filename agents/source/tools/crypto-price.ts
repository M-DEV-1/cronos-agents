import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * Crypto Price Tool
 * Fetches cryptocurrency prices and market data.
 * Returns mock data for hackathon prototype.
 */
export const cryptoPrice = new FunctionTool({
    name: 'get_crypto_price',
    description: 'Get current cryptocurrency prices, 24h change, and market data. Supports major coins like BTC, ETH, CRO, USDC.',
    parameters: z.object({
        symbol: z.string().describe('Cryptocurrency symbol (e.g., BTC, ETH, CRO, SOL)'),
        currency: z.enum(['USD', 'EUR', 'INR']).optional().default('USD'),
    }),
    execute: ({ symbol, currency = 'USD' }) => {
        const data = getMockCryptoData(symbol.toUpperCase(), currency);
        if (!data) {
            return {
                status: 'error',
                error_message: `Cryptocurrency ${symbol} not found. Try BTC, ETH, CRO, SOL, or USDC.`,
            };
        }
        return {
            status: 'success',
            ...data,
        };
    },
});

function getMockCryptoData(symbol: string, currency: string) {
    const exchangeRates: Record<string, number> = { USD: 1, EUR: 0.92, INR: 83.5 };
    const rate = exchangeRates[currency] || 1;
    const currencySymbol = { USD: '$', EUR: '€', INR: '₹' }[currency] || '$';

    const cryptoData: Record<string, { priceUSD: number; change24h: number; marketCap: string; volume24h: string }> = {
        'BTC': { priceUSD: 104250, change24h: 2.5, marketCap: '2.05T', volume24h: '48.3B' },
        'ETH': { priceUSD: 3320, change24h: 1.8, marketCap: '399B', volume24h: '18.2B' },
        'CRO': { priceUSD: 0.158, change24h: 5.2, marketCap: '4.2B', volume24h: '125M' },
        'SOL': { priceUSD: 258, change24h: -0.8, marketCap: '122B', volume24h: '5.1B' },
        'USDC': { priceUSD: 1.00, change24h: 0.01, marketCap: '45B', volume24h: '8.5B' },
        'USDT': { priceUSD: 1.00, change24h: 0.0, marketCap: '140B', volume24h: '65B' },
    };

    const data = cryptoData[symbol];
    if (!data) return null;

    const price = data.priceUSD * rate;
    const formattedPrice = price < 1
        ? `${currencySymbol}${price.toFixed(4)}`
        : `${currencySymbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return {
        symbol,
        name: { BTC: 'Bitcoin', ETH: 'Ethereum', CRO: 'Cronos', SOL: 'Solana', USDC: 'USD Coin', USDT: 'Tether' }[symbol],
        price: formattedPrice,
        priceValue: price,
        currency,
        change24h: `${data.change24h >= 0 ? '+' : ''}${data.change24h}%`,
        changeDirection: data.change24h >= 0 ? 'up' : 'down',
        marketCap: data.marketCap,
        volume24h: data.volume24h,
        lastUpdated: new Date().toISOString(),
    };
}
