import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * Reminders Tool
 * Creates and manages reminders for events.
 * Returns mock data for hackathon prototype.
 */
export const reminders = new FunctionTool({
    name: 'manage_reminders',
    description: 'Create, list, or delete reminders for events. Perfect for setting reminders about festivals, conferences, and deadlines.',
    parameters: z.object({
        action: z.enum(['create', 'list', 'delete']).describe('Action to perform'),
        title: z.string().optional().describe('Title of the reminder (required for create)'),
        date: z.string().optional().describe('Date for the reminder in YYYY-MM-DD format'),
        description: z.string().optional().describe('Additional details about the reminder'),
        reminderId: z.string().optional().describe('ID of reminder to delete'),
    }),
    execute: ({ action, title, date, description, reminderId }) => {
        switch (action) {
            case 'create':
                if (!title || !date) {
                    return {
                        status: 'error',
                        error_message: 'Title and date are required to create a reminder.',
                    };
                }
                return createReminder(title, date, description);
            case 'list':
                return listReminders();
            case 'delete':
                if (!reminderId) {
                    return {
                        status: 'error',
                        error_message: 'Reminder ID is required to delete a reminder.',
                    };
                }
                return deleteReminder(reminderId);
            default:
                return { status: 'error', error_message: 'Unknown action' };
        }
    },
});

// In-memory storage for demo (would be persistent in production)
const mockReminders = [
    {
        id: 'rem_001',
        title: 'Jaipur Literature Festival',
        date: '2026-01-23',
        description: 'World\'s largest free literary festival begins',
        createdAt: '2026-01-15T10:00:00Z',
    },
    {
        id: 'rem_002',
        title: 'Cronos Hackathon Deadline',
        date: '2026-01-31',
        description: 'Submit x402 PayTech project',
        createdAt: '2026-01-10T14:30:00Z',
    },
];

function createReminder(title: string, date: string, description?: string) {
    const newReminder = {
        id: `rem_${String(mockReminders.length + 1).padStart(3, '0')}`,
        title,
        date,
        description: description || '',
        createdAt: new Date().toISOString(),
    };

    mockReminders.push(newReminder);

    return {
        status: 'success',
        message: 'Reminder created successfully',
        reminder: newReminder,
        a2ui_action: {
            type: 'notification',
            title: 'Reminder Set',
            message: `You'll be reminded about "${title}" on ${date}`,
            variant: 'success',
        },
    };
}

function listReminders() {
    const now = new Date();
    const upcoming = mockReminders
        .filter(r => new Date(r.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        status: 'success',
        count: upcoming.length,
        reminders: upcoming,
        a2ui_action: {
            type: 'list',
            title: 'Your Upcoming Reminders',
            items: upcoming.map(r => ({
                id: r.id,
                primary: r.title,
                secondary: r.date,
                description: r.description,
            })),
        },
    };
}

function deleteReminder(reminderId: string) {
    const index = mockReminders.findIndex(r => r.id === reminderId);
    if (index === -1) {
        return {
            status: 'error',
            error_message: `Reminder ${reminderId} not found.`,
        };
    }

    const deleted = mockReminders.splice(index, 1)[0];
    return {
        status: 'success',
        message: 'Reminder deleted successfully',
        deleted,
    };
}
