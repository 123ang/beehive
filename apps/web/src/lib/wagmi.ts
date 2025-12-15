import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  trustWallet,
  rainbowWallet,
  rabbyWallet,
  zerionWallet,
  tokenPocketWallet,
  bitgetWallet,
  okxWallet,
  imTokenWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { bsc, bscTestnet, arbitrum, arbitrumSepolia } from "wagmi/chains";
import type { Chain } from "viem";

// WalletConnect Project ID (get one at https://cloud.walletconnect.com)
// IMPORTANT: This must be set in .env file BEFORE building
const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || "75942e05f026935efd50dfbe5c5d337d";

const appName = "Beehive";

const chains = [bsc, bscTestnet, arbitrum, arbitrumSepolia] as [Chain, ...Chain[]];

// Custom wallet list, similar to the richer modal you want
const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [
        metaMaskWallet,
        tokenPocketWallet, // TokenPocket - explicitly shown
        walletConnectWallet,
        coinbaseWallet,
        rainbowWallet,
      ],
    },
    {
      groupName: "More",
      wallets: [
        trustWallet,
        rabbyWallet,
        zerionWallet,
        bitgetWallet,
        okxWallet,
        imTokenWallet,
      ],
    },
  ],
  {
    appName,
    projectId,
  }
);

export const config = createConfig({
  chains,
  connectors,
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
  ssr: true,
});

