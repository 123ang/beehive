import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc, bscTestnet, arbitrum, arbitrumSepolia } from "wagmi/chains";

// WalletConnect Project ID (get one at https://cloud.walletconnect.com)
// IMPORTANT: This must be set in .env file BEFORE building
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || "75942e05f026935efd50dfbe5c5d337d";

export const config = getDefaultConfig({
  appName: "Beehive",
  projectId,
  chains: [bsc, bscTestnet, arbitrum, arbitrumSepolia], // BSC first
  ssr: true,
});

