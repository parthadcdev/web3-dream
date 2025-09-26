#!/bin/bash

# TraceChain Quick Start Script
# One-command setup and run for the entire project

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 TraceChain Quick Start${NC}"
echo -e "${BLUE}========================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "smart-contracts/package.json" ]; then
    echo "❌ Please run from TraceChain project root directory"
    exit 1
fi

print_status "Found TraceChain project"

# Install dependencies
print_info "Installing dependencies..."
if [ -f "smart-contracts/package.json" ]; then
    cd smart-contracts && npm install && cd ..
    print_status "Smart contracts dependencies installed"
fi

if [ -f "backend/package.json" ]; then
    cd backend && npm install && cd ..
    print_status "Backend dependencies installed"
fi

if [ -f "frontend/package.json" ]; then
    cd frontend && npm install && cd ..
    print_status "Frontend dependencies installed"
fi

# Setup MCP
print_info "Setting up MCP integration..."
if [ -f "setup-mcp.sh" ]; then
    ./setup-mcp.sh
    print_status "MCP setup complete"
else
    echo "⚠️  MCP setup script not found, skipping MCP setup"
fi

# Start services
print_info "Starting development environment..."
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d
    print_status "Docker services started"
else
    echo "⚠️  Docker Compose not found, please start services manually"
fi

# Start MCP servers
print_info "Starting MCP servers..."
if [ -f "run-mcp-unified.sh" ]; then
    ./run-mcp-unified.sh start
    print_status "MCP servers started"
else
    echo "⚠️  MCP runner script not found"
fi

echo ""
echo -e "${GREEN}🎉 TraceChain is ready!${NC}"
echo ""
echo -e "${BLUE}Available Services:${NC}"
echo "• Frontend: http://localhost:3000"
echo "• Backend API: http://localhost:3001"
echo "• Smart Contracts: Hardhat console"
echo "• Database: PostgreSQL on port 5432"
echo "• Cache: Redis on port 6379"
echo "• MQTT: Mosquitto on port 1883"
echo "• Monitoring: Prometheus (9090) + Grafana (3003)"
echo ""
echo -e "${BLUE}MCP Integration:${NC}"
echo "• MCP servers are running"
echo "• Cursor IDE integration configured"
echo "• Use MCP commands in Cursor for analysis"
echo ""
echo -e "${BLUE}Quick Commands:${NC}"
echo "• ./run-mcp-unified.sh status    - Check unified MCP status"
echo "• ./run-mcp-unified.sh test      - Test unified MCP functionality"
echo "• ./run-mcp-unified.sh logs      - View unified MCP logs"
echo "• make logs              - View all logs"
echo "• make stop              - Stop all services"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
