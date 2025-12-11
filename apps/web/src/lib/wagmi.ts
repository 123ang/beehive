import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, arbitrumSepolia } from "wagmi/chains";

// WalletConnect Project ID (get one at https://cloud.walletconnect.com)
// IMPORTANT: This must be set in .env file BEFORE building
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || "bbef8141df63638e7cd94f8b9c098b68";

export const config = getDefaultConfig({
  appName: "Beehive",
  projectId,
  chains: [arbitrum, arbitrumSepolia],
  ssr: true,
});

