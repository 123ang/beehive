"use client";

import { useEffect, useState, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { api } from "@/lib/api";

// Global auth state to share across components
let authState = {
  isAuthenticated: false,
  isAuthenticating: false,
  hasAttempted: false,
};

// Event emitter for auth state changes
const authListeners = new Set<() => void>();
export const onAuthStateChange = (callback: () => void) => {
  authListeners.add(callback);
  return () => authListeners.delete(callback);
};
const notifyAuthStateChange = () => {
  authListeners.forEach((cb) => cb());
};

/**
 * Component that automatically authenticates user after wallet connection
 * Signs a message and gets JWT token for API access
 */
export function AutoAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    const authenticate = async () => {
      if (!isConnected || !address || isAuthenticating || hasAttemptedRef.current) {
        return;
      }

      // Check if already has valid token
      const existingToken = api.getToken();
      if (existingToken) {
        try {
          // Verify token is still valid
          const meResult = await api.getMe();
          if (meResult.success) {
            authState.isAuthenticated = true;
            notifyAuthStateChange();
            console.log("✅ Already authenticated with valid token");
            return;
          } else {
            // Token invalid, clear it
            api.setToken(null);
            console.log("⚠️ Token invalid, re-authenticating...");
          }
        } catch (error) {
          console.error("Error verifying token:", error);
          api.setToken(null);
        }
      }

      setIsAuthenticating(true);
      authState.isAuthenticating = true;
      hasAttemptedRef.current = true;
      authState.hasAttempted = true;
      notifyAuthStateChange();

      try {
        console.log("🔐 Starting authentication for:", address);
        
        // Step 1: Get nonce
        const nonceResult = await api.getNonce(address);
        if (!nonceResult.success || !nonceResult.data) {
          console.error("❌ Failed to get nonce:", nonceResult.error);
          return;
        }

        const { message } = nonceResult.data;
        console.log("📝 Got nonce, requesting signature...");

        // Step 2: Sign message
        let signature: string;
        try {
          signature = await signMessageAsync({ message });
          console.log("✍️ Message signed successfully");
        } catch (signError: any) {
          // User rejected signature
          console.log("❌ User rejected signature");
          hasAttemptedRef.current = false;
          authState.hasAttempted = false;
          return;
        }

        // Step 3: Verify signature and get JWT
        console.log("🔍 Verifying signature...");
        const verifyResult = await api.verify(address, message, signature);
        if (verifyResult.success && verifyResult.data?.token) {
          api.setToken(verifyResult.data.token);
          authState.isAuthenticated = true;
          console.log("✅ Authenticated successfully! Token stored.");
          notifyAuthStateChange();
          
          // Small delay before reload to ensure token is saved
          setTimeout(() => {
            console.log("🔄 Reloading page to fetch member data...");
            window.location.reload();
          }, 100);
        } else {
          console.error("❌ Verification failed:", verifyResult.error);
          hasAttemptedRef.current = false;
          authState.hasAttempted = false;
        }
      } catch (error) {
        console.error("❌ Authentication error:", error);
        hasAttemptedRef.current = false;
        authState.hasAttempted = false;
      } finally {
        setIsAuthenticating(false);
        authState.isAuthenticating = false;
        notifyAuthStateChange();
      }
    };

    authenticate();
  }, [address, isConnected, signMessageAsync, isAuthenticating]);

  // Reset auth attempt when wallet changes or disconnects
  useEffect(() => {
    if (!isConnected) {
      hasAttemptedRef.current = false;
      authState.hasAttempted = false;
      authState.isAuthenticated = false;
      api.setToken(null);
      notifyAuthStateChange();
    }
  }, [isConnected, address]);

  return null;
}

// Export function to check auth state
export const isAuthenticated = () => authState.isAuthenticated;
export const isAuthenticating = () => authState.isAuthenticating;

