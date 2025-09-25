-- Initialize TraceChain Database
-- This script sets up the initial database schema

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database if not exists (handled by Docker)
-- CREATE DATABASE tracechain_db;

-- Create initial tables (will be handled by Prisma migrations)
-- This file is kept for any custom initialization needed

-- Set up initial permissions
GRANT ALL PRIVILEGES ON DATABASE tracechain_db TO tracechain_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO tracechain_user;

-- Create initial admin user (if needed)
-- This will be handled by the application seed script

COMMENT ON DATABASE tracechain_db IS 'TraceChain - Decentralized Traceability Platform Database';
