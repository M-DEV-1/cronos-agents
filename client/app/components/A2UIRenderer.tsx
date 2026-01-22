'use client';

import React from 'react';
import {
    A2UIComponent,
    A2UIComponentDefinition,
    A2UIMessage,
    A2UIUserAction,
    A2UITextProps,
    A2UIButtonProps,
    A2UICardProps,
    A2UIRowProps,
    A2UIColumnProps,
    A2UIEventCardProps,
    A2UIPriceTrackerProps,
    A2UIAlertButtonProps,
    A2UIBadgeProps,
    resolveStringValue,
    getComponentType,
    getComponentProps,
} from '../types/a2ui';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Calendar, MapPin, TrendingUp, TrendingDown, Bell, Zap, AlertTriangle } from 'lucide-react';

interface A2UIRendererProps {
    components: Map<string, A2UIComponent>;
    rootId: string;
    dataModel?: Record<string, unknown>;
    onAction?: (action: A2UIUserAction) => void;
}

export function A2UIRenderer({ components, rootId, dataModel = {}, onAction }: A2UIRendererProps) {
    const renderComponent = (id: string): React.ReactNode => {
        const component = components.get(id);
        if (!component) return null;

        const type = getComponentType(component.component);
        const props = getComponentProps(component.component);

        switch (type) {
            case 'Text':
                return <A2UIText key={id} {...(props as A2UITextProps)} data={dataModel} />;
            case 'Button':
                return <A2UIButton key={id} id={id} {...(props as A2UIButtonProps)} data={dataModel} onAction={onAction} />;
            case 'Card':
                return <A2UICard key={id} {...(props as A2UICardProps)} data={dataModel} renderChild={renderComponent} />;
            case 'Row':
                return <A2UIRow key={id} {...(props as A2UIRowProps)} renderChild={renderComponent} />;
            case 'Column':
                return <A2UIColumn key={id} {...(props as A2UIColumnProps)} renderChild={renderComponent} />;
            case 'EventCard':
                return <A2UIEventCard key={id} id={id} {...(props as A2UIEventCardProps)} data={dataModel} onAction={onAction} />;
            case 'PriceTracker':
                return <A2UIPriceTracker key={id} id={id} {...(props as A2UIPriceTrackerProps)} data={dataModel} onAction={onAction} />;
            case 'AlertButton':
                return <A2UIAlertButton key={id} id={id} {...(props as A2UIAlertButtonProps)} data={dataModel} onAction={onAction} />;
            case 'Badge':
                return <A2UIBadge key={id} {...(props as A2UIBadgeProps)} data={dataModel} />;
            case 'Divider':
                return <hr key={id} className="border-[var(--border)] my-4" />;
            default:
                return <div key={id} className="text-[var(--text-tertiary)] text-sm">Unknown: {type}</div>;
        }
    };

    return <div className="a2ui-root">{renderComponent(rootId)}</div>;
}

// --- Component Implementations ---

function A2UIText({ text, usageHint, color, data }: A2UITextProps & { data?: Record<string, unknown> }) {
    const resolved = resolveStringValue(text, data);
    const styles: Record<string, string> = {
        h1: 'text-2xl font-bold text-[var(--text-primary)]',
        h2: 'text-xl font-semibold text-[var(--text-primary)]',
        h3: 'text-lg font-medium text-[var(--text-primary)]',
        body: 'text-base text-[var(--text-secondary)]',
        caption: 'text-sm text-[var(--text-tertiary)]',
        label: 'text-xs uppercase tracking-wider text-[var(--text-tertiary)]',
    };
    return <span className={styles[usageHint || 'body']} style={color ? { color } : undefined}>{resolved}</span>;
}

