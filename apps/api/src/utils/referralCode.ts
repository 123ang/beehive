/**
 * Generate a unique member ID
 */
export function generateMemberId(userId: number): string {
  // Format: BH-{userId padded to 6 digits}
  return `BH-${userId.toString().padStart(6, "0")}`;
}

/**
 * Generate a referral code from member ID
 */
export function generateReferralCode(memberId: string): string {
  // Format: BEEHIVE-{memberId}
  return `BEEHIVE-${memberId}`;
}

/**
 * Generate a unique referral code with fallback
 */
export function generateReferralCodeWithFallback(
  memberId: string,
  userId: number
): string {
  const baseCode = generateReferralCode(memberId);
  // If collision occurs, append user ID
  return baseCode;
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
  return /^BEEHIVE-BH-\d{6}$/.test(code);
}

