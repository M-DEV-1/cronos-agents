'use client';

import React from 'react';
import { v0_9 } from '@a2ui-sdk/react';

const { A2UIProvider, A2UIRenderer: SDKRenderer } = v0_9;
import { Card, CardContent } from './ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { A2UIMessage } from '../types/a2ui';
import { Loader2 } from 'lucide-react';

interface A2UIRendererProps {
    messages: A2UIMessage[];
    onAction?: (payload: unknown) => void;
}

/**
 * Renders A2UI messages using the official @a2ui-sdk/react library.
 * Wraps the SDK renderer in the required provider.
 */
export default function A2UIRenderer({ messages, onAction }: A2UIRendererProps) {
    // If no messages, render nothing (sidebar handles empty state)
    if (!messages || messages.length === 0) {
        return null;
    }

    if (!mounted) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
                        <span className="text-sm text-[var(--text-secondary)]">Loading A2UI...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (messages.length === 0) {
        return null;
    }

    if (error) {
        return (
            <div className="p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)] text-[var(--error)]">
                <p className="text-sm">A2UI Error: {error}</p>
            </div>
        );
    }

    // Render using the A2UI SDK
    return (
        <A2UIProvider messages={messages}>
            <div className="a2ui-container space-y-4">
                <SDKRenderer onAction={onAction} />
            </div>
        </A2UIProvider>
    );
}
