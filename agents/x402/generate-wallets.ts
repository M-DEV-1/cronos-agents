/**
 * Wallet Generator Script
 * Generates real Base Sepolia testnet wallets for all source agents
 * 
 * Run: npx ts-node generate-wallets.ts
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

const TOOLS = [
    'web_search',
    'get_news',
    'search_events',
    'search_wikipedia',
    'search_youtube',
    'get_crypto_price',
    'get_blockchain_data',
    'get_github_info',
    'get_weather',
    'calculate',
    'manage_reminders',
];

interface WalletInfo {
    tool: string;
    address: string;
    privateKey: string;
}

function generateWallets(): WalletInfo[] {
    return TOOLS.map(tool => {
        const wallet = ethers.Wallet.createRandom();
        return {
            tool,
            address: wallet.address,
            privateKey: wallet.privateKey,
        };
    });
}

function generateEnvFile(wallets: WalletInfo[]): string {
    let env = `# x402 Agent Wallets (Base Sepolia Testnet)
# Generated: ${new Date().toISOString()}
# 
# IMPORTANT: Keep these private keys secure!
# Fund each wallet with USDC on Base Sepolia testnet for x402 payments
# USDC Contract: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
# Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
# RPC: https://sepolia.base.org
# Chain ID: 84532

`;

    wallets.forEach(w => {
        const envKey = `WALLET_${w.tool.toUpperCase()}`;
        env += `# ${w.tool} - Address: ${w.address}\n`;
        env += `${envKey}=${w.privateKey}\n\n`;
    });

    return env;
}

function generateWalletsTs(wallets: WalletInfo[]): string {
    return `/**
 * Tool Wallet Mappings (Auto-generated)
 * Each source tool has its own wallet loaded from environment variables
 */

// Wallet addresses (public, safe to commit)
export const TOOL_ADDRESSES: Record<string, string> = {
${wallets.map(w => `  ${w.tool}: '${w.address}',`).join('\n')}
};

// Get wallet private key from env (for x402 signing)
export function getToolPrivateKey(tool: string): string | undefined {
  const envKey = \`WALLET_\${tool.toUpperCase()}\`;
  return process.env[envKey];
}
`;
}

// Run
const wallets = generateWallets();

console.log('Generated wallets:');
wallets.forEach(w => {
    console.log(`  ${w.tool}: ${w.address}`);
});

// Write .env.wallets
const envContent = generateEnvFile(wallets);
fs.writeFileSync(path.join(__dirname, '.env.wallets'), envContent);
console.log('\nWritten to .env.wallets');

// Write wallet-addresses.ts
const tsContent = generateWalletsTs(wallets);
fs.writeFileSync(path.join(__dirname, 'wallet-addresses.ts'), tsContent);
console.log('Written to wallet-addresses.ts');

console.log('\nNext steps:');
console.log('1. Copy .env.wallets content to your .env file');
console.log('2. Fund wallets with USDC on Base Sepolia testnet');
console.log('3. Keep private keys secure!');
