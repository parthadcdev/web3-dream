-- =====================================================
-- TraceChain V2 PostgreSQL Database Schema
-- =====================================================
-- This schema supports the complete TraceChain V2 ecosystem
-- including smart contracts, traceability, and analytics

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
-- MATERIALIZED VIEWS FOR COMPLEX QUERIES
-- =====================================================

-- Product traceability summary
CREATE MATERIALIZED VIEW product_traceability_summary AS
SELECT 
    p.id as product_id,
    p.product_name,
    p.product_type,
    p.batch_number,
    p.manufacture_date,
    p.expiry_date,
    p.is_active,
    COUNT(DISTINCT c.id) as total_checkpoints,
    COUNT(DISTINCT ps.stakeholder_id) as total_stakeholders,
    MIN(c.timestamp) as first_checkpoint_at,
    MAX(c.timestamp) as last_checkpoint_at,
    EXTRACT(EPOCH FROM (MAX(c.timestamp) - MIN(c.timestamp)))/3600 as trace_duration_hours
FROM products p
LEFT JOIN checkpoints c ON p.id = c.product_id
LEFT JOIN product_stakeholders ps ON p.id = ps.product_id AND ps.is_active = true
GROUP BY p.id, p.product_name, p.product_type, p.batch_number, p.manufacture_date, p.expiry_date, p.is_active;

-- User activity summary
CREATE MATERIALIZED VIEW user_activity_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.company_name,
    u.user_tier,
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT c.id) as total_checkpoints,
    COALESCE(SUM(tp.points), 0) as total_trace_points,
    COALESCE(SUM(ttt.amount), 0) as total_trace_tokens,
    MAX(c.timestamp) as last_activity_at
FROM users u
LEFT JOIN products p ON u.id = p.manufacturer_id
LEFT JOIN checkpoints c ON u.id = c.stakeholder_id
LEFT JOIN trace_points tp ON u.id = tp.user_id
LEFT JOIN trace_token_transactions ttt ON u.id = ttt.user_id AND ttt.status = 'confirmed'
GROUP BY u.id, u.username, u.company_name, u.user_tier;

-- Compliance summary
CREATE MATERIALIZED VIEW compliance_summary AS
SELECT 
    p.id as product_id,
    p.product_name,
    p.batch_number,
    COUNT(DISTINCT pc.id) as total_certifications,
    COUNT(DISTINCT CASE WHEN pc.is_valid = true THEN pc.id END) as valid_certifications,
    COUNT(DISTINCT cc.id) as total_compliance_checks,
    COUNT(DISTINCT CASE WHEN cc.compliance_status = 'passed' THEN cc.id END) as passed_checks,
    ROUND(
        (COUNT(DISTINCT CASE WHEN cc.compliance_status = 'passed' THEN cc.id END)::DECIMAL / 
         NULLIF(COUNT(DISTINCT cc.id), 0)) * 100, 2
    ) as compliance_score
FROM products p
LEFT JOIN product_certifications pc ON p.id = pc.product_id
LEFT JOIN compliance_checkpoints cc ON p.id = cc.product_id
GROUP BY p.id, p.product_name, p.batch_number;

