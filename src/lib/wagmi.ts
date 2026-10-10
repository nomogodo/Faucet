import { createConfig, http } from 'wagmi'
import { arbitrum, base, mainnet, optimism, polygon } from 'wagmi/chains'
import { coinbaseWallet, injected, metaMask, walletConnect } from 'wagmi/connectors'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim()

const connectors = [
  metaMask(),
  coinbaseWallet({ appName: 'Faucet Protocol' }),
  injected(),
]

if (walletConnectProjectId) {
  connectors.push(walletConnect({
    projectId: walletConnectProjectId,
    metadata: {
      name: 'Faucet Protocol',
      description: 'Wallet web3 de Faucet Protocol',
      url: 'https://my-faucet-pi.vercel.app',
      icons: ['https://my-faucet-pi.vercel.app/pwa-icon.svg'],
    },
  }))
}

export const isWalletConnectConfigured = Boolean(walletConnectProjectId)

export const wagmiConfig = createConfig({
  chains: [mainnet, base, arbitrum, optimism, polygon],
  connectors,
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
  },
})
