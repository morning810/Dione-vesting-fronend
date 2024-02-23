import { defineChain } from 'viem'

export const dione = defineChain({
    id: 13,
    name: 'Odyssey Testnet',
    nativeCurrency: { name: 'Dione', symbol: 'DIONE', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://testnode.dioneprotocol.com/ext/bc/C/rpc'] },
    },
    blockExplorers: {
        default: { name: 'Etherscan', url: 'https://testnet.odysseyscan.com' },
    },
    contracts: {
        ensRegistry: {
            address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
        },
        ensUniversalResolver: {
            address: '0xE4Acdd618deED4e6d2f03b9bf62dc6118FC9A4da',
            blockCreated: 16773775,
        },
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
            blockCreated: 14353601,
        },
    },
})