-- =====================================================
-- FUNCTIONS AND STORED PROCEDURES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(user_id_param UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    trust_score DECIMAL(5,2) := 0;
    product_count INTEGER;
    checkpoint_count INTEGER;
    compliance_score DECIMAL(5,2);
BEGIN
    -- Get product count
    SELECT COUNT(*) INTO product_count
    FROM products 
    WHERE manufacturer_id = user_id_param AND is_active = true;
    
    -- Get checkpoint count
    SELECT COUNT(*) INTO checkpoint_count
    FROM checkpoints c
    JOIN products p ON c.product_id = p.id
    WHERE p.manufacturer_id = user_id_param;
    
    -- Calculate base score
    trust_score := LEAST(50, (product_count * 2) + (checkpoint_count * 0.5));
    
    -- Add compliance bonus
    SELECT AVG(compliance_score) INTO compliance_score
    FROM compliance_summary cs
    JOIN products p ON cs.product_id = p.id
    WHERE p.manufacturer_id = user_id_param;
    
    IF compliance_score IS NOT NULL THEN
        trust_score := trust_score + (compliance_score * 0.5);
    END IF;
    
    RETURN LEAST(100, trust_score);
END;
$$ LANGUAGE plpgsql;

-- Function to get product traceability chain
CREATE OR REPLACE FUNCTION get_product_trace_chain(product_id_param UUID)
RETURNS TABLE (
    sequence_order INTEGER,
    checkpoint_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    stakeholder_name VARCHAR(255),
    status checkpoint_status,
    temperature VARCHAR(50),
    humidity VARCHAR(50),
    additional_data TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.sequence_order,
        c.id as checkpoint_id,
        c.timestamp,
        c.location,
        COALESCE(u.username, u.company_name, u.wallet_address) as stakeholder_name,
        c.status,
        c.temperature,
        c.humidity,
        c.additional_data
    FROM traceability_chain tc
    JOIN checkpoints c ON tc.checkpoint_id = c.id
    JOIN users u ON c.stakeholder_id = u.id
    WHERE tc.product_id = product_id_param
    ORDER BY tc.sequence_order;
END;
$$ LANGUAGE plpgsql;

-- Function to check product compliance
CREATE OR REPLACE FUNCTION check_product_compliance(product_id_param UUID)
RETURNS TABLE (
    standard_name VARCHAR(100),
    compliance_status VARCHAR(50),
    certification_number VARCHAR(100),
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.standard_name,
        COALESCE(cc.compliance_status, 'not_checked') as compliance_status,
        pc.certification_number,
        COALESCE(pc.is_valid, false) as is_valid
    FROM compliance_standards cs
    LEFT JOIN product_certifications pc ON cs.id = pc.standard_id AND pc.product_id = product_id_param
    LEFT JOIN compliance_checkpoints cc ON cs.id = cc.standard_id AND cc.product_id = product_id_param
    WHERE cs.is_active = true
    ORDER BY cs.standard_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at on products table
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on staking_pools table
CREATE TRIGGER update_staking_pools_updated_at
    BEFORE UPDATE ON staking_pools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on product_analytics table
CREATE TRIGGER update_product_analytics_updated_at
    BEFORE UPDATE ON product_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on user_analytics table
CREATE TRIGGER update_user_analytics_updated_at
    BEFORE UPDATE ON user_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger for products table
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_values, changed_at)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_values, new_values, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, new_values, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_products_trigger
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_checkpoints_trigger
    AFTER INSERT OR UPDATE OR DELETE ON checkpoints
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Product details with manufacturer info
CREATE VIEW product_details AS
SELECT 
    p.id,
    p.product_id,
    p.product_name,
    p.product_type,
    p.batch_number,
    p.manufacture_date,
    p.expiry_date,
    p.raw_materials,
    p.is_active,
    p.metadata_uri,
    p.created_at,
    u.username as manufacturer_username,
    u.company_name as manufacturer_company,
    u.wallet_address as manufacturer_wallet
FROM products p
JOIN users u ON p.manufacturer_id = u.id;

-- Checkpoint details with stakeholder info
CREATE VIEW checkpoint_details AS
SELECT 
    c.id,
    c.product_id,
    c.checkpoint_index,
    c.timestamp,
    c.location,
    c.status,
    c.temperature,
    c.humidity,
    c.additional_data,
    u.username as stakeholder_username,
    u.company_name as stakeholder_company,
    u.wallet_address as stakeholder_wallet
FROM checkpoints c
JOIN users u ON c.stakeholder_id = u.id;

-- User portfolio summary
CREATE VIEW user_portfolio AS
SELECT 
    u.id as user_id,
    u.username,
    u.company_name,
    u.user_tier,
    COUNT(DISTINCT p.id) as products_manufactured,
    COUNT(DISTINCT ps.product_id) as products_stakeholder,
    COUNT(DISTINCT c.id) as checkpoints_added,
    COALESCE(SUM(tp.points), 0) as total_trace_points,
    COALESCE(SUM(ttt.amount), 0) as total_trace_tokens,
    u.created_at as member_since
FROM users u
LEFT JOIN products p ON u.id = p.manufacturer_id AND p.is_active = true
LEFT JOIN product_stakeholders ps ON u.id = ps.stakeholder_id AND ps.is_active = true
LEFT JOIN checkpoints c ON u.id = c.stakeholder_id
LEFT JOIN trace_points tp ON u.id = tp.user_id
LEFT JOIN trace_token_transactions ttt ON u.id = ttt.user_id AND ttt.status = 'confirmed'
GROUP BY u.id, u.username, u.company_name, u.user_tier, u.created_at;

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
-- PERMISSIONS AND ROLES
-- =====================================================

-- Create application roles
CREATE ROLE tracechain_app;
CREATE ROLE tracechain_readonly;
CREATE ROLE tracechain_analytics;

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tracechain_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tracechain_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tracechain_app;

-- Grant read-only permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tracechain_readonly;
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO tracechain_readonly;

-- Grant analytics permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tracechain_analytics;
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO tracechain_analytics;
GRANT SELECT ON ALL MATERIALIZED VIEWS IN SCHEMA public TO tracechain_analytics;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tracechain_analytics;

-- =====================================================
-- MAINTENANCE PROCEDURES
-- =====================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW product_traceability_summary;
    REFRESH MATERIALIZED VIEW user_activity_summary;
    REFRESH MATERIALIZED VIEW compliance_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE changed_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update analytics tables
CREATE OR REPLACE FUNCTION update_analytics()
RETURNS void AS $$
BEGIN
    -- Update product analytics
    INSERT INTO product_analytics (product_id, total_checkpoints, total_stakeholders, trace_duration_hours, last_checkpoint_at)
    SELECT 
        p.id,
        COUNT(DISTINCT c.id),
        COUNT(DISTINCT ps.stakeholder_id),
        EXTRACT(EPOCH FROM (MAX(c.timestamp) - MIN(c.timestamp)))/3600,
        MAX(c.timestamp)
    FROM products p
    LEFT JOIN checkpoints c ON p.id = c.product_id
    LEFT JOIN product_stakeholders ps ON p.id = ps.product_id AND ps.is_active = true
    WHERE p.is_active = true
    GROUP BY p.id
    ON CONFLICT (product_id) DO UPDATE SET
        total_checkpoints = EXCLUDED.total_checkpoints,
        total_stakeholders = EXCLUDED.total_stakeholders,
        trace_duration_hours = EXCLUDED.trace_duration_hours,
        last_checkpoint_at = EXCLUDED.last_checkpoint_at,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Update user analytics
    INSERT INTO user_analytics (user_id, total_products, total_checkpoints, total_trace_points, total_trace_tokens, last_activity_at)
    SELECT 
        u.id,
        COUNT(DISTINCT p.id),
        COUNT(DISTINCT c.id),
        COALESCE(SUM(tp.points), 0),
        COALESCE(SUM(ttt.amount), 0),
        MAX(GREATEST(COALESCE(c.timestamp, '1970-01-01'), COALESCE(tp.created_at, '1970-01-01'), COALESCE(ttt.created_at, '1970-01-01')))
    FROM users u
    LEFT JOIN products p ON u.id = p.manufacturer_id AND p.is_active = true
    LEFT JOIN checkpoints c ON u.id = c.stakeholder_id
    LEFT JOIN trace_points tp ON u.id = tp.user_id
    LEFT JOIN trace_token_transactions ttt ON u.id = ttt.user_id AND ttt.status = 'confirmed'
    GROUP BY u.id
    ON CONFLICT (user_id) DO UPDATE SET
        total_products = EXCLUDED.total_products,
        total_checkpoints = EXCLUDED.total_checkpoints,
        total_trace_points = EXCLUDED.total_trace_points,
        total_trace_tokens = EXCLUDED.total_trace_tokens,
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON DATABASE tracechain IS 'TraceChain V2 - Supply Chain Traceability and Token Economy Database';
COMMENT ON TABLE users IS 'User accounts supporting both custodial and non-custodial wallets';
COMMENT ON TABLE products IS 'Product registry mirroring smart contract Product struct';
COMMENT ON TABLE checkpoints IS 'Supply chain checkpoints with environmental data';
COMMENT ON TABLE traceability_chain IS 'Denormalized traceability chain for fast queries';
COMMENT ON TABLE trace_points IS 'Off-chain reward points system';
COMMENT ON TABLE trace_token_transactions IS 'On-chain TRACE token transactions';
COMMENT ON TABLE staking_pools IS 'Token staking pools with different APY rates';
COMMENT ON TABLE user_stakes IS 'User staking positions and rewards';
COMMENT ON TABLE compliance_standards IS 'Supported compliance standards and certifications';
COMMENT ON TABLE product_certifications IS 'Product compliance certifications';
COMMENT ON TABLE compliance_checkpoints IS 'Compliance verification at each checkpoint';
COMMENT ON TABLE payment_contracts IS 'Payment and escrow contract instances';
COMMENT ON TABLE nft_certificates IS 'NFT-based product certificates';
COMMENT ON TABLE product_analytics IS 'Materialized analytics data for products';
COMMENT ON TABLE user_analytics IS 'Materialized analytics data for users';
COMMENT ON TABLE audit_logs IS 'Complete audit trail for all data changes';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
