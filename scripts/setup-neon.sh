#!/bin/bash

# Neon Database Setup Script for TraceChain
# This script helps set up Neon PostgreSQL database for TraceChain

set -e

echo "🚀 Setting up Neon Database for TraceChain..."

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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the TraceChain root directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_info "Installing backend dependencies..."
cd backend
npm install

print_info "Generating Prisma client..."
npx prisma generate

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    cp env.example .env
    print_warning "Please update the DATABASE_URL in .env with your Neon connection string"
    print_info "Get your connection string from: https://console.neon.tech"
    echo ""
    print_info "Example DATABASE_URL:"
    echo "DATABASE_URL=\"postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/tracechain_db?sslmode=require\""
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=" .env || grep -q "ep-xxx-xxx" .env; then
    print_error "Please update DATABASE_URL in .env with your actual Neon connection string"
    print_info "Get your connection string from: https://console.neon.tech"
    exit 1
fi

print_info "Running database migration..."
npx prisma migrate dev --name init

print_info "Seeding database with sample data..."
npm run db:seed

print_status "Neon database setup completed successfully!"
echo ""
print_info "Next steps:"
echo "1. Start the backend server: npm run dev"
echo "2. Test the connection: curl http://localhost:3000/api/database/health"
echo "3. View database stats: curl http://localhost:3000/api/database/stats"
echo ""
print_info "Useful commands:"
echo "- View database: npx prisma studio"
echo "- Reset database: npx prisma migrate reset"
echo "- Generate client: npx prisma generate"
echo ""
print_status "Setup complete! 🎉"
