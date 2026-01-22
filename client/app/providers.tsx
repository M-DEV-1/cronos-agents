'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { cronosTestnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const config = createConfig({
    chains: [cronosTestnet],
    connectors: [
        injected(), // Uses window.ethereum directly
    ],
    transports: {
        [cronosTestnet.id]: http(),
    },
    ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
