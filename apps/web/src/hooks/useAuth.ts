"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { api } from "@/lib/api";

interface User {
  id: number;
  walletAddress: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  language: string;
  isAdmin: boolean;
}

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    const token = api.getToken();
    if (token && isConnected) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setUser(null);
      setIsAuthenticated(false);
      api.setToken(null);
    }
  }, [isConnected]);

  const fetchUser = async () => {
    try {
      const result = await api.getMe();
      if (result.success && result.data) {
        setUser(result.data);
        setIsAuthenticated(true);
      } else {
        // Token invalid, clear it
        api.setToken(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      api.setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = useCallback(async () => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);

    try {
      // Step 1: Get nonce from server
      const nonceResult = await api.getNonce(address);
      if (!nonceResult.success || !nonceResult.data) {
        throw new Error(nonceResult.error || "Failed to get nonce");
      }

      const { message } = nonceResult.data;

      // Step 2: Sign the message
      const signature = await signMessageAsync({ message });

      // Step 3: Verify signature and get JWT
      const verifyResult = await api.verify(address, message, signature);
      if (!verifyResult.success || !verifyResult.data) {
        throw new Error(verifyResult.error || "Failed to verify signature");
      }

      // Step 4: Store token and user
      api.setToken(verifyResult.data.token);
      setUser(verifyResult.data.user);
      setIsAuthenticated(true);

      return verifyResult.data.user;
    } catch (error: any) {
      console.error("Sign in failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [address, signMessageAsync]);

  const signOut = useCallback(() => {
    api.setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    refetch: fetchUser,
  };
}



