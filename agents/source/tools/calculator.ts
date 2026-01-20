import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * Calculator Tool
 * Performs mathematical calculations.
 */
export const calculator = new FunctionTool({
    name: 'calculate',
    description: 'Perform mathematical calculations. Supports basic arithmetic, exponents, and common functions.',
    parameters: z.object({
        expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 2", "15 * 3", "2^10", "sqrt(144)")'),
    }),
    execute: ({ expression }) => {
        try {
            const result = evaluateExpression(expression);
            return {
                status: 'success',
                expression,
                result,
            };
        } catch (error) {
            return {
                status: 'error',
                expression,
                error_message: `Could not evaluate expression: ${expression}. Please use valid mathematical syntax.`,
            };
        }
    },
});

function evaluateExpression(expr: string): number {
    // Sanitize and transform common notations
    let sanitized = expr
        .replace(/\s+/g, '') // Remove whitespace
        .replace(/\^/g, '**') // Convert ^ to **
        .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
        .replace(/sin\(([^)]+)\)/gi, 'Math.sin($1)')
        .replace(/cos\(([^)]+)\)/gi, 'Math.cos($1)')
        .replace(/tan\(([^)]+)\)/gi, 'Math.tan($1)')
        .replace(/log\(([^)]+)\)/gi, 'Math.log10($1)')
        .replace(/ln\(([^)]+)\)/gi, 'Math.log($1)')
        .replace(/abs\(([^)]+)\)/gi, 'Math.abs($1)')
        .replace(/pi/gi, 'Math.PI')
        .replace(/e(?![a-z])/gi, 'Math.E');

    // Security: Only allow safe mathematical characters
    if (!/^[\d\s+\-*/.()Math,sqrtincoabslgpE]+$/.test(sanitized)) {
        throw new Error('Invalid characters in expression');
    }

    // Evaluate using Function constructor (safer than eval for this use case)
    const fn = new Function(`return ${sanitized}`);
    const result = fn();

    if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid result');
    }

    return Math.round(result * 1000000) / 1000000; // Round to 6 decimal places
}
