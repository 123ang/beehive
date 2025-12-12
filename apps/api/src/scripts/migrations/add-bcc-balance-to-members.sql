-- Migration: Add bcc_balance column to members table
-- Run this migration to add BCC balance tracking to members table

-- Add bcc_balance column if it doesn't exist
ALTER TABLE `members` 
ADD COLUMN IF NOT EXISTS `bcc_balance` DECIMAL(18, 6) DEFAULT 0 AFTER `total_outflow_bcc`;

-- Initialize balance for existing members based on their rewards
-- This calculates the total BCC rewards from the rewards table and sets it as the initial balance
UPDATE `members` m
SET `bcc_balance` = (
  SELECT COALESCE(SUM(CAST(r.amount AS DECIMAL(18, 6))), 0)
  FROM `rewards` r
  WHERE r.recipient_wallet = m.wallet_address
    AND r.currency = 'BCC'
    AND r.reward_type = 'bcc_token'
    AND r.status = 'instant'
);

