export const A2UI_COMPONENT_SCHEMA = `
# A2UI Component Catalog

## Message Types

1. **surfaceUpdate**: Add/update UI components
2. **dataModelUpdate**: Update bound data
3. **beginRendering**: Signal to start rendering (must be last)

## Available Components

### Layout Components
- **Column**: Vertical arrangement. Props: children (explicitList of IDs), alignment (start|center|end)
- **Row**: Horizontal arrangement. Props: children (explicitList of IDs), alignment (start|center|end|spaceBetween)
- **Card**: Container with optional title. Props: title (literalString), child (component ID), subtitle (literalString)

### Content Components  
- **Text**: Display text. Props: text (literalString), usageHint (h1|h2|h3|body|caption|label)
- **Image**: Display image. Props: url (literalString), alt (literalString)
- **Badge**: Small label. Props: text (literalString), variant (success|warning|error|info)
- **Divider**: Horizontal line. No props.

### Interactive Components
- **Button**: Clickable action. Props: label (literalString), action (name, payload?), variant (primary|secondary|outline|danger)
- **AlertButton**: Action with icon. Props: label (literalString), action (name, payload?), icon (bell|alarm|check)

### Domain-Specific Components
- **EventCard**: Event display. Props: name, date, location (all literalString), onDetails (action)
- **PriceTracker**: Price with alert. Props: symbol (literalString), price (number), target (number), change24h (number), onAlert (action), isPaid (boolean)

## Example: Dynamic UI Generation

For "Show me BTC price with an alert":
\`\`\`json
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["btc_card"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "btc_card", "component": {"Card": {"title": {"literalString": "BTC Price Tracker"}, "child": "tracker"}}}]}}
{"surfaceUpdate": {"components": [{"id": "tracker", "component": {"PriceTracker": {"symbol": {"literalString": "BTC"}, "price": 97500, "target": 100000, "onAlert": {"name": "set_btc_alert"}}}}]}}
{"beginRendering": {"root": "root"}}
\`\`\`

For "List upcoming tech conferences":
\`\`\`json
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["events_header", "event_list"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "events_header", "component": {"Text": {"text": {"literalString": "Upcoming Tech Conferences"}, "usageHint": "h2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "event_list", "component": {"Column": {"children": {"explicitList": ["event_1", "event_2"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "event_1", "component": {"EventCard": {"name": {"literalString": "Google I/O"}, "date": {"literalString": "May 14, 2026"}, "location": {"literalString": "Mountain View, CA"}}}}]}}
{"surfaceUpdate": {"components": [{"id": "event_2", "component": {"EventCard": {"name": {"literalString": "WWDC"}, "date": {"literalString": "June 2, 2026"}, "location": {"literalString": "Cupertino, CA"}}}}]}}
{"beginRendering": {"root": "root"}}
\`\`\`

## Rules
1. Always start with a "root" component (usually Column)
2. End with {"beginRendering": {"root": "root"}}
3. Use unique IDs for each component
4. Reference child components by their ID
5. Use literalString for text values
6. Include actions for interactive elements
7. Mark paid data with isPaid: true

Return A2UI JSON when the response would benefit from visual presentation (lists, cards, prices, events, forms, etc.).
`;

/**
 * Parse LLM output that may contain A2UI JSON
 * The LLM might return A2UI inline or in a structured format
 */
export function extractA2UIFromResponse(response: string | object): unknown[] {
    if (typeof response === 'object') {
        // Check if it's already A2UI format
        if (Array.isArray(response)) return response;
        if ('surfaceUpdate' in response || 'dataModelUpdate' in response || 'beginRendering' in response) {
            return [response];
        }
    }

    if (typeof response !== 'string') return [];

    // Try to extract JSON lines (JSONL format)
    const messages: unknown[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;

        try {
            const parsed = JSON.parse(trimmed);
            if ('surfaceUpdate' in parsed || 'dataModelUpdate' in parsed || 'beginRendering' in parsed) {
                messages.push(parsed);
            }
        } catch {
            // Not valid JSON, skip
        }
    }

    return messages;
}

/**
 * Helper to wrap raw data in basic A2UI format
 * Used as fallback when LLM doesn't generate A2UI
 */
export function wrapAsResultCard(title: string, content: unknown): unknown[] {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    return [
        { surfaceUpdate: { components: [{ id: 'root', component: { Column: { children: { explicitList: ['result_card'] } } } }] } },
        { surfaceUpdate: { components: [{ id: 'result_card', component: { Card: { title: { literalString: title }, child: 'content' } } }] } },
        { surfaceUpdate: { components: [{ id: 'content', component: { Text: { text: { literalString: contentStr }, usageHint: 'body' } } }] } },
        { beginRendering: { root: 'root' } },
    ];
}
