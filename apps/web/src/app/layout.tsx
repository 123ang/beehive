import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";

// Dynamically import Providers with SSR disabled to prevent indexedDB errors
const Providers = dynamic(
  () => import("@/components/providers/Providers"),
  { ssr: false }
);

// Fonts
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Metadata
export const metadata: Metadata = {
  metadataBase: new URL("https://beehive-lifestyle.io"),
  title: "Beehive | Web3 Membership Platform",
  description:
    "Join the Beehive community - A revolutionary Web3 membership and rewards platform built on Arbitrum.",
  keywords: [
    "Web3",
    "Membership",
    "NFT",
    "Crypto",
    "Arbitrum",
    "Blockchain",
    "Rewards",
    "BCC",
  ],
  authors: [{ name: "Beehive Team" }],
  openGraph: {
    title: "Beehive | Web3 Membership Platform",
    description:
      "Join the Beehive community - A revolutionary Web3 membership and rewards platform.",
    type: "website",
    locale: "en_US",
    siteName: "Beehive",
  },
  twitter: {
    card: "summary_large_image",
    title: "Beehive | Web3 Membership Platform",
    description: "Join the Beehive community - A revolutionary Web3 membership and rewards platform.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
