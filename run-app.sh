#!/bin/bash

# TraceChain Run Script
# This script runs the complete TraceChain application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_ROOT="/Users/partha/Work/web3-dream"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/pids"

# Runtime configuration
RUN_ENV=${RUN_ENV:-"development"}
RUN_MODE=${RUN_MODE:-"all"} # all, services, smart-contracts, backend, frontend, mcp
RUN_PORT_BACKEND=${RUN_PORT_BACKEND:-3000}
RUN_PORT_FRONTEND=${RUN_PORT_FRONTEND:-3001}
RUN_PORT_HARDHAT=${RUN_PORT_HARDHAT:-8545}

# Function to print status messages
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

print_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# Function to show help
show_help() {
    echo -e "${BLUE}TraceChain Run Script${NC}"
    echo -e "${BLUE}=====================${NC}"
    echo ""
    echo "Usage: $0 [options] [mode]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV        Runtime environment (development|staging|production)"
    echo "  -p, --port PORT      Override default ports"
    echo "  -d, --detach         Run in background (detached mode)"
    echo "  -l, --logs           Show logs after starting"
    echo "  -s, --stop           Stop running services"
    echo "  -r, --restart        Restart services"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Modes:"
    echo "  all                  Run all services (default)"
    echo "  services             Run Redis and other services only"
    echo "  smart-contracts      Run Hardhat node only"
    echo "  backend              Run backend API only"
    echo "  frontend             Run frontend only"
    echo "  mcp                  Run MCP servers only"
    echo "  dev                  Run in development mode"
    echo "  prod                 Run in production mode"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run all in development"
    echo "  $0 -e production all         # Run all in production"
    echo "  $0 -d backend                # Run backend in background"
    echo "  $0 -l services               # Run services and show logs"
    echo "  $0 -s                        # Stop all services"
    echo "  $0 -r                        # Restart all services"
}

# Function to create directories
create_directories() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$PID_DIR"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_status "$service_name is ready"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within timeout"
    return 1
}

# Function to start services
start_services() {
    print_header "Starting Services (Redis, MQTT, etc.)"
    
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        print_error "Docker Compose file not found"
        return 1
    fi
    
    # Check if Podman is running
    if ! podman info > /dev/null 2>&1; then
        print_error "Podman is not running. Please start Podman first."
        return 1
    fi
    
    print_info "Starting services (Redis, MQTT, etc.)..."
    
    case "$RUN_ENV" in
        "production")
            podman-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
            ;;
        "staging")
            podman-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
            ;;
        *)
            podman-compose up -d
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        print_status "Services started"
        
        # Wait for critical services
        sleep 5
        wait_for_service "http://localhost:6379" "Redis" || true
        
        print_status "Services are running"
    else
        print_error "Failed to start services"
        return 1
    fi
}

# Function to start Hardhat node
start_hardhat() {
    print_header "Starting Hardhat Node"
    
    if [ ! -f "$PROJECT_ROOT/smart-contracts/package.json" ]; then
        print_error "Smart contracts not found"
        return 1
    fi
    
    # Check if port is available
    if ! check_port $RUN_PORT_HARDHAT; then
        print_warning "Port $RUN_PORT_HARDHAT is already in use"
        return 0
    fi
    
    print_info "Starting Hardhat node on port $RUN_PORT_HARDHAT..."
    
    cd "$PROJECT_ROOT/smart-contracts"
    nohup npx hardhat node --port $RUN_PORT_HARDHAT > "$LOG_DIR/hardhat.log" 2>&1 &
    local hardhat_pid=$!
    echo $hardhat_pid > "$PID_DIR/hardhat.pid"
    
    # Wait for Hardhat to be ready
    sleep 3
    if wait_for_service "http://localhost:$RUN_PORT_HARDHAT" "Hardhat Node"; then
        print_status "Hardhat node started (PID: $hardhat_pid)"
    else
        print_error "Hardhat node failed to start"
        return 1
    fi
}

