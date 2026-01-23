'use client';

import React, { useEffect, useState } from 'react';
import { A2UIProvider, A2UIRenderer as SDKRenderer } from '@a2ui-sdk/react/0.9';
import { standardCatalog } from '@a2ui-sdk/react/0.9/standard-catalog';
import { Loader2 } from 'lucide-react';
import { A2UIMessage } from '../types/a2ui';

interface A2UIRendererProps {
    messages: A2UIMessage[];
    onAction?: (payload: unknown) => void;
}

/**
 * Renders A2UI messages using the official @a2ui-sdk/react library.
 * Wraps the SDK renderer in the required provider.
 */
export default function A2UIRenderer({ messages, onAction }: A2UIRendererProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Debug logging
    console.log('[A2UIRenderer] Render with messages:', messages?.length, messages);

    // If no messages, render nothing (sidebar handles empty state)
    if (!messages || messages.length === 0) {
        console.log('[A2UIRenderer] No messages to render');
        return null;
    }

    if (!mounted) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
            </div>
        );
    }

    // Render using the A2UI SDK
    return (
        <A2UIProvider messages={messages} catalog={standardCatalog}>
            <div className="a2ui-container space-y-4">
                <SDKRenderer onAction={onAction} />
            </div>
        </A2UIProvider>
    );
}
