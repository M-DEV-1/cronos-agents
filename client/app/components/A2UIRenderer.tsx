'use client';

import React, { useEffect, useState } from 'react';
import { v0_9 } from '@a2ui-sdk/react';
import { Loader2 } from 'lucide-react';
import { A2UIMessage } from '../types/a2ui';

const { A2UIProvider, A2UIRenderer: SDKRenderer } = v0_9;

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

    // Render using the A2UI SDK
    return (
        <A2UIProvider messages={messages}>
            <div className="a2ui-container space-y-4">
                <SDKRenderer onAction={onAction} />
            </div>
        </A2UIProvider>
    );
}
