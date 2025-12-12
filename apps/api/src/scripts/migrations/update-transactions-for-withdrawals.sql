-- Migration: Update transactions table to support withdrawals for USDT and BCC
-- Run this migration to add currency and transaction type support

-- Add transaction_type column if it doesn't exist
ALTER TABLE `transactions` 
ADD COLUMN IF NOT EXISTS `transaction_type` VARCHAR(20) NOT NULL DEFAULT 'purchase' AFTER `tx_hash`;

-- Add currency column if it doesn't exist
ALTER TABLE `transactions` 
ADD COLUMN IF NOT EXISTS `currency` VARCHAR(10) NOT NULL DEFAULT 'USDT' AFTER `transaction_type`;

-- Make level nullable (withdrawals don't have a level)
ALTER TABLE `transactions` 
MODIFY COLUMN `level` INT NULL;

-- Add notes column if it doesn't exist
ALTER TABLE `transactions` 
ADD COLUMN IF NOT EXISTS `notes` TEXT NULL AFTER `status`;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS `transactions_type_idx` ON `transactions`(`transaction_type`);
CREATE INDEX IF NOT EXISTS `transactions_currency_idx` ON `transactions`(`currency`);

-- Update existing records to have transaction_type = 'purchase' and currency = 'USDT'
UPDATE `transactions` 
SET `transaction_type` = 'purchase', `currency` = 'USDT' 
WHERE `transaction_type` IS NULL OR `currency` IS NULL;

