/**
 * Generate a unique member ID
 */
export function generateMemberId(userId: number): string {
  // Format: BH-{userId padded to 6 digits}
  return `BH-${userId.toString().padStart(6, "0")}`;
}

/**
 * Generate a random 8-character alphanumeric referral code (lowercase)
 */
export function generateReferralCode(memberId?: string): string {
  // Generate 8 random lowercase alphanumeric characters
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
 * Validate referral code format (8 lowercase alphanumeric characters)
 */
export function isValidReferralCode(code: string): boolean {
  return /^[a-z0-9]{8}$/.test(code);
}