# Function to start backend API
start_backend() {
    print_header "Starting Backend API"
    
    if [ ! -f "$PROJECT_ROOT/backend/package.json" ]; then
        print_error "Backend not found"
        return 1
    fi
    
    # Check if port is available
    if ! check_port $RUN_PORT_BACKEND; then
        print_warning "Port $RUN_PORT_BACKEND is already in use"
        return 0
    fi
    
    print_info "Starting backend API on port $RUN_PORT_BACKEND..."
    
    cd "$PROJECT_ROOT/backend"
    
    # Set environment variables
    export NODE_ENV="$RUN_ENV"
    export PORT="$RUN_PORT_BACKEND"
    export DATABASE_URL="${DATABASE_URL:-postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/tracechain_db?sslmode=require}"
    export REDIS_URL="redis://localhost:6379"
    export JWT_SECRET="tracechain-jwt-secret-dev"
    export POLYGON_RPC_URL="http://localhost:$RUN_PORT_HARDHAT"
    
    nohup npm start > "$LOG_DIR/backend.log" 2>&1 &
    local backend_pid=$!
    echo $backend_pid > "$PID_DIR/backend.pid"
    
    # Wait for backend to be ready
    sleep 3
    if wait_for_service "http://localhost:$RUN_PORT_BACKEND/health" "Backend API"; then
        print_status "Backend API started (PID: $backend_pid)"
    else
        print_error "Backend API failed to start"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    print_header "Starting Frontend"
    
    if [ ! -f "$PROJECT_ROOT/frontend/package.json" ]; then
        print_error "Frontend not found"
        return 1
    fi
    
    # Check if port is available
    if ! check_port $RUN_PORT_FRONTEND; then
        print_warning "Port $RUN_PORT_FRONTEND is already in use"
        return 0
    fi
    
    print_info "Starting frontend on port $RUN_PORT_FRONTEND..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Set environment variables
    export PORT="$RUN_PORT_FRONTEND"
    export REACT_APP_API_URL="http://localhost:$RUN_PORT_BACKEND"
    export REACT_APP_ENV="$RUN_ENV"
    export REACT_APP_BLOCKCHAIN_URL="http://localhost:$RUN_PORT_HARDHAT"
    
    nohup npm start > "$LOG_DIR/frontend.log" 2>&1 &
    local frontend_pid=$!
    echo $frontend_pid > "$PID_DIR/frontend.pid"
    
    # Wait for frontend to be ready
    sleep 5
    if wait_for_service "http://localhost:$RUN_PORT_FRONTEND" "Frontend"; then
        print_status "Frontend started (PID: $frontend_pid)"
    else
        print_error "Frontend failed to start"
        return 1
    fi
}

# Function to start unified MCP server
start_mcp() {
    print_header "Starting Unified MCP Server"
    
    if [ -f "$PROJECT_ROOT/run-mcp-unified.sh" ]; then
        print_info "Starting unified MCP server..."
        "$PROJECT_ROOT/run-mcp-unified.sh" start
        if [ $? -eq 0 ]; then
            print_status "Unified MCP server started"
        else
            print_warning "Unified MCP server failed to start"
        fi
    else
        print_warning "Unified MCP runner script not found"
    fi
}

# Function to stop all services
stop_all() {
    print_header "Stopping All Services"
    
    # Stop unified MCP server
    if [ -f "$PROJECT_ROOT/run-mcp-unified.sh" ]; then
        print_info "Stopping unified MCP server..."
        "$PROJECT_ROOT/run-mcp-unified.sh" stop
    fi
    
    # Stop individual processes
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local frontend_pid=$(cat "$PID_DIR/frontend.pid")
        if kill -0 $frontend_pid 2>/dev/null; then
            kill $frontend_pid
            print_status "Stopped frontend (PID: $frontend_pid)"
        fi
        rm -f "$PID_DIR/frontend.pid"
    fi
    
    if [ -f "$PID_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$PID_DIR/backend.pid")
        if kill -0 $backend_pid 2>/dev/null; then
            kill $backend_pid
            print_status "Stopped backend (PID: $backend_pid)"
        fi
        rm -f "$PID_DIR/backend.pid"
    fi
    
    if [ -f "$PID_DIR/hardhat.pid" ]; then
        local hardhat_pid=$(cat "$PID_DIR/hardhat.pid")
        if kill -0 $hardhat_pid 2>/dev/null; then
            kill $hardhat_pid
            print_status "Stopped Hardhat node (PID: $hardhat_pid)"
        fi
        rm -f "$PID_DIR/hardhat.pid"
    fi
    
    # Stop services
    print_info "Stopping services..."
    podman-compose down 2>/dev/null || true
    
    print_status "All services stopped"
}

# Function to show service status
show_status() {
    print_header "Service Status"
    
    # Check services
    print_info "Services:"
    podman-compose ps 2>/dev/null || print_warning "Services not running"
    
    # Check individual processes
    echo ""
    print_info "Individual Processes:"
    
    if [ -f "$PID_DIR/hardhat.pid" ]; then
        local hardhat_pid=$(cat "$PID_DIR/hardhat.pid")
        if kill -0 $hardhat_pid 2>/dev/null; then
            print_status "Hardhat Node: Running (PID: $hardhat_pid)"
        else
            print_error "Hardhat Node: Not running"
        fi
    else
        print_error "Hardhat Node: Not running"
    fi
    
    if [ -f "$PID_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$PID_DIR/backend.pid")
        if kill -0 $backend_pid 2>/dev/null; then
            print_status "Backend API: Running (PID: $backend_pid)"
        else
            print_error "Backend API: Not running"
        fi
    else
        print_error "Backend API: Not running"
    fi
    
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local frontend_pid=$(cat "$PID_DIR/frontend.pid")
        if kill -0 $frontend_pid 2>/dev/null; then
            print_status "Frontend: Running (PID: $frontend_pid)"
        else
            print_error "Frontend: Not running"
        fi
    else
        print_error "Frontend: Not running"
    fi
    
    # Check unified MCP status
    if [ -f "$PROJECT_ROOT/run-mcp-unified.sh" ]; then
        echo ""
        print_info "Unified MCP Server:"
        "$PROJECT_ROOT/run-mcp-unified.sh" status
    fi
}

