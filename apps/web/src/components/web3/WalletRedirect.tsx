"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useRouter, usePathname } from "next/navigation";

/**
 * Component that redirects to dashboard after wallet connection
 * Only redirects from the home page
 */
export function WalletRedirect() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const previouslyConnected = useRef(isConnected);

  useEffect(() => {
    // Only redirect if:
    // 1. User just connected (wasn't connected before)
    // 2. Currently on home page
    // 3. Haven't redirected yet in this session
    const justConnected = isConnected && !previouslyConnected.current;
    const isHomePage = pathname === "/";

    if (justConnected && isHomePage && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/user/dashboard");
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


