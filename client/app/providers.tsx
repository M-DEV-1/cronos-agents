'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { cronosTestnet } from 'wagmi/chains';
import { metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const projectId = '3fcc6b760e911296e85e54c601004C88'; // Example project ID

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

    if (!config) return null; // Avoid rendering until config is ready

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
