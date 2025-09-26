-- =====================================================
-- TraceChain V2 Database Migration 001
-- Initial Schema Creation
-- =====================================================
-- Version: 1.0.0
-- Date: 2024-01-01
-- Description: Initial database schema creation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

-- Product types supported by the system
CREATE TYPE product_type AS ENUM (
    'pharmaceutical',
    'electronics',
    'luxury',
    'food',
    'clothing',
    'cosmetics',
    'automotive',
    'agricultural',
    'other'
);

-- Checkpoint status types
CREATE TYPE checkpoint_status AS ENUM (
    'manufactured',
    'quality_checked',
    'packaged',
    'shipped',
    'in_transit',
    'received',
    'stored',
    'sold',
    'recalled',
    'disposed'
);

-- Stakeholder roles
CREATE TYPE stakeholder_role AS ENUM (
    'manufacturer',
    'distributor',
    'retailer',
    'consumer',
    'regulator',
    'auditor',
    'logistics',
    'quality_control'
);

-- User tiers for freemium model
CREATE TYPE user_tier AS ENUM (
    'free',
    'premium',
    'enterprise'
);

-- Transaction status
CREATE TYPE transaction_status AS ENUM (
    'pending',
    'confirmed',
    'failed',
    'cancelled'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (supports both custodial and non-custodial wallets)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(255),
    user_tier user_tier DEFAULT 'free',
    is_custodial BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Products table (mirrors smart contract Product struct)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id BIGINT UNIQUE NOT NULL, -- Smart contract product ID
    product_name VARCHAR(255) NOT NULL,
    product_type product_type NOT NULL,
    manufacturer_id UUID NOT NULL REFERENCES users(id),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    manufacture_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    raw_materials TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    metadata_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivated_by UUID REFERENCES users(id),
    smart_contract_address VARCHAR(42),
    transaction_hash VARCHAR(66),
    block_number BIGINT
);

-- Product stakeholders (many-to-many relationship)
CREATE TABLE product_stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stakeholder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role stakeholder_role NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    added_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(product_id, stakeholder_id, role)
);

-- Checkpoints table (mirrors smart contract Checkpoint struct)
CREATE TABLE checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    checkpoint_index INTEGER NOT NULL, -- Index in smart contract array
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255) NOT NULL,
    stakeholder_id UUID NOT NULL REFERENCES users(id),
    status checkpoint_status NOT NULL,
    temperature VARCHAR(50),
    humidity VARCHAR(50),
    additional_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    smart_contract_address VARCHAR(42),
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    UNIQUE(product_id, checkpoint_index)
);

-- Traceability chain (denormalized for fast queries)
CREATE TABLE traceability_chain (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    from_stakeholder_id UUID REFERENCES users(id),
    to_stakeholder_id UUID REFERENCES users(id),
    duration_hours INTEGER, -- Time between checkpoints
    distance_km DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TOKEN AND REWARDS TABLES
-- =====================================================

-- TracePoints (off-chain rewards)
CREATE TABLE trace_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points BIGINT NOT NULL DEFAULT 0,
    points_type VARCHAR(50) NOT NULL, -- 'checkpoint', 'verification', 'referral', etc.
    source_product_id UUID REFERENCES products(id),
    source_checkpoint_id UUID REFERENCES checkpoints(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- TRACE token transactions
CREATE TABLE trace_token_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'mint', 'burn', 'transfer', 'stake', 'reward'
    amount DECIMAL(36, 18) NOT NULL, -- 18 decimal places for precision
    from_address VARCHAR(42),
    to_address VARCHAR(42),
    status transaction_status DEFAULT 'pending',
    smart_contract_address VARCHAR(42),
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    gas_used BIGINT,
    gas_price BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Staking pools
CREATE TABLE staking_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_name VARCHAR(100) NOT NULL,
    pool_type VARCHAR(50) NOT NULL, -- 'product', 'compliance', 'governance'
    apy_percentage DECIMAL(5,2) NOT NULL,
    min_stake_amount DECIMAL(36, 18) NOT NULL,
    max_stake_amount DECIMAL(36, 18),
    lock_period_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User stakes
CREATE TABLE user_stakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pool_id UUID NOT NULL REFERENCES staking_pools(id) ON DELETE CASCADE,
    amount DECIMAL(36, 18) NOT NULL,
    staked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unlock_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    rewards_claimed DECIMAL(36, 18) DEFAULT 0,
    last_claim_at TIMESTAMP WITH TIME ZONE,
    transaction_hash VARCHAR(66)
);

-- =====================================================
-- COMPLIANCE AND CERTIFICATION TABLES
-- =====================================================

-- Compliance standards
CREATE TABLE compliance_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standard_name VARCHAR(100) NOT NULL,
    standard_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'safety', 'quality', 'environmental', 'regulatory'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product compliance certifications
CREATE TABLE product_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    standard_id UUID NOT NULL REFERENCES compliance_standards(id),
    certification_number VARCHAR(100) NOT NULL,
    issued_by VARCHAR(255) NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_valid BOOLEAN DEFAULT true,
    certificate_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, standard_id)
);

