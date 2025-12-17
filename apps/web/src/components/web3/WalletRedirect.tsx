"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useRouter, usePathname } from "next/navigation";

/**
 * Component that redirects to dashboard after wallet connection
 * Only redirects from specific pages (not home page)
 * Home page allows users to browse freely regardless of registration status
 */
export function WalletRedirect() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const previouslyConnected = useRef(isConnected);

  useEffect(() => {
    // Don't redirect from home page - allow users to browse freely
    // Only redirect from other pages if needed (can be extended later)
    const isHomePage = pathname === "/";
    
    if (isHomePage) {
      // Reset redirect flag on home page to allow free browsing
      hasRedirected.current = false;
    }

    // Update previous state
    previouslyConnected.current = isConnected;

    // Reset redirect flag when disconnected
    if (!isConnected) {
      hasRedirected.current = false;
    }
  }, [isConnected, pathname, router]);

  return null;
}


