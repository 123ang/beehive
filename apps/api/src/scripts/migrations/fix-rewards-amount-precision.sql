-- Migration: Fix decimal precision from DECIMAL(18,18) to DECIMAL(36,18)
-- DECIMAL(18,18) can only store values < 1, causing truncation for amounts like 100 USDT
-- DECIMAL(36,18) allows up to 18 digits before decimal point and 18 after

-- Fix rewards table
ALTER TABLE `rewards` 
MODIFY COLUMN `amount` DECIMAL(36, 18) NOT NULL;

-- Fix users table
ALTER TABLE `users` 
MODIFY COLUMN `total_spent` DECIMAL(36, 18) DEFAULT 0;

ALTER TABLE `users` 
MODIFY COLUMN `total_rewards` DECIMAL(36, 18) DEFAULT 0;

ALTER TABLE `users` 
MODIFY COLUMN `referral_rewards_earned` DECIMAL(36, 18) DEFAULT 0;

-- Fix members table
ALTER TABLE `members` 
MODIFY COLUMN `total_inflow` DECIMAL(36, 18) DEFAULT 0;

ALTER TABLE `members` 
MODIFY COLUMN `total_outflow_usdt` DECIMAL(36, 18) DEFAULT 0;

ALTER TABLE `members` 
MODIFY COLUMN `total_outflow_bcc` DECIMAL(36, 18) DEFAULT 0;

ALTER TABLE `members` 
MODIFY COLUMN `bcc_balance` DECIMAL(36, 18) DEFAULT 0;

-- Fix levels table
ALTER TABLE `levels` 
MODIFY COLUMN `price_usdt` DECIMAL(36, 18) NOT NULL;

ALTER TABLE `levels` 
MODIFY COLUMN `bcc_reward` DECIMAL(36, 18) NOT NULL;

-- Fix dashboard_metrics table
ALTER TABLE `dashboard_metrics` 
MODIFY COLUMN `metric_value` DECIMAL(36, 18) NOT NULL;

-- Fix nft_collections table
ALTER TABLE `nft_collections` 
MODIFY COLUMN `bcc_reward` DECIMAL(36, 18) NOT NULL;