-- Compliance checkpoints
CREATE TABLE compliance_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
    standard_id UUID NOT NULL REFERENCES compliance_standards(id),
    compliance_status VARCHAR(50) NOT NULL, -- 'passed', 'failed', 'pending', 'exempt'
    check_details TEXT,
    checked_by UUID NOT NULL REFERENCES users(id),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    evidence_uri TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- PAYMENT AND ESCROW TABLES
-- =====================================================

-- Payment contracts
CREATE TABLE payment_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_address VARCHAR(42) UNIQUE NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(36, 18) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TRACE',
    status transaction_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    transaction_hash VARCHAR(66),
    block_number BIGINT
);

-- Escrow transactions
CREATE TABLE escrow_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_contract_id UUID NOT NULL REFERENCES payment_contracts(id) ON DELETE CASCADE,
    amount DECIMAL(36, 18) NOT NULL,
    status transaction_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP WITH TIME ZONE,
    released_by UUID REFERENCES users(id),
    transaction_hash VARCHAR(66),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- NFT AND CERTIFICATE TABLES
-- =====================================================

-- NFT certificates
CREATE TABLE nft_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id BIGINT UNIQUE NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id),
    certificate_type VARCHAR(50) NOT NULL, -- 'authenticity', 'compliance', 'ownership'
    metadata_uri TEXT NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    minted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transferred_at TIMESTAMP WITH TIME ZONE,
    smart_contract_address VARCHAR(42),
    transaction_hash VARCHAR(66),
    block_number BIGINT
);

-- Certificate verification codes
CREATE TABLE certificate_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id UUID NOT NULL REFERENCES nft_certificates(id) ON DELETE CASCADE,
    verification_code VARCHAR(20) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- ANALYTICS AND REPORTING TABLES
-- =====================================================

-- Product analytics (materialized view data)
CREATE TABLE product_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    total_checkpoints INTEGER DEFAULT 0,
    total_stakeholders INTEGER DEFAULT 0,
    trace_duration_hours DECIMAL(10,2),
    compliance_score DECIMAL(5,2),
    trust_score DECIMAL(5,2),
    last_checkpoint_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User analytics
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_products INTEGER DEFAULT 0,
    total_checkpoints INTEGER DEFAULT 0,
    total_trace_points BIGINT DEFAULT 0,
    total_trace_tokens DECIMAL(36, 18) DEFAULT 0,
    trust_rating DECIMAL(5,2) DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AUDIT AND LOGGING TABLES
-- =====================================================

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- System events
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'INFO', -- 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'
    source VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(user_tier);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Products table indexes
CREATE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_products_batch_number ON products(batch_number);
CREATE INDEX idx_products_manufacturer ON products(manufacturer_id);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_manufacture_date ON products(manufacture_date);
CREATE INDEX idx_products_expiry_date ON products(expiry_date);
CREATE INDEX idx_products_created_at ON products(created_at);

-- Full-text search on product names
CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('english', product_name));

-- Checkpoints table indexes
CREATE INDEX idx_checkpoints_product_id ON checkpoints(product_id);
CREATE INDEX idx_checkpoints_stakeholder ON checkpoints(stakeholder_id);
CREATE INDEX idx_checkpoints_status ON checkpoints(status);
CREATE INDEX idx_checkpoints_timestamp ON checkpoints(timestamp);
CREATE INDEX idx_checkpoints_location ON checkpoints(location);

-- Traceability chain indexes
CREATE INDEX idx_traceability_product_id ON traceability_chain(product_id);
CREATE INDEX idx_traceability_sequence ON traceability_chain(product_id, sequence_order);
CREATE INDEX idx_traceability_from_stakeholder ON traceability_chain(from_stakeholder_id);
CREATE INDEX idx_traceability_to_stakeholder ON traceability_chain(to_stakeholder_id);

