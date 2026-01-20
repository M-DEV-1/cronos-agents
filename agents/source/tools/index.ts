/**
 * Source Agent Tools
 * Export all tools for use in the source agent.
 */

// Search & Information
export { webSearch } from './web-search.js';
export { news } from './news.js';
export { events } from './events.js';
export { wikipedia } from './wikipedia.js';
export { youtube } from './youtube.js';

// Utilities
export { weather } from './weather.js';
export { calculator } from './calculator.js';
export { reminders } from './reminders.js';

// Blockchain & Crypto
export { cryptoPrice } from './crypto-price.js';
export { blockchain } from './blockchain.js';

// Developer Tools
export { github } from './github.js';

// x402 Payment Utilities
export {
    getPaymentInfo,
    createPaidFunctionTool,
    listToolsWithPricing,
    type PaidToolResult,
} from './paid-wrapper.js';

// Convenience: Export all tools as an array
import { webSearch } from './web-search.js';
import { news } from './news.js';
import { events } from './events.js';
import { wikipedia } from './wikipedia.js';
import { youtube } from './youtube.js';
import { weather } from './weather.js';
import { calculator } from './calculator.js';
import { reminders } from './reminders.js';
import { cryptoPrice } from './crypto-price.js';
import { blockchain } from './blockchain.js';
import { github } from './github.js';

export const allTools = [
    webSearch,
    news,
    events,
    wikipedia,
    youtube,
    weather,
    calculator,
    reminders,
    cryptoPrice,
    blockchain,
    github,
];
