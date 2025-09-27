#!/bin/bash

# Neon Database Deployment Script for TraceChain
# This script helps deploy and manage Neon database for different environments

set -e

echo "🚀 Neon Database Deployment for TraceChain..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to show help
show_help() {
    echo -e "${BLUE}Neon Database Deployment Script${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    echo "Usage: $0 [options] [command]"
    echo ""
    echo "Commands:"
    echo "  setup                 Set up Neon database for development"
    echo "  deploy                Deploy to staging/production"
    echo "  migrate               Run database migrations"
    echo "  seed                  Seed database with sample data"
    echo "  backup                Create database backup"
    echo "  restore               Restore from backup"
    echo "  status                Check database status"
    echo "  reset                 Reset database (development only)"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV         Environment (development|staging|production)"
    echo "  -d, --database DB     Database name"
    echo "  -r, --region REGION   Neon region"
    echo "  -v, --verbose         Verbose output"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup -e development"
    echo "  $0 deploy -e production"
    echo "  $0 migrate -e staging"
    echo "  $0 backup -e production"
}

# Configuration
ENVIRONMENT=${ENVIRONMENT:-"development"}
DATABASE_NAME=${DATABASE_NAME:-"tracechain_db"}
REGION=${REGION:-"us-east-1"}
VERBOSE=false

# Parse command line arguments
COMMAND=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--database)
            DATABASE_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        setup|deploy|migrate|seed|backup|restore|status|reset)
            COMMAND="$1"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
case "$ENVIRONMENT" in
    "development"|"staging"|"production")
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        print_info "Valid environments: development, staging, production"
        exit 1
        ;;
esac

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check if Prisma is available
    if [ ! -f "backend/package.json" ]; then
        print_error "Backend package.json not found"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Function to setup development database
setup_development() {
    print_info "Setting up Neon database for development..."
    
    cd backend
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        cp env.example .env
        print_warning "Please update DATABASE_URL in .env with your Neon connection string"
        return 1
    fi
    
    # Check if DATABASE_URL is set
    if ! grep -q "DATABASE_URL=" .env || grep -q "ep-xxx-xxx" .env; then
        print_error "Please update DATABASE_URL in .env with your actual Neon connection string"
        print_info "Get your connection string from: https://console.neon.tech"
        return 1
    fi
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm install
    
    # Generate Prisma client
    print_info "Generating Prisma client..."
    npx prisma generate
    
    # Run migrations
    print_info "Running database migrations..."
    npx prisma migrate dev --name init
    
    # Seed database
    print_info "Seeding database with sample data..."
    npm run db:seed
    
    print_status "Development database setup completed!"
}

# Function to deploy to staging/production
deploy_database() {
    print_info "Deploying database for $ENVIRONMENT environment..."
    
    cd backend
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_error ".env file not found for $ENVIRONMENT"
        return 1
    fi
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm install
    
    # Generate Prisma client
    print_info "Generating Prisma client..."
    npx prisma generate
    
    # Deploy migrations
    print_info "Deploying database migrations..."
    npx prisma migrate deploy
    
    # Seed database if development
    if [ "$ENVIRONMENT" = "development" ]; then
        print_info "Seeding database with sample data..."
        npm run db:seed
    fi
    
    print_status "Database deployment completed for $ENVIRONMENT!"
}

# Function to run migrations
run_migrations() {
    print_info "Running database migrations for $ENVIRONMENT..."
    
    cd backend
    
    # Generate Prisma client
    print_info "Generating Prisma client..."
    npx prisma generate
    
    # Run migrations
    if [ "$ENVIRONMENT" = "development" ]; then
        print_info "Running development migrations..."
        npx prisma migrate dev
    else
        print_info "Deploying production migrations..."
        npx prisma migrate deploy
    fi
    
    print_status "Migrations completed!"
}

# Function to seed database
seed_database() {
    print_info "Seeding database with sample data..."
    
    cd backend
    
    # Check if seeding is allowed
    if [ "$ENVIRONMENT" = "production" ]; then
        print_warning "Seeding production database is not recommended"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Seeding cancelled"
            return 0
        fi
    fi
    
    # Run seed script
    npm run db:seed
    
    print_status "Database seeded successfully!"
}

# Function to create backup
create_backup() {
    print_info "Creating database backup for $ENVIRONMENT..."
    
    # Note: Neon provides automatic backups
    # This function can be used to create manual backups if needed
    
    print_warning "Neon provides automatic backups and point-in-time recovery"
    print_info "To restore from a specific point in time, use the Neon console"
    print_info "Neon Console: https://console.neon.tech"
    
    print_status "Backup information provided"
}

# Function to restore from backup
restore_backup() {
    print_info "Restoring database from backup..."
    
    print_warning "Neon provides point-in-time recovery through the console"
    print_info "To restore from a specific point in time:"
    print_info "1. Go to https://console.neon.tech"
    print_info "2. Select your project"
    print_info "3. Use the 'Restore' feature"
    print_info "4. Choose the point in time to restore to"
    
    print_status "Restore information provided"
}

# Function to check database status
check_status() {
    print_info "Checking database status for $ENVIRONMENT..."
    
    cd backend
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_error ".env file not found"
        return 1
    fi
    
    # Test database connection
    print_info "Testing database connection..."
    if npx prisma db pull --force > /dev/null 2>&1; then
        print_status "Database connection successful"
    else
        print_error "Database connection failed"
        return 1
    fi
    
    # Show database info
    print_info "Database information:"
    echo "  Environment: $ENVIRONMENT"
    echo "  Database: $DATABASE_NAME"
    echo "  Region: $REGION"
    echo "  Status: Connected"
    
    print_status "Database status check completed"
}

# Function to reset database
reset_database() {
    print_info "Resetting database for $ENVIRONMENT..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        print_error "Cannot reset production database"
        return 1
    fi
    
    cd backend
    
    # Confirm reset
    print_warning "This will delete all data in the database"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Reset cancelled"
        return 0
    fi
    
    # Reset database
    print_info "Resetting database..."
    npx prisma migrate reset --force
    
    # Seed database
    print_info "Seeding database with sample data..."
    npm run db:seed
    
    print_status "Database reset completed!"
}

# Main execution
case "$COMMAND" in
    "setup")
        check_prerequisites
        setup_development
        ;;
    "deploy")
        check_prerequisites
        deploy_database
        ;;
    "migrate")
        check_prerequisites
        run_migrations
        ;;
    "seed")
        check_prerequisites
        seed_database
        ;;
    "backup")
        create_backup
        ;;
    "restore")
        restore_backup
        ;;
    "status")
        check_status
        ;;
    "reset")
        check_prerequisites
        reset_database
        ;;
    "")
        print_error "No command specified"
        show_help
        exit 1
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac

print_status "Neon database operation completed successfully!"
