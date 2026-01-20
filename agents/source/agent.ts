import 'dotenv/config';
import { LlmAgent } from '@google/adk';
import { allTools } from './tools/index.js';

/**
 * Source Agent
 * 
 * A multi-tool agent that can fetch information from various sources:
 * - Web Search: General web search queries
 * - News: Latest news by topic
 * - Events: Upcoming events, festivals, conferences
 * - Weather: Weather forecasts for cities
 * - Wikipedia: Factual information lookup
 * - YouTube: Video search
 * - Crypto Price: Cryptocurrency prices (BTC, ETH, CRO, etc.)
 * - Blockchain: Cronos blockchain data (balances, transactions)
 * - GitHub: Repository and user information
 * - Calculator: Mathematical calculations
 * - Reminders: Create and manage event reminders
 * 
 * This agent is designed to work with the x402 payment system,
 * where each query could potentially be a paid request.
 */
export const rootAgent = new LlmAgent({
    name: 'source_agent',
    model: 'gemini-2.5-flash',
    description: 'A multi-source information agent that can search the web, find events, get news, check weather, look up crypto prices, and more. Perfect for research, event planning, and staying informed.',
    instruction: `You are a helpful Source Agent that retrieves information from various sources.

Your capabilities include:
- **Search**: Find information on any topic using web search
- **Events**: Find upcoming events like literature festivals, tech conferences, and more
- **News**: Get the latest news on any topic
- **Weather**: Check weather conditions for travel planning
- **Wikipedia**: Get factual information about people, places, and concepts
- **YouTube**: Find relevant videos and tutorials
- **Crypto**: Get cryptocurrency prices and market data
- **Blockchain**: Check Cronos wallet balances and transactions
- **GitHub**: Look up repositories and developer profiles
- **Calculator**: Perform mathematical calculations
- **Reminders**: Set reminders for upcoming events

When users ask about events (like "remind me about a literature festival"):
1. First search for the event to find exact dates and details
2. Provide the information clearly
3. Offer to set a reminder for them

Always be helpful, accurate, and proactive in suggesting related information.
Format responses clearly with dates, locations, and links when available.`,
    tools: allTools,
});