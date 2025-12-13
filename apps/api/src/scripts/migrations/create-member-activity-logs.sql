-- Create member_activity_logs table
-- Tracks member activities: purchase_membership, register, withdrawal, enroll_class, purchase_nft

CREATE TABLE IF NOT EXISTS `member_activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `wallet_address` VARCHAR(42) NOT NULL,
  `member_id` INT NULL,
  `activity_type` VARCHAR(50) NOT NULL COMMENT 'purchase_membership, register, withdrawal, enroll_class, purchase_nft',
  `metadata` TEXT NULL COMMENT 'JSON string for additional context',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `member_activity_logs_wallet_idx` (`wallet_address`),
  INDEX `member_activity_logs_member_idx` (`member_id`),
  INDEX `member_activity_logs_activity_type_idx` (`activity_type`),
  INDEX `member_activity_logs_created_at_idx` (`created_at`),
  FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

