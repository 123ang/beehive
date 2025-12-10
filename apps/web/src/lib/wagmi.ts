import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, arbitrumSepolia } from "wagmi/chains";

// WalletConnect Project ID (get one at https://cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || "demo-project-id";

export const config = getDefaultConfig({
  appName: "Beehive",
  projectId,
  chains: [arbitrum, arbitrumSepolia],
  ssr: true,
});

