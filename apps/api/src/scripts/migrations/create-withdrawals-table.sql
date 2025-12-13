-- Migration: Create withdrawals table for secure queue-based withdrawals
CREATE TABLE IF NOT EXISTS `withdrawals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `member_id` INT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `currency` VARCHAR(10) NOT NULL, -- USDT or BCC
    `amount` DECIMAL(36, 18) NOT NULL,
    `status` VARCHAR(20) DEFAULT 'requested', -- requested | processing | broadcast | completed | failed
    `onchain_tx_hash` VARCHAR(66),
    `error_message` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `processed_at` DATETIME(6),
    `completed_at` DATETIME(6),
    INDEX `withdrawals_user_idx` (`user_id`),
    INDEX `withdrawals_member_idx` (`member_id`),
    INDEX `withdrawals_wallet_idx` (`wallet_address`),
    INDEX `withdrawals_status_idx` (`status`),
    INDEX `withdrawals_currency_idx` (`currency`),
    INDEX `withdrawals_tx_hash_idx` (`onchain_tx_hash`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE SET NULL
);

