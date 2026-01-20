import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * Wikipedia Tool
 * Searches Wikipedia for information.
 * Returns mock data for hackathon prototype.
 */
export const wikipedia = new FunctionTool({
    name: 'search_wikipedia',
    description: 'Search Wikipedia for factual information about people, places, concepts, and events.',
    parameters: z.object({
        query: z.string().describe('The topic to search for on Wikipedia'),
    }),
    execute: ({ query }) => {
        const article = getMockWikipediaArticle(query);
        return {
            status: 'success',
            query,
            ...article,
        };
    },
});

function getMockWikipediaArticle(query: string) {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('jaipur') && lowerQuery.includes('literature')) {
        return {
            title: 'Jaipur Literature Festival',
            summary: 'The Jaipur Literature Festival (JLF), also known as "the greatest literary show on Earth", is an annual literary festival held in Jaipur, Rajasthan, India. Founded in 2006, it has grown to become the world\'s largest free literary festival, attracting over 500,000 visitors and 250+ speakers annually.',
            url: 'https://en.wikipedia.org/wiki/Jaipur_Literature_Festival',
            categories: ['Literary festivals', 'Culture of Jaipur', 'Festivals established in 2006'],
        };
    }

    if (lowerQuery.includes('cronos') || lowerQuery.includes('cro')) {
        return {
            title: 'Cronos (blockchain)',
            summary: 'Cronos is a blockchain network developed by Crypto.com. It is compatible with Ethereum and the Cosmos SDK, enabling developers to deploy Ethereum dApps. Cronos uses CRO as its native cryptocurrency and supports the x402 payment protocol for AI agent micropayments.',
            url: 'https://en.wikipedia.org/wiki/Cronos_(blockchain)',
            categories: ['Blockchains', 'Ethereum-compatible networks', 'Crypto.com'],
        };
    }

    if (lowerQuery.includes('x402') || lowerQuery.includes('http 402')) {
        return {
            title: 'HTTP 402 Payment Required',
            summary: 'HTTP 402 Payment Required is a client error response code reserved for future use. The x402 protocol extends this concept to enable micropayments for web resources, particularly useful for AI agents that need to pay for API calls using cryptocurrencies.',
            url: 'https://en.wikipedia.org/wiki/HTTP_402',
            categories: ['HTTP status codes', 'Web standards', 'Payment protocols'],
        };
    }

    if (lowerQuery.includes('literature') || lowerQuery.includes('literary')) {
        return {
            title: 'Literature',
            summary: 'Literature is any collection of written work, but it is also used more narrowly for writings specifically considered to be an art form, especially prose fiction, drama, and poetry. Literary festivals around the world celebrate authors, books, and the craft of storytelling.',
            url: 'https://en.wikipedia.org/wiki/Literature',
            categories: ['Literature', 'Art forms', 'Writing'],
        };
    }

    return {
        title: query,
        summary: `${query} is a topic of interest. This is a placeholder summary for the Wikipedia article about ${query}. In a production environment, this would contain actual Wikipedia content.`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/ /g, '_'))}`,
        categories: ['General'],
    };
}
