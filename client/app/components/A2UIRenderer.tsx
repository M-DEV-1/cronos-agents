'use client';

import React, { useEffect, useState } from 'react';
import { A2UIProvider, A2UIRenderer as SDKRenderer } from '@a2ui-sdk/react/0.9';
import { A2UIMessage } from '../types/a2ui';
import { Loader2 } from 'lucide-react';

interface A2UIRendererProps {
    messages: A2UIMessage[];
    onAction?: (action: unknown) => void;
    isLoading?: boolean;
}

/**
 * A2UI Renderer - renders real A2UI components from the SDK
 * No fallbacks - uses actual A2UI SDK rendering
 */
export default function A2UIRenderer({ messages, onAction, isLoading }: A2UIRendererProps) {
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleAction = (payload: unknown) => {
        console.log('[A2UI] Action triggered:', payload);
        if (onAction) onAction(payload);
    };

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
            <div className="a2ui-root w-full">
                <SDKRenderer onAction={handleAction} />
            </div>
        </A2UIProvider>
    );
}
