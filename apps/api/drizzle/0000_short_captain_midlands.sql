CREATE TABLE `activity_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`actor_type` varchar(20) NOT NULL,
	`actor_id` varchar(100) NOT NULL,
	`action` varchar(100) NOT NULL,
	`metadata` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `address_modification_requests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`member_id` int NOT NULL,
	`current_address` varchar(42) NOT NULL,
	`new_address` varchar(42) NOT NULL,
	`requested_by` int NOT NULL,
	`reason` text NOT NULL,
	`status` varchar(20) DEFAULT 'pending',
	`approved_by` int,
	`rejection_reason` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`approved_at` timestamp,
	CONSTRAINT `address_modification_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_permissions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`role_id` int NOT NULL,
	`permission` varchar(100) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `admin_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_permissions_role_permission_idx` UNIQUE(`role_id`,`permission`)
);
--> statement-breakpoint
CREATE TABLE `admin_roles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_master_admin` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `admins` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role_id` int NOT NULL,
	`active` boolean DEFAULT true,
	`last_login` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_email_unique` UNIQUE(`email`),
	CONSTRAINT `admins_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `bulk_import_batches` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`uploaded_by` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_size` int NOT NULL,
	`total_rows` int NOT NULL,
	`successful_imports` int DEFAULT 0,
	`failed_imports` int DEFAULT 0,
	`duplicate_count` int DEFAULT 0,
	`status` varchar(20) DEFAULT 'processing',
	`error_log` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bulk_import_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `class_meetings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`class_id` int NOT NULL,
	`meeting_title` varchar(255) NOT NULL,
	`meeting_time` timestamp NOT NULL,
	`meeting_url` text NOT NULL,
	`meeting_password` varchar(6) NOT NULL,
	`meeting_image` text,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `class_meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`thumbnail` text,
	`category` varchar(100),
	`active` boolean DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_metrics` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`metric_date` timestamp NOT NULL,
	`metric_type` varchar(50) NOT NULL,
	`metric_value` decimal(18,6) NOT NULL,
	`metadata` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `dashboard_metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `dashboard_metrics_date_type_idx` UNIQUE(`metric_date`,`metric_type`)
);
--> statement-breakpoint
CREATE TABLE `layer_counters` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`upline_member_id` int NOT NULL,
	`layer_number` int NOT NULL,
	`upgrade_count` int DEFAULT 0,
	CONSTRAINT `layer_counters_id` PRIMARY KEY(`id`),
	CONSTRAINT `layer_counters_upline_layer_idx` UNIQUE(`upline_member_id`,`layer_number`)
);
--> statement-breakpoint
CREATE TABLE `levels` (
	`level` int NOT NULL,
	`name_en` varchar(50) NOT NULL,
	`name_cn` varchar(50) NOT NULL,
	`price_usdt` decimal(18,6) NOT NULL,
	`bcc_reward` int NOT NULL,
	`active` boolean DEFAULT true,
	CONSTRAINT `levels_level` PRIMARY KEY(`level`)
);
--> statement-breakpoint
CREATE TABLE `member_closure` (
	`ancestor_id` bigint NOT NULL,
	`descendant_id` bigint NOT NULL,
	`depth` int NOT NULL,
	CONSTRAINT `member_closure_ancestor_id_descendant_id_pk` PRIMARY KEY(`ancestor_id`,`descendant_id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`wallet_address` varchar(42) NOT NULL,
	`username` varchar(80),
	`root_id` int,
	`sponsor_id` int,
	`current_level` int DEFAULT 0,
	`total_inflow` decimal(18,6) DEFAULT '0',
	`total_outflow_usdt` decimal(18,6) DEFAULT '0',
	`total_outflow_bcc` int DEFAULT 0,
	`direct_sponsor_count` int DEFAULT 0,
	`joined_at` timestamp DEFAULT (now()),
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_wallet_address_unique` UNIQUE(`wallet_address`),
	CONSTRAINT `members_wallet_idx` UNIQUE(`wallet_address`)
);
--> statement-breakpoint
CREATE TABLE `merchant_ads` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`merchant_id` int NOT NULL,
	`image_url` text NOT NULL,
	`redirect_url` text NOT NULL,
	`active` boolean DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merchant_ads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`merchant_name` varchar(255) NOT NULL,
	`logo_url` text,
	`description` text,
	`location` varchar(255),
	`contact_info` text,
	`merchant_page_url` text,
	`active` boolean DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merchants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news_articles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`slug` varchar(255) NOT NULL,
	`status` varchar(20) DEFAULT 'draft',
	`created_by` int NOT NULL,
	`published_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `news_articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_articles_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `news_articles_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `news_translations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`article_id` int NOT NULL,
	`language` varchar(10) NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `news_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_translations_article_language_idx` UNIQUE(`article_id`,`language`)
);
--> statement-breakpoint
CREATE TABLE `nft_collections` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`short_name` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`bcc_reward` decimal(18,6) NOT NULL,
	`description` text,
	`image_url` text,
	`active` boolean DEFAULT true,
	`max_supply` int NOT NULL,
	`minted` int DEFAULT 0,
	`contract_collection_id` int,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nft_collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `nft_collections_short_name_unique` UNIQUE(`short_name`),
	CONSTRAINT `nft_collections_short_name_idx` UNIQUE(`short_name`)
);
--> statement-breakpoint
CREATE TABLE `placements` (
	`parent_id` bigint NOT NULL,
	`child_id` bigint NOT NULL,
	`position` tinyint NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `placements_child_id` PRIMARY KEY(`child_id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_field_config` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`field_key` varchar(100) NOT NULL,
	`field_label` varchar(255) NOT NULL,
	`field_type` varchar(50) NOT NULL,
	`required` boolean DEFAULT false,
	`active` boolean DEFAULT true,
	`sort_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_field_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_field_config_field_key_unique` UNIQUE(`field_key`),
	CONSTRAINT `purchase_field_config_field_key_idx` UNIQUE(`field_key`)
);
--> statement-breakpoint
CREATE TABLE `referral_relationships` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`sponsor_id` int NOT NULL,
	`referred_user_id` int NOT NULL,
	`referral_code_used` varchar(50) NOT NULL,
	`referral_date` timestamp DEFAULT (now()),
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `referral_relationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rewards` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`recipient_wallet` varchar(42) NOT NULL,
	`source_wallet` varchar(42),
	`reward_type` varchar(20) NOT NULL,
	`amount` decimal(18,6) NOT NULL,
	`currency` varchar(10) NOT NULL,
	`status` varchar(20) NOT NULL,
	`layer_number` int,
	`pending_expires_at` timestamp,
	`tx_hash` varchar(66),
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`claimed_at` timestamp,
	CONSTRAINT `rewards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(500) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`wallet_address` varchar(42) NOT NULL,
	`tx_hash` varchar(66),
	`level` int NOT NULL,
	`amount` decimal(18,6) NOT NULL,
	`status` varchar(20) DEFAULT 'pending',
	`block_number` bigint,
	`created_at` timestamp DEFAULT (now()),
	`confirmed_at` timestamp,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_tx_hash_unique` UNIQUE(`tx_hash`),
	CONSTRAINT `transactions_tx_hash_idx` UNIQUE(`tx_hash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`wallet_address` varchar(42) NOT NULL,
	`username` varchar(80),
	`email` varchar(255),
	`name` varchar(255),
	`phone` varchar(50),
	`avatar_url` text,
	`language` varchar(10) DEFAULT 'en',
	`nonce` varchar(64),
	`is_admin` boolean DEFAULT false,
	`membership_level` int DEFAULT 0,
	`status` varchar(20) DEFAULT 'active',
	`total_spent` decimal(18,6) DEFAULT '0',
	`total_rewards` decimal(18,6) DEFAULT '0',
	`referral_code` varchar(50),
	`sponsor_id` int,
	`sponsor_address` varchar(42),
	`member_id` varchar(50),
	`referral_count` int DEFAULT 0,
	`referral_rewards_earned` decimal(18,6) DEFAULT '0',
	`is_bulk_imported` boolean DEFAULT false,
	`bulk_import_id` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_wallet_address_unique` UNIQUE(`wallet_address`),
	CONSTRAINT `users_referral_code_unique` UNIQUE(`referral_code`),
	CONSTRAINT `users_member_id_unique` UNIQUE(`member_id`),
	CONSTRAINT `users_wallet_idx` UNIQUE(`wallet_address`),
	CONSTRAINT `users_referral_code_idx` UNIQUE(`referral_code`),
	CONSTRAINT `users_member_id_idx` UNIQUE(`member_id`)
);
--> statement-breakpoint
CREATE INDEX `activity_logs_actor_idx` ON `activity_logs` (`actor_type`,`actor_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_action_idx` ON `activity_logs` (`action`);--> statement-breakpoint
CREATE INDEX `activity_logs_created_at_idx` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `address_modification_requests_member_idx` ON `address_modification_requests` (`member_id`);--> statement-breakpoint
CREATE INDEX `address_modification_requests_status_idx` ON `address_modification_requests` (`status`);--> statement-breakpoint
CREATE INDEX `address_modification_requests_requested_by_idx` ON `address_modification_requests` (`requested_by`);--> statement-breakpoint
CREATE INDEX `admins_role_idx` ON `admins` (`role_id`);--> statement-breakpoint
CREATE INDEX `bulk_import_batches_uploaded_by_idx` ON `bulk_import_batches` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `bulk_import_batches_status_idx` ON `bulk_import_batches` (`status`);--> statement-breakpoint
CREATE INDEX `class_meetings_class_idx` ON `class_meetings` (`class_id`);--> statement-breakpoint
CREATE INDEX `class_meetings_meeting_time_idx` ON `class_meetings` (`meeting_time`);--> statement-breakpoint
CREATE INDEX `classes_active_idx` ON `classes` (`active`);--> statement-breakpoint
CREATE INDEX `classes_category_idx` ON `classes` (`category`);--> statement-breakpoint
CREATE INDEX `dashboard_metrics_metric_type_idx` ON `dashboard_metrics` (`metric_type`);--> statement-breakpoint
CREATE INDEX `closure_descendant_idx` ON `member_closure` (`descendant_id`);--> statement-breakpoint
CREATE INDEX `closure_depth_idx` ON `member_closure` (`ancestor_id`,`depth`);--> statement-breakpoint
CREATE INDEX `members_sponsor_idx` ON `members` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `members_level_idx` ON `members` (`current_level`);--> statement-breakpoint
CREATE INDEX `merchant_ads_merchant_idx` ON `merchant_ads` (`merchant_id`);--> statement-breakpoint
CREATE INDEX `merchant_ads_active_idx` ON `merchant_ads` (`active`);--> statement-breakpoint
CREATE INDEX `merchants_active_idx` ON `merchants` (`active`);--> statement-breakpoint
CREATE INDEX `news_articles_status_idx` ON `news_articles` (`status`);--> statement-breakpoint
CREATE INDEX `nft_collections_active_idx` ON `nft_collections` (`active`);--> statement-breakpoint
CREATE INDEX `placements_parent_idx` ON `placements` (`parent_id`);--> statement-breakpoint
CREATE INDEX `placements_parent_pos_idx` ON `placements` (`parent_id`,`position`);--> statement-breakpoint
CREATE INDEX `purchase_field_config_active_idx` ON `purchase_field_config` (`active`);--> statement-breakpoint
CREATE INDEX `referral_relationships_sponsor_idx` ON `referral_relationships` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `referral_relationships_referred_idx` ON `referral_relationships` (`referred_user_id`);--> statement-breakpoint
CREATE INDEX `rewards_recipient_idx` ON `rewards` (`recipient_wallet`);--> statement-breakpoint
CREATE INDEX `rewards_status_idx` ON `rewards` (`status`);--> statement-breakpoint
CREATE INDEX `rewards_type_idx` ON `rewards` (`reward_type`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_token_idx` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `transactions_wallet_idx` ON `transactions` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `transactions_status_idx` ON `transactions` (`status`);--> statement-breakpoint
CREATE INDEX `users_sponsor_idx` ON `users` (`sponsor_id`);