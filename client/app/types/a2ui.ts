/**
 * A2UI Type Definitions
 * Based on A2UI Protocol v0.8 (a2ui.org)
 * 
 * These types define the message format for agent-generated UI components.
 */

// --- Core A2UI Message Types ---

export interface A2UISurfaceUpdate {
    surfaceUpdate: {
        components: A2UIComponent[];
    };
}

export interface A2UIDataModelUpdate {
    dataModelUpdate: {
        contents: Record<string, unknown>;
    };
}

export interface A2UIBeginRendering {
    beginRendering: {
        root: string;
    };
}

export interface A2UIUserAction {
    userAction: {
        action: A2UIAction;
        componentId: string;
        data?: Record<string, unknown>;
    };
}

export type A2UIMessage = A2UISurfaceUpdate | A2UIDataModelUpdate | A2UIBeginRendering;

// --- Component Types ---

export interface A2UIComponent {
    id: string;
    component: A2UIComponentDefinition;
}

export type A2UIComponentDefinition =
    | { Text: A2UITextProps }
    | { Button: A2UIButtonProps }
    | { Card: A2UICardProps }
    | { Row: A2UIRowProps }
    | { Column: A2UIColumnProps }
    | { Image: A2UIImageProps }
    | { EventCard: A2UIEventCardProps }
    | { PriceTracker: A2UIPriceTrackerProps }
    | { AlertButton: A2UIAlertButtonProps }
    | { Divider: A2UIDividerProps }
    | { Badge: A2UIBadgeProps }
    | { ProgressBar: A2UIProgressBarProps };

// --- Value Types ---

export interface A2UILiteralString {
    literalString: string;
}

export interface A2UIBoundValue {
    boundValue: {
        path: string; // JSON Pointer
    };
}

export type A2UIStringValue = A2UILiteralString | A2UIBoundValue | string;

export interface A2UIAction {
    name: string;
    payload?: Record<string, unknown>;
}

// --- Component Props ---

export interface A2UITextProps {
    text: A2UIStringValue;
    usageHint?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
    color?: string;
}

export interface A2UIButtonProps {
    label: A2UIStringValue;
    action: A2UIAction;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    disabled?: boolean;
    icon?: string;
}

export interface A2UICardProps {
    child?: string; // Reference to child component ID
    title?: A2UIStringValue;
    subtitle?: A2UIStringValue;
}

export interface A2UIRowProps {
    children: { explicitList: string[] };
    alignment?: 'start' | 'center' | 'end' | 'spaceBetween';
    gap?: number;
}

export interface A2UIColumnProps {
    children: { explicitList: string[] };
    alignment?: 'start' | 'center' | 'end';
    gap?: number;
}

export interface A2UIImageProps {
    url: A2UIStringValue;
    alt?: A2UIStringValue;
    width?: number;
    height?: number;
}

export interface A2UIDividerProps {
    thickness?: number;
}

export interface A2UIBadgeProps {
    text: A2UIStringValue;
    variant?: 'success' | 'warning' | 'error' | 'info';
}

export interface A2UIProgressBarProps {
    value: number;
    max?: number;
    label?: A2UIStringValue;
}

// --- Custom Components (Our Catalog) ---

export interface A2UIEventCardProps {
    name: A2UIStringValue;
    date: A2UIStringValue;
    location: A2UIStringValue;
    description?: A2UIStringValue;
    imageUrl?: A2UIStringValue;
    onDetails?: A2UIAction;
}

export interface A2UIPriceTrackerProps {
    symbol: A2UIStringValue;
    price: number;
    target?: number;
    change24h?: number;
    onAlert?: A2UIAction;
    isPaid?: boolean; // x402 indicator
}

export interface A2UIAlertButtonProps {
    label: A2UIStringValue;
    action: A2UIAction;
    icon?: 'bell' | 'alarm' | 'notification' | 'check';
    variant?: 'primary' | 'secondary';
}

// --- Helper Functions ---

export function resolveStringValue(value: A2UIStringValue, data?: Record<string, unknown>): string {
    if (typeof value === 'string') return value;
    if ('literalString' in value) return value.literalString;
    if ('boundValue' in value && data) {
        // Simple JSON pointer resolution
        const path = value.boundValue.path.replace(/^\//, '').split('/');
        let result: unknown = data;
        for (const key of path) {
            if (result && typeof result === 'object') {
                result = (result as Record<string, unknown>)[key];
            }
        }
        return String(result ?? '');
    }
    return '';
}

export function getComponentType(def: A2UIComponentDefinition): string {
    return Object.keys(def)[0];
}

export function getComponentProps(def: A2UIComponentDefinition): unknown {
    return Object.values(def)[0];
}
