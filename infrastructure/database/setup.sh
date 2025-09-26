#!/bin/bash

# =====================================================
# TraceChain V2 Database Setup Script
# =====================================================

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tracechain_v2}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-tracechain_secure_password_2024}"
SETUP_MODE="${SETUP_MODE:-full}" # full, schema, data, test

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Function to check if PostgreSQL is installed
check_postgresql() {
    if command -v psql >/dev/null 2>&1; then
        log "PostgreSQL client found: $(psql --version)"
        return 0
    else
        error "PostgreSQL client not found. Please install PostgreSQL client tools."
        return 1
    fi
}

# Function to check database connection
check_connection() {
    if PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" -c "SELECT 1;" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to create database
create_database() {
    log "Creating database: $DB_NAME"
    
    # Check if database already exists
    if PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        warning "Database $DB_NAME already exists"
        read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log "Dropping existing database: $DB_NAME"
            PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" -c "DROP DATABASE IF EXISTS $DB_NAME;"
        else
            log "Using existing database: $DB_NAME"
            return 0
        fi
    fi
    
    # Create database
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" -c "CREATE DATABASE $DB_NAME WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8' TEMPLATE=template0;"
    
    log "Database created successfully: $DB_NAME"
}

# Function to create users
create_users() {
    log "Creating database users"
    
    # Create application user
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tracechain_app') THEN
                CREATE USER tracechain_app WITH PASSWORD 'tracechain_secure_password_2024';
            END IF;
        END
        \$\$;
    "
    
    # Create readonly user
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tracechain_readonly') THEN
                CREATE USER tracechain_readonly WITH PASSWORD 'tracechain_readonly_password_2024';
            END IF;
        END
        \$\$;
    "
    
    # Create analytics user
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tracechain_analytics') THEN
                CREATE USER tracechain_analytics WITH PASSWORD 'tracechain_analytics_password_2024';
            END IF;
        END
        \$\$;
    "
    
    log "Database users created successfully"
}

# Function to grant permissions
grant_permissions() {
    log "Granting database permissions"
    
    # Grant database permissions
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -c "
        GRANT CONNECT ON DATABASE $DB_NAME TO tracechain_app;
        GRANT CONNECT ON DATABASE $DB_NAME TO tracechain_readonly;
        GRANT CONNECT ON DATABASE $DB_NAME TO tracechain_analytics;
        
        GRANT USAGE ON SCHEMA public TO tracechain_app;
        GRANT USAGE ON SCHEMA public TO tracechain_readonly;
        GRANT USAGE ON SCHEMA public TO tracechain_analytics;
        
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tracechain_app;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO tracechain_readonly;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO tracechain_analytics;
        
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tracechain_app;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO tracechain_readonly;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO tracechain_analytics;
        
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tracechain_app;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tracechain_readonly;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tracechain_analytics;
        
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tracechain_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO tracechain_readonly;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO tracechain_analytics;
        
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tracechain_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO tracechain_readonly;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO tracechain_analytics;
        
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO tracechain_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO tracechain_readonly;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO tracechain_analytics;
    "
    
    log "Database permissions granted successfully"
}

# Function to run schema migration
run_schema_migration() {
    log "Running schema migration"
    
    if [ -f "schema.sql" ]; then
        PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -f schema.sql
        log "Schema migration completed"
    else
        error "Schema file not found: schema.sql"
        return 1
    fi
}

# Function to run migration files
run_migrations() {
    log "Running migration files"
    
    if [ -d "migrations" ]; then
        for migration_file in migrations/*.sql; do
            if [ -f "$migration_file" ]; then
                log "Running migration: $migration_file"
                PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -f "$migration_file"
            fi
        done
        log "All migrations completed"
    else
        warning "Migrations directory not found: migrations/"
    fi
}

# Function to insert test data
insert_test_data() {
    log "Inserting test data"
    
    # Create test users
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -c "
        -- Insert test users
        INSERT INTO users (wallet_address, email, username, first_name, last_name, company_name, user_tier, is_verified) VALUES
        ('0x1234567890123456789012345678901234567890', 'manufacturer@test.com', 'test_manufacturer', 'John', 'Doe', 'Test Manufacturing Co.', 'premium', true),
        ('0x2345678901234567890123456789012345678901', 'distributor@test.com', 'test_distributor', 'Jane', 'Smith', 'Test Distribution Ltd.', 'premium', true),
        ('0x3456789012345678901234567890123456789012', 'retailer@test.com', 'test_retailer', 'Bob', 'Johnson', 'Test Retail Store', 'free', true),
        ('0x4567890123456789012345678901234567890123', 'consumer@test.com', 'test_consumer', 'Alice', 'Brown', NULL, 'free', true)
        ON CONFLICT (wallet_address) DO NOTHING;
    "
    
    # Create test products
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -c "
        -- Insert test products
        INSERT INTO products (product_id, product_name, product_type, manufacturer_id, batch_number, manufacture_date, expiry_date, raw_materials, metadata_uri) VALUES
        (1, 'Test Pharmaceutical Product', 'pharmaceutical', (SELECT id FROM users WHERE username = 'test_manufacturer'), 'TEST-PHARMA-001', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days', ARRAY['Active Ingredient', 'Starch', 'Talc'], 'https://ipfs.io/ipfs/QmTestPharma1'),
        (2, 'Test Electronics Product', 'electronics', (SELECT id FROM users WHERE username = 'test_manufacturer'), 'TEST-ELECTRONICS-001', NOW() - INTERVAL '15 days', NOW() + INTERVAL '350 days', ARRAY['Silicon', 'Copper', 'Plastic'], 'https://ipfs.io/ipfs/QmTestElectronics1'),
        (3, 'Test Luxury Product', 'luxury', (SELECT id FROM users WHERE username = 'test_manufacturer'), 'TEST-LUXURY-001', NOW() - INTERVAL '7 days', NOW() + INTERVAL '358 days', ARRAY['Gold', 'Diamond', 'Leather'], 'https://ipfs.io/ipfs/QmTestLuxury1')
        ON CONFLICT (product_id) DO NOTHING;
    "
    
    # Add stakeholders to products
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -c "
        -- Add stakeholders to products
        INSERT INTO product_stakeholders (product_id, stakeholder_id, role, added_by) VALUES
        ((SELECT id FROM products WHERE product_id = 1), (SELECT id FROM users WHERE username = 'test_distributor'), 'distributor', (SELECT id FROM users WHERE username = 'test_manufacturer')),
        ((SELECT id FROM products WHERE product_id = 1), (SELECT id FROM users WHERE username = 'test_retailer'), 'retailer', (SELECT id FROM users WHERE username = 'test_manufacturer')),
        ((SELECT id FROM products WHERE product_id = 2), (SELECT id FROM users WHERE username = 'test_distributor'), 'distributor', (SELECT id FROM users WHERE username = 'test_manufacturer')),
        ((SELECT id FROM products WHERE product_id = 3), (SELECT id FROM users WHERE username = 'test_retailer'), 'retailer', (SELECT id FROM users WHERE username = 'test_manufacturer'))
        ON CONFLICT (product_id, stakeholder_id, role) DO NOTHING;
    "
    
    # Add test checkpoints
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -c "
        -- Add test checkpoints
        INSERT INTO checkpoints (product_id, checkpoint_index, timestamp, location, stakeholder_id, status, temperature, humidity, additional_data) VALUES
        ((SELECT id FROM products WHERE product_id = 1), 0, NOW() - INTERVAL '30 days', 'Manufacturing Facility A', (SELECT id FROM users WHERE username = 'test_manufacturer'), 'manufactured', '22°C', '45%', 'Initial production completed'),
        ((SELECT id FROM products WHERE product_id = 1), 1, NOW() - INTERVAL '25 days', 'Quality Control Lab', (SELECT id FROM users WHERE username = 'test_manufacturer'), 'quality_checked', '20°C', '40%', 'Quality control passed'),
        ((SELECT id FROM products WHERE product_id = 1), 2, NOW() - INTERVAL '20 days', 'Packaging Facility', (SELECT id FROM users WHERE username = 'test_manufacturer'), 'packaged', '18°C', '35%', 'Packaged for shipment'),
        ((SELECT id FROM products WHERE product_id = 1), 3, NOW() - INTERVAL '15 days', 'Distribution Center', (SELECT id FROM users WHERE username = 'test_distributor'), 'shipped', '16°C', '30%', 'Shipped to retailer'),
        ((SELECT id FROM products WHERE product_id = 1), 4, NOW() - INTERVAL '10 days', 'Retail Store', (SELECT id FROM users WHERE username = 'test_retailer'), 'received', '20°C', '50%', 'Received at retail store'),
        ((SELECT id FROM products WHERE product_id = 1), 5, NOW() - INTERVAL '5 days', 'Retail Store', (SELECT id FROM users WHERE username = 'test_retailer'), 'sold', '22°C', '55%', 'Sold to consumer')
        ON CONFLICT (product_id, checkpoint_index) DO NOTHING;
    "
    
    # Add traceability chain
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -c "
        -- Add traceability chain
        INSERT INTO traceability_chain (product_id, checkpoint_id, sequence_order, from_location, to_location, from_stakeholder_id, to_stakeholder_id, duration_hours, distance_km) VALUES
        ((SELECT id FROM products WHERE product_id = 1), (SELECT id FROM checkpoints WHERE product_id = (SELECT id FROM products WHERE product_id = 1) AND checkpoint_index = 0), 0, 'Manufacturing Facility A', 'Manufacturing Facility A', (SELECT id FROM users WHERE username = 'test_manufacturer'), (SELECT id FROM users WHERE username = 'test_manufacturer'), 0, 0),
        ((SELECT id FROM products WHERE product_id = 1), (SELECT id FROM checkpoints WHERE product_id = (SELECT id FROM products WHERE product_id = 1) AND checkpoint_index = 1), 1, 'Manufacturing Facility A', 'Quality Control Lab', (SELECT id FROM users WHERE username = 'test_manufacturer'), (SELECT id FROM users WHERE username = 'test_manufacturer'), 120, 5),
        ((SELECT id FROM products WHERE product_id = 1), (SELECT id FROM checkpoints WHERE product_id = (SELECT id FROM products WHERE product_id = 1) AND checkpoint_index = 2), 2, 'Quality Control Lab', 'Packaging Facility', (SELECT id FROM users WHERE username = 'test_manufacturer'), (SELECT id FROM users WHERE username = 'test_manufacturer'), 120, 10),
        ((SELECT id FROM products WHERE product_id = 1), (SELECT id FROM checkpoints WHERE product_id = (SELECT id FROM products WHERE product_id = 1) AND checkpoint_index = 3), 3, 'Packaging Facility', 'Distribution Center', (SELECT id FROM users WHERE username = 'test_manufacturer'), (SELECT id FROM users WHERE username = 'test_distributor'), 120, 50),
        ((SELECT id FROM products WHERE product_id = 1), (SELECT id FROM checkpoints WHERE product_id = (SELECT id FROM products WHERE product_id = 1) AND checkpoint_index = 4), 4, 'Distribution Center', 'Retail Store', (SELECT id FROM users WHERE username = 'test_distributor'), (SELECT id FROM users WHERE username = 'test_retailer'), 120, 25),
        ((SELECT id FROM products WHERE product_id = 1), (SELECT id FROM checkpoints WHERE product_id = (SELECT id FROM products WHERE product_id = 1) AND checkpoint_index = 5), 5, 'Retail Store', 'Retail Store', (SELECT id FROM users WHERE username = 'test_retailer'), (SELECT id FROM users WHERE username = 'test_retailer'), 120, 0)
        ON CONFLICT DO NOTHING;
    "
    
    # Add test trace points
    PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -c "
        -- Add test trace points
        INSERT INTO trace_points (user_id, points, points_type, source_product_id, description) VALUES
        ((SELECT id FROM users WHERE username = 'test_manufacturer'), 100, 'checkpoint', (SELECT id FROM products WHERE product_id = 1), 'Added manufacturing checkpoint'),
        ((SELECT id FROM users WHERE username = 'test_manufacturer'), 50, 'verification', (SELECT id FROM products WHERE product_id = 1), 'Verified product quality'),
        ((SELECT id FROM users WHERE username = 'test_distributor'), 75, 'checkpoint', (SELECT id FROM products WHERE product_id = 1), 'Added shipping checkpoint'),
        ((SELECT id FROM users WHERE username = 'test_retailer'), 25, 'checkpoint', (SELECT id FROM products WHERE product_id = 1), 'Added retail checkpoint')
        ON CONFLICT DO NOTHING;
    "
    
    log "Test data inserted successfully"
}

# Function to verify setup
verify_setup() {
    log "Verifying database setup"
    
    # Check if all tables exist
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    
    if [ "$table_count" -gt 20 ]; then
        log "Database setup verified: $table_count tables created"
    else
        error "Database setup verification failed: Only $table_count tables found"
        return 1
    fi
    
    # Check if test data exists
    local user_count=$(PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
    local product_count=$(PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -t -c "SELECT COUNT(*) FROM products;" | tr -d ' ')
    local checkpoint_count=$(PGPASSWORD="$DB_PASSWORD" psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -t -c "SELECT COUNT(*) FROM checkpoints;" | tr -d ' ')
    
    log "Test data verification: $user_count users, $product_count products, $checkpoint_count checkpoints"
    
    # Test user permissions
    if PGPASSWORD="tracechain_secure_password_2024" psql --host="$DB_HOST" --port="$DB_PORT" --username="tracechain_app" --dbname="$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log "Application user permissions verified"
    else
        error "Application user permissions verification failed"
        return 1
    fi
    
    if PGPASSWORD="tracechain_readonly_password_2024" psql --host="$DB_HOST" --port="$DB_PORT" --username="tracechain_readonly" --dbname="$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log "Readonly user permissions verified"
    else
        error "Readonly user permissions verification failed"
        return 1
    fi
    
    log "Database setup verification completed successfully"
}

# Function to show database info
show_database_info() {
    log "Database Information"
    echo "==================="
    echo "Host: $DB_HOST"
    echo "Port: $DB_PORT"
    echo "Database: $DB_NAME"
    echo "Admin User: $DB_USER"
    echo ""
    echo "Application Users:"
    echo "  tracechain_app (Full Access)"
    echo "  tracechain_readonly (Read Only)"
    echo "  tracechain_analytics (Analytics)"
    echo ""
    echo "Connection Strings:"
    echo "  Admin: postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    echo "  App: postgresql://tracechain_app:tracechain_secure_password_2024@$DB_HOST:$DB_PORT/$DB_NAME"
    echo "  Readonly: postgresql://tracechain_readonly:tracechain_readonly_password_2024@$DB_HOST:$DB_PORT/$DB_NAME"
    echo "  Analytics: postgresql://tracechain_analytics:tracechain_analytics_password_2024@$DB_HOST:$DB_PORT/$DB_NAME"
}

# Function to show help
show_help() {
    echo "TraceChain V2 Database Setup Script"
    echo "==================================="
    echo ""
    echo "Usage: $0 [OPTIONS] [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup             Full database setup (default)"
    echo "  create-db         Create database only"
    echo "  create-users      Create users only"
    echo "  run-schema        Run schema migration only"
    echo "  run-migrations    Run migration files only"
    echo "  insert-test-data  Insert test data only"
    echo "  verify            Verify setup only"
    echo "  info              Show database information"
    echo "  help              Show this help message"
    echo ""
    echo "Options:"
    echo "  -h, --host HOST     Database host (default: localhost)"
    echo "  -p, --port PORT     Database port (default: 5432)"
    echo "  -d, --database DB   Database name (default: tracechain_v2)"
    echo "  -u, --user USER     Database user (default: postgres)"
    echo "  -w, --password PWD  Database password"
    echo "  -m, --mode MODE     Setup mode: full, schema, data, test (default: full)"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST            Database host"
    echo "  DB_PORT            Database port"
    echo "  DB_NAME            Database name"
    echo "  DB_USER            Database user"
    echo "  DB_PASSWORD        Database password"
    echo "  SETUP_MODE         Setup mode"
    echo ""
    echo "Examples:"
    echo "  $0 setup                    # Full database setup"
    echo "  $0 create-db                # Create database only"
    echo "  $0 insert-test-data         # Insert test data only"
    echo "  $0 verify                   # Verify setup"
    echo "  $0 info                     # Show database information"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -w|--password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -m|--mode)
            SETUP_MODE="$2"
            shift 2
            ;;
        setup)
            SETUP_MODE="full"
            shift
            ;;
        create-db)
            SETUP_MODE="database"
            shift
            ;;
        create-users)
            SETUP_MODE="users"
            shift
            ;;
        run-schema)
            SETUP_MODE="schema"
            shift
            ;;
        run-migrations)
            SETUP_MODE="migrations"
            shift
            ;;
        insert-test-data)
            SETUP_MODE="test"
            shift
            ;;
        verify)
            SETUP_MODE="verify"
            shift
            ;;
        info)
            show_database_info
            exit 0
            ;;
        help|--help|-h)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main setup logic
main() {
    log "Starting TraceChain V2 Database Setup"
    log "Setup mode: $SETUP_MODE"
    
    # Check prerequisites
    if ! check_postgresql; then
        exit 1
    fi
    
    if ! check_connection; then
        error "Cannot connect to PostgreSQL server at $DB_HOST:$DB_PORT"
        error "Please ensure PostgreSQL is running and credentials are correct"
        exit 1
    fi
    
    # Run setup based on mode
    case $SETUP_MODE in
        full)
            create_database
            create_users
            grant_permissions
            run_schema_migration
            run_migrations
            insert_test_data
            verify_setup
            show_database_info
            ;;
        database)
            create_database
            ;;
        users)
            create_users
            grant_permissions
            ;;
        schema)
            run_schema_migration
            ;;
        migrations)
            run_migrations
            ;;
        test)
            insert_test_data
            ;;
        verify)
            verify_setup
            ;;
        *)
            error "Unknown setup mode: $SETUP_MODE"
            show_help
            exit 1
            ;;
    esac
    
    log "Database setup completed successfully"
}

# Run main function
main
