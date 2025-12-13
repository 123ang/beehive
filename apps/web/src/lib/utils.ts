import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format wallet address
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Format number with commas
export function formatNumber(num: number | string, decimals = 2): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Format USDT (6 decimals)
export function formatUSDT(amount: bigint | string | number): string {
  const value = typeof amount === "bigint" ? amount : BigInt(amount || 0);
  const formatted = Number(value) / 1e6;
  return formatNumber(formatted);
}

// Format BCC (18 decimals)
export function formatBCC(amount: bigint | string | number): string {
  const value = typeof amount === "bigint" ? amount : BigInt(amount || 0);
  const formatted = Number(value) / 1e18;
  return formatNumber(formatted);
}

// Parse USDT to wei (6 decimals)
export function parseUSDT(amount: number | string): bigint {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return BigInt(Math.floor(value * 1e6));
}

// Parse BCC to wei (18 decimals)  
export function parseBCC(amount: number | string): bigint {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return BigInt(Math.floor(value * 1e18));
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

// Generate referral link
export function generateReferralLink(address: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://beehive-lifestyle.io";
  return `${base}/register?referral_code=${address}`;
}

// Get level color
export function getLevelColor(level: number): string {
  const colors: Record<number, string> = {
    1: "#CD7F32", // Warrior - Bronze
    2: "#CD7F32", // Bronze
    3: "#C0C0C0", // Silver
    4: "#FFD700", // Gold
    5: "#9B59B6", // Elite - Purple
    6: "#E5E4E2", // Platinum
    7: "#FF6B6B", // Master - Red
    8: "#00CED1", // Diamond - Cyan
    9: "#FF8C00", // Grandmaster - Orange
    10: "#FFD700", // Starlight - Gold
    11: "#9B59B6", // Epic - Purple
    12: "#FFD700", // Legend - Gold
    13: "#FF4500", // Supreme King - Orange-Red
    14: "#FF1493", // Peerless King - Pink
    15: "#FFD700", // Glory King - Gold
    16: "#8B008B", // Legendary - Dark Magenta
    17: "#FF0000", // Supreme - Red
    18: "#00FF00", // Mythic - Green
    19: "#FFD700", // Mythic Apex - Gold
  };
  return colors[level] || "#FBBF24";
}