function A2UIButton({ id, label, action, variant = 'primary', disabled, icon, data, onAction }: A2UIButtonProps & { id: string; data?: Record<string, unknown>; onAction?: (a: A2UIUserAction) => void }) {
    const resolved = resolveStringValue(label, data);
    const variants: Record<string, string> = {
        primary: 'btn-primary',
        secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
        outline: 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
        danger: 'bg-[var(--error)] text-white hover:opacity-90',
    };

    const handleClick = () => {
        if (!action) return;

        // Handle open_url action
        if (action.name === 'open_url') {
            let url: string | undefined;
            if (typeof action.payload === 'string') {
                url = action.payload;
            } else if (action.payload && typeof action.payload === 'object' && 'url' in action.payload) {
                // @ts-ignore
                url = action.payload.url as string;
            }

            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
                return;
            }
        }
        // For other actions, call onAction callback
        onAction?.({ userAction: { action, componentId: id } });
    };

    return (
        <button
            className={`px-4 py-2 rounded-xl font-medium transition-all ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
            onClick={handleClick}
        >
            {resolved}
        </button>
    );
}

function A2UICard({ child, title, subtitle, data, renderChild }: A2UICardProps & { data?: Record<string, unknown>; renderChild: (id: string) => React.ReactNode }) {
    return (
        <Card className="bg-[var(--bg-tertiary)] border-[var(--border)] shadow-sm hover:shadow-md transition-all duration-200">
            {(title || subtitle) && (
                <CardHeader className="pb-2">
                    {title && <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">{resolveStringValue(title, data)}</CardTitle>}
                    {subtitle && <p className="text-sm text-[var(--text-secondary)]">{resolveStringValue(subtitle, data)}</p>}
                </CardHeader>
            )}
            <CardContent className="pt-2">
                {child && renderChild(child)}
            </CardContent>
        </Card>
    );
}

function A2UIRow({ children, alignment = 'start', gap = 2, renderChild }: A2UIRowProps & { renderChild: (id: string) => React.ReactNode }) {
    const alignments: Record<string, string> = {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        spaceBetween: 'justify-between',
    };
    return (
        <div className={`flex flex-row items-center ${alignments[alignment]} gap-${gap}`}>
            {children.explicitList.map(renderChild)}
        </div>
    );
}

function A2UIColumn({ children, alignment = 'start', gap = 2, renderChild }: A2UIColumnProps & { renderChild: (id: string) => React.ReactNode }) {
    const alignments: Record<string, string> = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
    };
    return (
        <div className={`flex flex-col ${alignments[alignment]} gap-${gap}`}>
            {children.explicitList.map(renderChild)}
        </div>
    );
}

function A2UIEventCard({ id, name, date, location, description, imageUrl, onDetails, data, onAction }: A2UIEventCardProps & { id: string; data?: Record<string, unknown>; onAction?: (a: A2UIUserAction) => void }) {
    return (
        <Card className="bg-[var(--bg-tertiary)] border-[var(--border)] overflow-hidden">
            {imageUrl && (
                <div className="h-32 bg-gradient-to-br from-[var(--accent)] to-teal-700 flex items-center justify-center">
                    <Calendar size={48} className="text-white/50" />
                </div>
            )}
            <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-[var(--text-primary)]">{resolveStringValue(name, data)}</h4>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Calendar size={14} />
                    <span>{resolveStringValue(date, data)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <MapPin size={14} />
                    <span>{resolveStringValue(location, data)}</span>
                </div>
                {description && <p className="text-sm text-[var(--text-tertiary)]">{resolveStringValue(description, data)}</p>}
                {onDetails && (
                    <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => onAction?.({ userAction: { action: onDetails, componentId: id } })}
                    >
                        View Details
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function A2UIPriceTracker({ id, symbol, price, target, change24h, onAlert, isPaid, data, onAction }: A2UIPriceTrackerProps & { id: string; data?: Record<string, unknown>; onAction?: (a: A2UIUserAction) => void }) {
    const symbolStr = resolveStringValue(symbol, data);
    const isUp = (change24h ?? 0) >= 0;
    const progress = target ? Math.min((price / target) * 100, 100) : 0;

    return (
        <Card className="bg-[var(--bg-tertiary)] border-[var(--border)]">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-sm">
                            {symbolStr.slice(0, 3)}
                        </div>
                        <div>
                            <h4 className="font-semibold text-[var(--text-primary)]">{symbolStr}</h4>
                            {isPaid && (
                                <span className="inline-flex items-center gap-1 text-xs text-[var(--accent)]">
                                    <Zap size={10} /> x402 Paid
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-[var(--text-primary)]">${price.toLocaleString()}</p>
                        {change24h !== undefined && (
                            <p className={`text-sm flex items-center justify-end gap-1 ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                                {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {isUp ? '+' : ''}{change24h.toFixed(2)}%
                            </p>
                        )}
                    </div>
                </div>

                {target && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-tertiary)]">Target</span>
                            <span className="text-[var(--text-secondary)]">${target.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[var(--accent)] to-teal-400 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] text-center">{progress.toFixed(1)}% to target</p>
                    </div>
                )}

                {onAlert && (
                    <button
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
                        onClick={() => onAction?.({ userAction: { action: onAlert, componentId: id } })}
                    >
                        <Bell size={18} />
                        Alert me at ${target?.toLocaleString() ?? price.toLocaleString()}
                    </button>
                )}
            </CardContent>
        </Card>
    );
}

function A2UIAlertButton({ id, label, action, icon = 'bell', variant = 'primary', data, onAction }: A2UIAlertButtonProps & { id: string; data?: Record<string, unknown>; onAction?: (a: A2UIUserAction) => void }) {
    const icons = { bell: Bell, alarm: AlertTriangle, notification: Bell, check: Zap };
    const IconComponent = icons[icon] || Bell;
    const resolved = resolveStringValue(label, data);

    return (
        <button
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${variant === 'primary' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                }`}
            onClick={() => onAction?.({ userAction: { action, componentId: id } })}
        >
            <IconComponent size={18} />
            {resolved}
        </button>
    );
}

function A2UIBadge({ text, variant = 'info', data }: A2UIBadgeProps & { data?: Record<string, unknown> }) {
    const resolved = resolveStringValue(text, data);
    const variants: Record<string, string> = {
        success: 'bg-green-500/20 text-green-400 border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        error: 'bg-red-500/20 text-red-400 border-red-500/30',
        info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return (
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${variants[variant]}`}>
            {resolved}
        </span>
    );
}

// --- Helper: Parse A2UI stream and build component map ---

export function parseA2UIStream(messages: A2UIMessage[]): { components: Map<string, A2UIComponent>; rootId: string | null; dataModel: Record<string, unknown> } {
    const components = new Map<string, A2UIComponent>();
    let rootId: string | null = null;
    let dataModel: Record<string, unknown> = {};

    for (const msg of messages) {
        if ('surfaceUpdate' in msg) {
            for (const comp of msg.surfaceUpdate.components) {
                components.set(comp.id, comp);
            }
        } else if ('dataModelUpdate' in msg) {
            dataModel = { ...dataModel, ...msg.dataModelUpdate.contents };
        } else if ('beginRendering' in msg) {
            rootId = msg.beginRendering.root;
        }
    }

    return { components, rootId, dataModel };
}
