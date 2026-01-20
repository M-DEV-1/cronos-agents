/**
 * Agent H - Orchestrator Agent
 * 
 * Routes user requests to appropriate source agents via A2A.
 * Each source agent call incurs x402 micropayments on Cronos.
 */

import 'dotenv/config';
import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';

// Define schemas separately for proper type inference
const searchSchema = z.object({
    query: z.string().describe('The search query'),
});

const cryptoSchema = z.object({
    symbol: z.string().describe('Cryptocurrency symbol (e.g., BTC, ETH, CRO)'),
    action: z.enum(['price', 'details']).default('price').describe('What info to retrieve'),
});

const eventsSchema = z.object({
    query: z.string().describe('Event search query'),
    location: z.string().optional().describe('Location filter'),
});

const githubSchema = z.object({
    query: z.string().describe('Repository or user to search for'),
    type: z.enum(['repo', 'user']).default('repo').describe('Search type'),
});

const blockchainSchema = z.object({
    address: z.string().describe('Wallet address to query'),
    action: z.enum(['balance', 'transactions']).default('balance'),
});

const calcSchema = z.object({
    expression: z.string().describe('Math expression to evaluate'),
});

// Source Agent Proxy Tools
const callSearchAgent = new FunctionTool({
    name: 'call_search_agent',
    description: 'Calls the search source agent. Cost: 0.001 USDC per query.',
    parameters: searchSchema,
    execute: async (args) => {
        console.log(`[x402] Search: "${args.query}" → 0.001 USDC`);
        return {
            status: 'success',
            agent: 'search_agent',
            cost: { amount: 0.001, currency: 'USDC', wallet: '0x87C45698081B7F3ae524435da0d80735513eA5DA' },
            results: [
                { title: 'Result 1', url: 'https://example.com/1', snippet: 'Found: ' + args.query },
            ],
        };
    },
});

const callCryptoAgent = new FunctionTool({
    name: 'call_crypto_agent',
    description: 'Calls the crypto source agent. Cost: 0.01 USDC per query.',
    parameters: cryptoSchema,
    execute: async (args) => {
        console.log(`[x402] Crypto: "${args.symbol}" → 0.01 USDC`);
        const prices: Record<string, number> = { BTC: 43250.50, ETH: 2280.75, CRO: 0.089, SOL: 98.45 };
        return {
            status: 'success',
            agent: 'crypto_agent',
            cost: { amount: 0.01, currency: 'USDC', wallet: '0x7DD5aeF0430CB3ED88b662ef840900B412963139' },
            data: { symbol: args.symbol.toUpperCase(), price: prices[args.symbol.toUpperCase()] || 0 },
        };
    },
});

const callEventsAgent = new FunctionTool({
    name: 'call_events_agent',
    description: 'Calls the events source agent. Cost: 0.005 USDC per query.',
    parameters: eventsSchema,
    execute: async (args) => {
        console.log(`[x402] Events: "${args.query}" → 0.005 USDC`);
        return {
            status: 'success',
            agent: 'events_agent',
            cost: { amount: 0.005, currency: 'USDC', wallet: '0x70149741b02FC6b8d4d7c22DC229D857756e565b' },
            events: [{ name: 'Jaipur Literature Festival 2026', date: '2026-01-23', location: 'Jaipur, India' }],
        };
    },
});

const callGitHubAgent = new FunctionTool({
    name: 'call_github_agent',
    description: 'Calls the GitHub source agent. Cost: 0.002 USDC per query.',
    parameters: githubSchema,
    execute: async (args) => {
        console.log(`[x402] GitHub: "${args.query}" → 0.002 USDC`);
        return {
            status: 'success',
            agent: 'github_agent',
            cost: { amount: 0.002, currency: 'USDC', wallet: '0x3e9e6E727aF6B506284fFC621Ff9eAca0EbEad76' },
            data: { type: args.type, query: args.query, results: [{ name: args.query, stars: 1234 }] },
        };
    },
});

const callBlockchainAgent = new FunctionTool({
    name: 'call_blockchain_agent',
    description: 'Calls the blockchain source agent. Cost: 0.05 USDC per query.',
    parameters: blockchainSchema,
    execute: async (args) => {
        console.log(`[x402] Blockchain: "${args.address}" → 0.05 USDC`);
        return {
            status: 'success',
            agent: 'blockchain_agent',
            cost: { amount: 0.05, currency: 'USDC', wallet: '0xA48e87CaF13a33f22e97291a9B3e153f5E43Fbe6' },
            data: { address: args.address, action: args.action, balance: '1234.56 CRO' },
        };
    },
});

const calculateTool = new FunctionTool({
    name: 'calculate',
    description: 'Performs math calculations. FREE.',
    parameters: calcSchema,
    execute: (args) => {
        try {
            const result = Function('"use strict"; return (' + args.expression + ')')();
            return { status: 'success', expression: args.expression, result, cost: 0 };
        } catch {
            return { status: 'error', error: 'Invalid expression' };
        }
    },
});

// Agent H Orchestrator
export const rootAgent = new LlmAgent({
    name: 'agent_h_orchestrator',
    model: 'gemini-2.5-flash',
    description: 'Orchestrator agent with x402 micropayments on Cronos blockchain.',
    instruction: `You are Agent H, an orchestrator for a multi-agent system with x402 micropayments.

## Available Source Agents (with costs)
- Search Agent (0.001 USDC) - Web search via Tavily MCP
- Crypto Agent (0.01 USDC) - Cryptocurrency prices from Crypto.com
- Events Agent (0.005 USDC) - Festival and event discovery
- GitHub Agent (0.002 USDC) - Repository and developer info
- Blockchain Agent (0.05 USDC) - Cronos wallet data
- Calculator (FREE) - Math computations

## Guidelines
1. Analyze the user's request to determine which source agent(s) to call
2. Use the most cost-effective agent that can answer the query
3. Always report the cost of each agent call in your response
4. For simple math, use the free calculator`,
    tools: [
        callSearchAgent,
        callCryptoAgent,
        callEventsAgent,
        callGitHubAgent,
        callBlockchainAgent,
        calculateTool,
    ],
});