# Function to show logs
show_logs() {
    print_header "Service Logs"
    
    if [ -f "$LOG_DIR/hardhat.log" ]; then
        echo "📄 Hardhat Node Logs:"
        echo "===================="
        tail -n 20 "$LOG_DIR/hardhat.log"
        echo ""
    fi
    
    if [ -f "$LOG_DIR/backend.log" ]; then
        echo "📄 Backend API Logs:"
        echo "==================="
        tail -n 20 "$LOG_DIR/backend.log"
        echo ""
    fi
    
    if [ -f "$LOG_DIR/frontend.log" ]; then
        echo "📄 Frontend Logs:"
        echo "================"
        tail -n 20 "$LOG_DIR/frontend.log"
        echo ""
    fi
    
    print_info "Full logs available in: $LOG_DIR"
}

# Function to run all services
run_all() {
    print_header "Starting TraceChain Application"
    print_info "Environment: $RUN_ENV"
    print_info "Mode: $RUN_MODE"
    echo ""
    
    local start_time=$(date +%s)
    local services_started=0
    
    # Create directories
    create_directories
    
    # Start services based on mode
    case "$RUN_MODE" in
        "services")
            start_services
            if [ $? -eq 0 ]; then services_started=$((services_started + 1)); fi
            ;;
        "smart-contracts")
            start_hardhat
            if [ $? -eq 0 ]; then services_started=$((services_started + 1)); fi
            ;;
        "backend")
            start_backend
            if [ $? -eq 0 ]; then services_started=$((services_started + 1)); fi
            ;;
        "frontend")
            start_frontend
            if [ $? -eq 0 ]; then services_started=$((services_started + 1)); fi
            ;;
        "mcp")
            start_mcp
            if [ $? -eq 0 ]; then services_started=$((services_started + 1)); fi
            ;;
        "dev")
            start_services && start_hardhat && start_backend && start_frontend && start_mcp
            services_started=5
            ;;
        "prod")
            RUN_ENV="production"
            start_services && start_backend && start_frontend
            services_started=3
            ;;
        "all"|*)
            start_services
            if [ $? -eq 0 ]; then services_started=$((services_started + 1)); fi
            
            start_hardhat
            if [ $? -eq 0 ]; then services_started=$((services_started + 1)); fi
            
            start_backend
            if [ $? -eq 0 ]; then services_started=$((services_started + 1)); fi
            
            start_frontend
            if [ $? -eq 0 ]; then services_started=$((services_started + 1)); fi
            
            start_mcp
            if [ $? -eq 0 ]; then services_started=$((services_started + 1)); fi
            ;;
    esac
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $services_started -gt 0 ]; then
        print_status "TraceChain started successfully in ${duration}s"
        echo ""
        print_info "Service URLs:"
        echo "  • Frontend: http://localhost:$RUN_PORT_FRONTEND"
        echo "  • Backend API: http://localhost:$RUN_PORT_BACKEND"
        echo "  • Hardhat Node: http://localhost:$RUN_PORT_HARDHAT"
        echo "  • Database: Neon PostgreSQL (serverless)"
        echo "  • Redis: localhost:6379"
        echo "  • MQTT: localhost:1883"
        echo ""
        print_info "Management Commands:"
        echo "  • Check status: $0 status"
        echo "  • View logs: $0 logs"
        echo "  • Stop services: $0 stop"
        echo "  • Restart: $0 restart"
        
        if [ "$SHOW_LOGS" = true ]; then
            show_logs
        fi
    else
        print_error "Failed to start TraceChain services"
        return 1
    fi
}

# Parse command line arguments
DETACHED_MODE=false
SHOW_LOGS=false
STOP_SERVICES=false
RESTART_SERVICES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            RUN_ENV="$2"
            shift 2
            ;;
        -p|--port)
            RUN_PORT_BACKEND="$2"
            shift 2
            ;;
        -d|--detach)
            DETACHED_MODE=true
            shift
            ;;
        -l|--logs)
            SHOW_LOGS=true
            shift
            ;;
        -s|--stop)
            STOP_SERVICES=true
            shift
            ;;
        -r|--restart)
            RESTART_SERVICES=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            print_error "Unknown option $1"
            show_help
            exit 1
            ;;
        *)
            RUN_MODE="$1"
            shift
            ;;
    esac
done

# Handle special commands
if [ "$STOP_SERVICES" = true ]; then
    stop_all
    exit 0
fi

if [ "$RESTART_SERVICES" = true ]; then
    stop_all
    sleep 2
    run_all
    exit 0
fi

# Validate runtime environment
case "$RUN_ENV" in
    "development"|"staging"|"production")
        ;;
    *)
        print_error "Invalid runtime environment: $RUN_ENV"
        print_info "Valid environments: development, staging, production"
        exit 1
        ;;
esac

# Validate run mode
case "$RUN_MODE" in
    "all"|"services"|"smart-contracts"|"backend"|"frontend"|"mcp"|"dev"|"prod")
        ;;
    *)
        print_error "Invalid run mode: $RUN_MODE"
        print_info "Valid modes: all, services, smart-contracts, backend, frontend, mcp, dev, prod"
        exit 1
        ;;
esac

# Main execution
run_all
