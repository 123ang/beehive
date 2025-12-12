-- Migration: Update all cryptocurrency-related decimal fields from scale 6 to scale 18
-- This ensures all USDT and BCC amounts use 18 decimal places (standard for ERC-20 tokens)

-- ============================================
-- USERS TABLE
-- ============================================
ALTER TABLE `users` 
MODIFY COLUMN `total_spent` DECIMAL(18, 18) DEFAULT 0;

ALTER TABLE `users` 
MODIFY COLUMN `total_rewards` DECIMAL(18, 18) DEFAULT 0;

ALTER TABLE `users` 
MODIFY COLUMN `referral_rewards_earned` DECIMAL(18, 18) DEFAULT 0;

-- ============================================
-- MEMBERS TABLE
-- ============================================
ALTER TABLE `members` 
MODIFY COLUMN `total_inflow` DECIMAL(18, 18) DEFAULT 0;

ALTER TABLE `members` 
MODIFY COLUMN `total_outflow_usdt` DECIMAL(18, 18) DEFAULT 0;

-- Change total_outflow_bcc from INT to DECIMAL(18,18)
ALTER TABLE `members` 
MODIFY COLUMN `total_outflow_bcc` DECIMAL(18, 18) DEFAULT 0;

ALTER TABLE `members` 
MODIFY COLUMN `bcc_balance` DECIMAL(18, 18) DEFAULT 0;

-- ============================================
-- REWARDS TABLE
-- ============================================
ALTER TABLE `rewards` 
MODIFY COLUMN `amount` DECIMAL(18, 18) NOT NULL;

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
ALTER TABLE `transactions` 
MODIFY COLUMN `amount` DECIMAL(18, 18) NOT NULL;

-- ============================================
-- LEVELS TABLE
-- ============================================
ALTER TABLE `levels` 
MODIFY COLUMN `price_usdt` DECIMAL(18, 18) NOT NULL;

-- Change bcc_reward from INT to DECIMAL(18,18)
ALTER TABLE `levels` 
MODIFY COLUMN `bcc_reward` DECIMAL(18, 18) NOT NULL;

-- ============================================
-- NFT COLLECTIONS TABLE
-- ============================================
ALTER TABLE `nft_collections` 
MODIFY COLUMN `bcc_reward` DECIMAL(18, 18) NOT NULL;

-- ============================================
-- DASHBOARD METRICS TABLE
-- ============================================
ALTER TABLE `dashboard_metrics` 
MODIFY COLUMN `metric_value` DECIMAL(18, 18) NOT NULL;