-- TracePoints indexes
CREATE INDEX idx_trace_points_user_id ON trace_points(user_id);
CREATE INDEX idx_trace_points_type ON trace_points(points_type);
CREATE INDEX idx_trace_points_created_at ON trace_points(created_at);
CREATE INDEX idx_trace_points_claimed ON trace_points(is_claimed);

-- Token transaction indexes
CREATE INDEX idx_token_tx_user_id ON trace_token_transactions(user_id);
CREATE INDEX idx_token_tx_type ON trace_token_transactions(transaction_type);
CREATE INDEX idx_token_tx_status ON trace_token_transactions(status);
CREATE INDEX idx_token_tx_created_at ON trace_token_transactions(created_at);
CREATE INDEX idx_token_tx_hash ON trace_token_transactions(transaction_hash);

-- Staking indexes
CREATE INDEX idx_user_stakes_user_id ON user_stakes(user_id);
CREATE INDEX idx_user_stakes_pool_id ON user_stakes(pool_id);
CREATE INDEX idx_user_stakes_active ON user_stakes(is_active);
CREATE INDEX idx_user_stakes_unlock_at ON user_stakes(unlock_at);

-- Compliance indexes
CREATE INDEX idx_certifications_product_id ON product_certifications(product_id);
CREATE INDEX idx_certifications_standard_id ON product_certifications(standard_id);
CREATE INDEX idx_certifications_valid ON product_certifications(is_valid);
CREATE INDEX idx_compliance_checkpoints_product_id ON compliance_checkpoints(product_id);
CREATE INDEX idx_compliance_checkpoints_status ON compliance_checkpoints(compliance_status);

-- Payment indexes
CREATE INDEX idx_payment_contracts_product_id ON payment_contracts(product_id);
CREATE INDEX idx_payment_contracts_buyer ON payment_contracts(buyer_id);
CREATE INDEX idx_payment_contracts_seller ON payment_contracts(seller_id);
CREATE INDEX idx_payment_contracts_status ON payment_contracts(status);

-- NFT indexes
CREATE INDEX idx_nft_certificates_token_id ON nft_certificates(token_id);
CREATE INDEX idx_nft_certificates_product_id ON nft_certificates(product_id);
CREATE INDEX idx_nft_certificates_owner ON nft_certificates(owner_id);
CREATE INDEX idx_nft_certificates_valid ON nft_certificates(is_valid);
CREATE INDEX idx_certificate_codes_code ON certificate_codes(verification_code);
CREATE INDEX idx_certificate_codes_used ON certificate_codes(is_used);

-- Analytics indexes
CREATE INDEX idx_product_analytics_product_id ON product_analytics(product_id);
CREATE INDEX idx_user_analytics_user_id ON user_analytics(user_id);

-- Audit indexes
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default compliance standards
INSERT INTO compliance_standards (standard_name, standard_code, description, category) VALUES
('ISO 9001', 'ISO9001', 'Quality Management Systems', 'quality'),
('ISO 14001', 'ISO14001', 'Environmental Management Systems', 'environmental'),
('ISO 45001', 'ISO45001', 'Occupational Health and Safety Management', 'safety'),
('FDA 21 CFR Part 11', 'FDA21CFR11', 'Electronic Records and Signatures', 'regulatory'),
('EU GMP', 'EUGMP', 'Good Manufacturing Practice', 'regulatory'),
('HACCP', 'HACCP', 'Hazard Analysis Critical Control Points', 'safety'),
('Organic Certification', 'ORGANIC', 'Organic Product Certification', 'quality'),
('Fair Trade', 'FAIRTRADE', 'Fair Trade Certification', 'quality');

-- Insert default staking pools
INSERT INTO staking_pools (pool_name, pool_type, apy_percentage, min_stake_amount, max_stake_amount, lock_period_days) VALUES
('Product Verification Pool', 'product', 12.50, 1000, 100000, 30),
('Compliance Pool', 'compliance', 15.00, 5000, 500000, 90),
('Governance Pool', 'governance', 8.00, 10000, 1000000, 180),
('Long-term Pool', 'product', 20.00, 50000, 5000000, 365);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
INSERT INTO system_events (event_type, event_data, severity, source) VALUES
('migration_completed', '{"version": "001", "description": "Initial schema creation"}', 'INFO', 'database_migration');
