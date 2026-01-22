import { http, createConfig } from 'wagmi'
import { cronosTestnet } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

export const config = createConfig({
    chains: [cronosTestnet],
    connectors: [
        metaMask(),
    ],
    transports: {
        [cronosTestnet.id]: http(),
    },
})
