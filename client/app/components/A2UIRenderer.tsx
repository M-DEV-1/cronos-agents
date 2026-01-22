'use client';

import React from 'react';
import { A2UIProvider, A2UIRenderer as SDKRenderer } from '@a2ui-sdk/react/0.9';
import { A2UIMessage } from '../types/a2ui';

interface A2UIRendererProps {
    messages: A2UIMessage[];
    onAction?: (action: any) => void;
}

export default function A2UIRenderer({ messages, onAction }: A2UIRendererProps) {
    const handleAction = (payload: any) => {
        // Adapt payload if necessary or let it pass through
        if (onAction) onAction(payload);
    };

    return (
        <A2UIProvider messages={messages}>
            <div className="a2ui-root w-full space-y-4">
                <SDKRenderer onAction={handleAction} />
            </div>
        </A2UIProvider>
    );
}
