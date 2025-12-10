-- ============================================
-- BEEHIVE DATABASE INITIALIZATION (MySQL)
-- ============================================
-- This script initializes the database with required settings
-- Run this automatically via Docker or manually before migrations

-- Set character set
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create database if not exists (Docker already creates it, but just in case)
CREATE DATABASE IF NOT EXISTS beehive
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE beehive;

-- Log initialization
SELECT '🐝 Beehive MySQL database initialized successfully' AS message;
