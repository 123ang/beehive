-- Migration: Add referral_code and member_id columns to members table
-- Run this migration to add referral code support to members table

-- Add member_id column if it doesn't exist
ALTER TABLE `members` 
ADD COLUMN IF NOT EXISTS `member_id` VARCHAR(50) NULL UNIQUE AFTER `direct_sponsor_count`;

-- Add referral_code column if it doesn't exist
ALTER TABLE `members` 
ADD COLUMN IF NOT EXISTS `referral_code` VARCHAR(50) NULL UNIQUE AFTER `member_id`;

-- Create indexes if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS `members_referral_code_idx` ON `members`(`referral_code`);
CREATE UNIQUE INDEX IF NOT EXISTS `members_member_id_idx` ON `members`(`member_id`);

