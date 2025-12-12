-- Migration: Ensure referral_code column exists in users table
-- This column should already exist, but this ensures it's properly configured

-- Add referral_code column if it doesn't exist
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `referral_code` VARCHAR(50) NULL UNIQUE AFTER `member_id`;

-- Create index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS `users_referral_code_idx` ON `users`(`referral_code`);

