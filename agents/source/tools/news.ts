import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * News Tool
 * Fetches latest news headlines by topic.
 * Returns mock news data for hackathon prototype.
 */
export const news = new FunctionTool({
    name: 'get_news',
    description: 'Get the latest news headlines. Can filter by topic like technology, crypto, entertainment, sports, or general.',
    parameters: z.object({
        topic: z.string().optional().default('general').describe('News topic (e.g., technology, crypto, entertainment, sports, literature)'),
        count: z.number().optional().default(5).describe('Number of articles to return'),
    }),
    execute: ({ topic = 'general', count = 5 }) => {
        const articles = generateMockNews(topic, count);
        return {
            status: 'success',
            topic,
            articlesCount: articles.length,
            articles,
        };
    },
});

function generateMockNews(topic: string, count: number) {
    const lowerTopic = topic.toLowerCase();

    if (lowerTopic.includes('crypto') || lowerTopic.includes('blockchain')) {
        return [
            {
                title: 'Cronos Launches x402 Payment Protocol for AI Agents',
                source: 'CoinDesk',
                date: '2026-01-19',
                snippet: 'Cronos EVM introduces x402, enabling micropayments for autonomous AI agents using HTTP 402 responses.',
            },
            {
                title: 'ERC-8004 Standard Gains Momentum in Agent Economy',
                source: 'The Block',
                date: '2026-01-18',
                snippet: 'The trustless agent identity standard sees adoption across major L2 chains.',
            },
            {
                title: 'CRO Price Surges Amid AI Agent Adoption',
                source: 'Decrypt',
                date: '2026-01-17',
                snippet: 'Cronos native token rises 15% as developers flock to build AI payment solutions.',
            },
        ].slice(0, count);
    }

    if (lowerTopic.includes('literature') || lowerTopic.includes('book')) {
        return [
            {
                title: 'Jaipur Literature Festival 2026: Complete Schedule Released',
                source: 'The Hindu',
                date: '2026-01-19',
                snippet: 'Over 250 authors confirmed including 3 Nobel laureates. Festival begins January 23.',
            },
            {
                title: 'Booker Prize 2026 Longlist Announced',
                source: 'The Guardian',
                date: '2026-01-15',
                snippet: 'Thirteen novels make the cut for the prestigious literary award.',
            },
        ].slice(0, count);
    }

    if (lowerTopic.includes('tech')) {
        return [
            {
                title: 'Google ADK 1.0 Released: Agent Development Kit Goes Stable',
                source: 'TechCrunch',
                date: '2026-01-19',
                snippet: 'Multi-agent AI development framework now production-ready with A2A protocol support.',
            },
            {
                title: 'A2A Protocol: The New Standard for Agent Communication',
                source: 'Wired',
                date: '2026-01-18',
                snippet: 'How the Agent-to-Agent protocol is reshaping autonomous AI systems.',
            },
        ].slice(0, count);
    }

    // General news
    return Array.from({ length: count }, (_, i) => ({
        title: `Breaking: ${topic.charAt(0).toUpperCase() + topic.slice(1)} News Update ${i + 1}`,
        source: ['Reuters', 'AP News', 'BBC', 'CNN'][i % 4],
        date: new Date().toISOString().split('T')[0],
        snippet: `Latest developments in ${topic}. Stay informed with real-time updates.`,
    }));
}
