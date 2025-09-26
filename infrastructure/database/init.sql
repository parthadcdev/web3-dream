-- =====================================================
-- TraceChain V2 Database Initialization Script
-- =====================================================

-- Create database
CREATE DATABASE tracechain_v2
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Connect to the new database
\c tracechain_v2;

-- Create application users
CREATE USER tracechain_app WITH PASSWORD 'tracechain_secure_password_2024';
CREATE USER tracechain_readonly WITH PASSWORD 'tracechain_readonly_password_2024';
CREATE USER tracechain_analytics WITH PASSWORD 'tracechain_analytics_password_2024';

-- Grant database permissions
GRANT CONNECT ON DATABASE tracechain_v2 TO tracechain_app;
GRANT CONNECT ON DATABASE tracechain_v2 TO tracechain_readonly;
GRANT CONNECT ON DATABASE tracechain_v2 TO tracechain_analytics;

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO tracechain_app;
GRANT USAGE ON SCHEMA public TO tracechain_readonly;
GRANT USAGE ON SCHEMA public TO tracechain_analytics;

-- Grant table permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tracechain_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tracechain_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tracechain_analytics;

-- Grant sequence permissions
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tracechain_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO tracechain_readonly;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO tracechain_analytics;

-- Grant function permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tracechain_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tracechain_readonly;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tracechain_analytics;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tracechain_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO tracechain_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO tracechain_analytics;

-- Set connection limits
ALTER USER tracechain_app CONNECTION LIMIT 50;
ALTER USER tracechain_readonly CONNECTION LIMIT 20;
ALTER USER tracechain_analytics CONNECTION LIMIT 10;

-- Set statement timeouts
ALTER USER tracechain_app SET statement_timeout = '30s';
ALTER USER tracechain_readonly SET statement_timeout = '60s';
ALTER USER tracechain_analytics SET statement_timeout = '300s';

-- Set work memory for analytics user
ALTER USER tracechain_analytics SET work_mem = '256MB';