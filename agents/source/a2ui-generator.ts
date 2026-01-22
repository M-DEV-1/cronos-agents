export const A2UI_COMPONENT_SCHEMA = `
# A2UI Component Catalog

## Message Types

1. **surfaceUpdate**: Add/update UI components
2. **dataModelUpdate**: Update bound data
3. **beginRendering**: Signal to start rendering (must be last)

## Available Components
Use these primitives to compose any interface you need (Generative UI).

### Layout
- **Column**: Vertical stack. Props: children (explicitList), alignment (start|center|end|stretch), gap (number)
- **Row**: Horizontal stack. Props: children (explicitList), alignment (start|center|end|spaceBetween), gap (number)
- **Card**: Container. Props: title (literalString), child (id), subtitle (literalString)
- **Divider**: Horizontal line.

### Content
- **Text**: Display text. Props: text (literalString), usageHint (h1|h2|h3|body|caption|label), color (hex or var)
- **Image**: Display image. Props: url (literalString), alt (literalString)
- **Badge**: Label/Status. Props: text (literalString), variant (success|warning|error|info)

### Interactive
- **Button**: Action button. Props: label (literalString), action (name, payload?), variant (primary|secondary|outline|danger)
- **AlertButton**: IconButton. Props: label (literalString), action (name, payload?), icon (bell|alarm|check)

## Composition Examples

### Price Tracker (Built from Primitives)
To show a stock price, combine \`Card\` -> \`Row\` -> \`Column\` (Symbol/Name) + \`Column\` (Price/Change).
\`\`\`json
{"surfaceUpdate": {"components": [{"id": "card", "component": {"Card": {"child": "row"}}}]}}
{"surfaceUpdate": {"components": [{"id": "row", "component": {"Row": {"children": {"explicitList": ["left_col", "right_col"]}, "alignment": "spaceBetween"}}}]}}
{"surfaceUpdate": {"components": [{"id": "left_col", "component": {"Column": {"children": {"explicitList": ["symbol", "name"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "symbol", "component": {"Text": {"text": {"literalString": "BTC"}, "usageHint": "h2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "name", "component": {"Text": {"text": {"literalString": "Bitcoin"}, "usageHint": "caption"}}}]}}
{"surfaceUpdate": {"components": [{"id": "right_col", "component": {"Column": {"children": {"explicitList": ["price", "change"]}}}}]}
{"surfaceUpdate": {"components": [{"id": "price", "component": {"Text": {"text": {"literalString": "$97,500"}, "usageHint": "h2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "change", "component": {"Text": {"text": {"literalString": "+2.5%"}, "usageHint": "caption", "color": "var(--success)"}}}]}}
{"beginRendering": {"root": "card"}}
\`\`\`

### Alarm Clock (Built from Primitives)
To show an alarm, use \`Card\` -> \`Row\` (Time | Toggle) -> \`Text\` (Time).
Do NOT invent new components like 'Clock'. Use \`Text\` to display the time string.

## Example: Dynamic UI Generation

For "Show me BTC price with an alert":
\`\`\`json
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["btc_card"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "btc_card", "component": {"Card": {"title": {"literalString": "BTC Price Tracker"}, "child": "tracker"}}}]}}
{"surfaceUpdate": {"components": [{"id": "tracker", "component": {"Row": {"children": {"explicitList": ["btc_symbol_price", "alert_button"]}, "alignment": "spaceBetween"}}}]}}
{"surfaceUpdate": {"components": [{"id": "btc_symbol_price", "component": {"Column": {"children": {"explicitList": ["btc_symbol", "btc_price"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "btc_symbol", "component": {"Text": {"text": {"literalString": "BTC"}, "usageHint": "h2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "btc_price", "component": {"Text": {"text": {"literalString": "$97,500"}, "usageHint": "body"}}}]}}
{"surfaceUpdate": {"components": [{"id": "alert_button", "component": {"AlertButton": {"label": {"literalString": "Set Alert"}, "action": {"name": "set_btc_alert"}, "icon": "bell"}}}]}}
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

/**
 * Clean the response text by removing A2UI JSON lines
 */
export function cleanResponseText(response: string | object): string {
    if (typeof response !== 'string') return '';

    // Split lines and filter out JSON-like lines that are valid A2UI
    const lines = response.split('\n');
    return lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) return true;
        try {
            const parsed = JSON.parse(trimmed);
            // If it's A2UI, filter it out
            if ('surfaceUpdate' in parsed || 'dataModelUpdate' in parsed || 'beginRendering' in parsed) {
                return false;
            }
        } catch { }
        return true;
    }).join('\n').trim();
}
