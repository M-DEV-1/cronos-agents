import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * YouTube Tool
 * Searches YouTube for videos.
 * Returns mock data for hackathon prototype.
 */
export const youtube = new FunctionTool({
    name: 'search_youtube',
    description: 'Search YouTube for videos. Great for finding tutorials, talks, and entertainment content.',
    parameters: z.object({
        query: z.string().describe('Search query for YouTube videos'),
        count: z.number().optional().default(5).describe('Number of results to return'),
    }),
    execute: ({ query, count = 5 }) => {
        const videos = getMockYouTubeResults(query, count);
        return {
            status: 'success',
            query,
            resultsCount: videos.length,
            videos,
        };
    },
});

function getMockYouTubeResults(query: string, count: number) {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('literature') || lowerQuery.includes('book') || lowerQuery.includes('jaipur')) {
        return [
            {
                title: 'Jaipur Literature Festival 2025 Highlights | Full Documentary',
                channel: 'JLF Official',
                views: '1.2M views',
                duration: '45:32',
                publishedAt: '2 months ago',
                thumbnail: 'https://i.ytimg.com/vi/example1/hqdefault.jpg',
                url: 'https://youtube.com/watch?v=jlf2025doc',
            },
            {
                title: 'Best Author Talks from Literary Festivals 2025',
                channel: 'BookTube Central',
                views: '450K views',
                duration: '28:15',
                publishedAt: '3 weeks ago',
                thumbnail: 'https://i.ytimg.com/vi/example2/hqdefault.jpg',
                url: 'https://youtube.com/watch?v=authtalks25',
            },
        ].slice(0, count);
    }

    if (lowerQuery.includes('cronos') || lowerQuery.includes('x402') || lowerQuery.includes('blockchain')) {
        return [
            {
                title: 'x402 Protocol Explained: Micropayments for AI Agents',
                channel: 'Crypto.com',
                views: '89K views',
                duration: '12:45',
                publishedAt: '1 week ago',
                thumbnail: 'https://i.ytimg.com/vi/example3/hqdefault.jpg',
                url: 'https://youtube.com/watch?v=x402explained',
            },
            {
                title: 'Building AI Agents with Google ADK - Full Tutorial',
                channel: 'Google Developers',
                views: '234K views',
                duration: '1:02:30',
                publishedAt: '2 weeks ago',
                thumbnail: 'https://i.ytimg.com/vi/example4/hqdefault.jpg',
                url: 'https://youtube.com/watch?v=adktutorial',
            },
            {
                title: 'ERC-8004: The Future of Trustless AI Agents',
                channel: 'Ethereum Foundation',
                views: '156K views',
                duration: '22:18',
                publishedAt: '1 month ago',
                thumbnail: 'https://i.ytimg.com/vi/example5/hqdefault.jpg',
                url: 'https://youtube.com/watch?v=erc8004future',
            },
        ].slice(0, count);
    }

    // Generic results
    return Array.from({ length: count }, (_, i) => ({
        title: `${query} - Video ${i + 1}`,
        channel: 'Content Creator',
        views: `${Math.floor(Math.random() * 100)}K views`,
        duration: `${Math.floor(Math.random() * 30)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        publishedAt: `${Math.floor(Math.random() * 12) + 1} months ago`,
        thumbnail: `https://i.ytimg.com/vi/example${i}/hqdefault.jpg`,
        url: `https://youtube.com/watch?v=video${i}`,
    }));
}
