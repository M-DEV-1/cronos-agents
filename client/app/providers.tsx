'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { cronosTestnet } from 'wagmi/chains';
import { metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = React.useState<any>(null);

    React.useEffect(() => {
        // Only initialize config on client side to avoid SSR/indexedDB issues
        const wagmiConfig = createConfig({
            chains: [cronosTestnet],
            connectors: [
                metaMask(),
                coinbaseWallet({ appName: 'Agents of Truth' }),
                walletConnect({ projectId, showQrModal: true }),
            ],
            transports: {
                [cronosTestnet.id]: http('https://evm-t3.cronos.org'),
            },
            ssr: false, // Explicitly disable SSR for wagmi
        });
        setConfig(wagmiConfig);
    }, []);

    if (!config) return null;

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
