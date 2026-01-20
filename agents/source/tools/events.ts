import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * Events Tool
 * Searches for upcoming events like festivals, conferences, meetups.
 * Returns mock event data for hackathon prototype.
 */
export const events = new FunctionTool({
    name: 'search_events',
    description: 'Search for upcoming events like festivals, conferences, concerts, meetups, and gatherings. Great for finding event dates and details.',
    parameters: z.object({
        query: z.string().describe('Event search query (e.g., "literature festival", "tech conference", "music festival")'),
        location: z.string().optional().describe('Location filter (city or country)'),
        dateRange: z.enum(['upcoming', 'this_week', 'this_month', 'next_3_months']).optional().default('upcoming'),
    }),
    execute: ({ query, location, dateRange = 'upcoming' }) => {
        const events = generateMockEvents(query, location, dateRange);
        return {
            status: 'success',
            query,
            location: location || 'worldwide',
            dateRange,
            eventsCount: events.length,
            events,
        };
    },
});

function generateMockEvents(query: string, location?: string, dateRange?: string) {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('literature') || lowerQuery.includes('lit') || lowerQuery.includes('book')) {
        const allEvents = [
            {
                name: 'Jaipur Literature Festival 2026',
                type: 'Literary Festival',
                startDate: '2026-01-23',
                endDate: '2026-01-27',
                location: 'Jaipur, India',
                venue: 'Diggi Palace',
                description: 'World\'s largest free literary festival with 250+ authors',
                ticketPrice: 'Free',
                registrationUrl: 'https://jaipurliteraturefestival.org/register',
            },
            {
                name: 'Mumbai LitFest 2026',
                type: 'Literary Festival',
                startDate: '2026-02-15',
                endDate: '2026-02-17',
                location: 'Mumbai, India',
                venue: 'NCPA',
                description: 'Celebrating stories that shape our world',
                ticketPrice: '₹500 - ₹2000',
                registrationUrl: 'https://mumbailitfest.com/tickets',
            },
            {
                name: 'London Book Fair 2026',
                type: 'Book Fair',
                startDate: '2026-03-10',
                endDate: '2026-03-12',
                location: 'London, UK',
                venue: 'Olympia London',
                description: 'Global publishing industry event',
                ticketPrice: '£25 - £150',
                registrationUrl: 'https://londonbookfair.co.uk',
            },
            {
                name: 'Kolkata Literary Meet',
                type: 'Literary Festival',
                startDate: '2026-03-08',
                endDate: '2026-03-10',
                location: 'Kolkata, India',
                venue: 'Victoria Memorial',
                description: 'Celebrating Bengali and Indian literature',
                ticketPrice: 'Free',
                registrationUrl: 'https://kolkataliterarymeet.org',
            },
        ];

        // Filter by location if provided
        if (location) {
            return allEvents.filter(e =>
                e.location.toLowerCase().includes(location.toLowerCase())
            );
        }
        return allEvents;
    }

    if (lowerQuery.includes('tech') || lowerQuery.includes('developer') || lowerQuery.includes('hackathon')) {
        return [
            {
                name: 'Cronos x402 PayTech Hackathon',
                type: 'Hackathon',
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                location: 'Online',
                venue: 'Virtual',
                description: 'Build AI agent payment solutions with x402 protocol',
                ticketPrice: 'Free',
                registrationUrl: 'https://cronos.org/hackathon',
            },
            {
                name: 'Web3 Developer Summit 2026',
                type: 'Conference',
                startDate: '2026-02-20',
                endDate: '2026-02-22',
                location: 'San Francisco, USA',
                venue: 'Moscone Center',
                description: 'The premier Web3 developer conference',
                ticketPrice: '$299 - $999',
                registrationUrl: 'https://web3devsummit.com',
            },
        ];
    }

    // Generic events
    return [
        {
            name: `${query} Event 2026`,
            type: 'Event',
            startDate: '2026-02-01',
            endDate: '2026-02-03',
            location: location || 'TBD',
            venue: 'Main Venue',
            description: `An exciting event related to ${query}`,
            ticketPrice: 'Varies',
            registrationUrl: 'https://example.com/register',
        },
    ];
}
