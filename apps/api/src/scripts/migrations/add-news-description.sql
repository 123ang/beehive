-- Migration: Add description field to news_translations table
-- Date: 2024
-- Description: Adds an optional description field to news translations for preview text

ALTER TABLE `news_translations` 
ADD COLUMN `description` TEXT NULL AFTER `title`;

