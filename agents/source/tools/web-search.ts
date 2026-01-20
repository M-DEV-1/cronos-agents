import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * Web Search Tool
 * Searches the web for information based on a query.
 * Returns mock search results for hackathon prototype.
 */
export const webSearch = new FunctionTool({
    name: 'web_search',
    description: 'Search the web for information. Use this to find events, news, articles, and general information about any topic.',
    parameters: z.object({
        query: z.string().describe('The search query to look up'),
        count: z.number().optional().default(5).describe('Number of results to return (max 10)'),
    }),
    execute: ({ query, count = 5 }) => {
        // Mock search results for hackathon
        const mockResults = generateMockSearchResults(query, Math.min(count, 10));
        return {
            status: 'success',
            query,
            resultsCount: mockResults.length,
            results: mockResults,
        };
    },
});

function generateMockSearchResults(query: string, count: number) {
    const lowerQuery = query.toLowerCase();

    // Literature/Event focused mock data
    if (lowerQuery.includes('literature') || lowerQuery.includes('fest') || lowerQuery.includes('festival')) {
        return [
            {
                title: 'Jaipur Literature Festival 2026',
                snippet: 'The world\'s largest free literary festival returns January 23-27, 2026. Featuring 250+ speakers, including Nobel laureates and Booker Prize winners.',
                url: 'https://jaipurliteraturefestival.org/2026',
                date: '2026-01-23',
            },
            {
                title: 'Mumbai LitFest 2026 - Dates Announced',
                snippet: 'Mumbai Literature Festival scheduled for February 15-17, 2026 at NCPA. Early bird registrations now open.',
                url: 'https://mumbailitfest.com',
                date: '2026-02-15',
            },
            {
                title: 'Kolkata Literary Meet 2026',
                snippet: 'Annual literary gathering celebrating Bengali and Indian literature. March 8-10, 2026 at Victoria Memorial.',
                url: 'https://kolkataliterarymeet.org',
                date: '2026-03-08',
            },
        ].slice(0, count);
    }

    if (lowerQuery.includes('crypto') || lowerQuery.includes('blockchain') || lowerQuery.includes('cronos')) {
        return [
            {
                title: 'Cronos x402 PayTech Hackathon 2026',
                snippet: 'Build the future of AI agent payments with x402 protocol. Prizes up to $50,000. Deadline: January 31, 2026.',
                url: 'https://cronos.org/hackathon',
                date: '2026-01-15',
            },
            {
                title: 'x402 Protocol: HTTP Payments Revolution',
                snippet: 'How x402 enables micropayments for AI agents using HTTP 402 status codes and EIP-3009 signatures.',
                url: 'https://x402.org/docs',
                date: '2025-12-01',
            },
        ].slice(0, count);
    }

    // Generic mock results
    return Array.from({ length: count }, (_, i) => ({
        title: `Search Result ${i + 1} for "${query}"`,
        snippet: `This is a relevant result about ${query}. Contains useful information related to your search.`,
        url: `https://example.com/result-${i + 1}`,
        date: new Date().toISOString().split('T')[0],
    }));
}
