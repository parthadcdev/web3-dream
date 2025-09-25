#!/bin/bash

# Conditional Docker Compose Startup Script
# This script uses advanced Docker Compose features to conditionally start services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if service is available
check_service() {
    local host=$1
    local port=$2
    local service_name=$3
    
    # Check if port is listening
    if nc -z $host $port 2>/dev/null; then
        print_warning "$service_name is already running on $host:$port"
        return 0
    else
        print_info "$service_name is not running on $host:$port"
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=1
    
    print_info "Waiting for $service_name to be ready on $host:$port..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z $host $port 2>/dev/null; then
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

# Function to create conditional docker-compose override
create_conditional_override() {
    local override_file="docker-compose.conditional.yml"
    
    print_info "Creating conditional Docker Compose override..."
    
    cat > $override_file << 'EOF'
version: '3.8'

# Conditional Docker Compose Override
# This file is generated automatically based on existing services

services:
  postgres:
    # Conditionally override postgres service
    profiles:
      - postgres
    # Only start if no external postgres is detected
    condition: ${POSTGRES_EXTERNAL:-false}

  redis:
    # Conditionally override redis service  
    profiles:
      - redis
    # Only start if no external redis is detected
    condition: ${REDIS_EXTERNAL:-false}

  backend:
    environment:
      # Dynamic database URL based on external service detection
      DATABASE_URL: ${DATABASE_URL:-postgresql://tracechain_user:tracechain_password@postgres:5432/tracechain_db}
      REDIS_URL: ${REDIS_URL:-redis://redis:6379}
      EXTERNAL_POSTGRES: ${POSTGRES_EXTERNAL:-false}
      EXTERNAL_REDIS: ${REDIS_EXTERNAL:-false}
EOF
    
    print_status "Conditional override file created: $override_file"
}

# Function to detect external services and set environment variables
detect_external_services() {
    print_info "Detecting external services..."
    
    # Check for PostgreSQL
    if check_service "localhost" "5432" "PostgreSQL"; then
        export POSTGRES_EXTERNAL=true
        export DATABASE_URL="postgresql://tracechain_user:tracechain_password@host.docker.internal:5432/tracechain_db"
        print_warning "Using external PostgreSQL"
    else
        export POSTGRES_EXTERNAL=false
        export DATABASE_URL="postgresql://tracechain_user:tracechain_password@postgres:5432/tracechain_db"
        print_info "Will start internal PostgreSQL"
    fi
    
    # Check for Redis
    if check_service "localhost" "6379" "Redis"; then
        export REDIS_EXTERNAL=true
        export REDIS_URL="redis://host.docker.internal:6379"
        print_warning "Using external Redis"
    else
        export REDIS_EXTERNAL=false
        export REDIS_URL="redis://redis:6379"
        print_info "Will start internal Redis"
    fi
    
    # Export other environment variables
    export COMPOSE_PROFILES=""
    
    if [ "$POSTGRES_EXTERNAL" = false ]; then
        export COMPOSE_PROFILES="$COMPOSE_PROFILES,postgres"
    fi
    
    if [ "$REDIS_EXTERNAL" = false ]; then
        export COMPOSE_PROFILES="$COMPOSE_PROFILES,redis"
    fi
    
    # Remove leading comma
    export COMPOSE_PROFILES=$(echo $COMPOSE_PROFILES | sed 's/^,//')
    
    print_info "Service configuration:"
    echo "  PostgreSQL External: $POSTGRES_EXTERNAL"
    echo "  Redis External: $REDIS_EXTERNAL"
    echo "  Compose Profiles: $COMPOSE_PROFILES"
}

# Function to start services with conditional logic
start_conditional_services() {
    local base_file="docker-compose.yml"
    local smart_file="docker-compose.smart.yml"
    
    print_info "Starting services with conditional logic..."
    
    # Detect external services
    detect_external_services
    
    # Create conditional override
    create_conditional_override
    
    # Choose compose file based on external services
    if [ "$POSTGRES_EXTERNAL" = true ] || [ "$REDIS_EXTERNAL" = true ]; then
        print_info "Using smart compose file for mixed external/internal services"
        local compose_file=$smart_file
    else
        print_info "Using standard compose file for all internal services"
        local compose_file=$base_file
    fi
    
    # Start services
    if [ -n "$COMPOSE_PROFILES" ]; then
        print_info "Starting with profiles: $COMPOSE_PROFILES"
        COMPOSE_PROFILES=$COMPOSE_PROFILES docker-compose -f $compose_file up -d
    else
        print_info "Starting all services"
        docker-compose -f $compose_file up -d
    fi
    
    if [ $? -eq 0 ]; then
        print_status "Services started successfully"
        
        # Wait for services to be ready
        if [ "$POSTGRES_EXTERNAL" = false ]; then
            wait_for_service "localhost" "5432" "PostgreSQL" || true
        fi
        
        if [ "$REDIS_EXTERNAL" = false ]; then
            wait_for_service "localhost" "6379" "Redis" || true
        fi
        
        wait_for_service "localhost" "3000" "Backend API" || true
        wait_for_service "localhost" "3001" "Frontend" || true
        wait_for_service "localhost" "8545" "Hardhat" || true
        
    else
        print_error "Failed to start services"
        return 1
    fi
}

# Function to show service status
show_conditional_status() {
    print_info "Conditional Service Status:"
    echo ""
    
    # Check PostgreSQL
    if [ "$POSTGRES_EXTERNAL" = true ]; then
        print_warning "PostgreSQL: External (localhost:5432)"
    elif docker ps --format "table {{.Names}}" | grep -q "tracechain-postgres"; then
        print_status "PostgreSQL: Internal (tracechain-postgres)"
    else
        print_error "PostgreSQL: Not running"
    fi
    
    # Check Redis
    if [ "$REDIS_EXTERNAL" = true ]; then
        print_warning "Redis: External (localhost:6379)"
    elif docker ps --format "table {{.Names}}" | grep -q "tracechain-redis"; then
        print_status "Redis: Internal (tracechain-redis)"
    else
        print_error "Redis: Not running"
    fi
    
    # Check other services
    local services=("tracechain-backend:Backend" "tracechain-frontend:Frontend" "tracechain-hardhat:Hardhat" "tracechain-mqtt:MQTT" "tracechain-prometheus:Prometheus" "tracechain-grafana:Grafana")
    
    for service_info in "${services[@]}"; do
        local container_name=$(echo $service_info | cut -d':' -f1)
        local service_name=$(echo $service_info | cut -d':' -f2)
        
        if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
            print_status "$service_name: Running ($container_name)"
        else
            print_error "$service_name: Not running"
        fi
    done
}

# Function to stop conditional services
stop_conditional_services() {
    print_info "Stopping conditional services..."
    
    # Stop using the same logic as start
    if [ "$POSTGRES_EXTERNAL" = true ] || [ "$REDIS_EXTERNAL" = true ]; then
        docker-compose -f docker-compose.smart.yml down
    else
        docker-compose -f docker-compose.yml down
    fi
    
    # Clean up override file
    rm -f docker-compose.conditional.yml
    
    print_status "Services stopped"
}

# Function to show help
show_help() {
    echo "Conditional Docker Compose Management"
    echo "====================================="
    echo ""
    echo "This script intelligently detects existing PostgreSQL and Redis services"
    echo "and only starts the TraceChain services that are needed."
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start           Start services with conditional logic"
    echo "  stop            Stop all TraceChain services"
    echo "  status          Show service status"
    echo "  help            Show this help message"
    echo ""
    echo "Features:"
    echo "  • Automatically detects existing PostgreSQL/Redis services"
    echo "  • Only starts missing services"
    echo "  • Uses appropriate Docker Compose configuration"
    echo "  • Provides detailed status information"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start services conditionally"
    echo "  $0 status                   # Check service status"
    echo "  $0 stop                     # Stop all services"
}

# Main command handling
case "${1:-start}" in
    "start")
        start_conditional_services
        echo ""
        show_conditional_status
        ;;
    "stop")
        stop_conditional_services
        ;;
    "status")
        detect_external_services
        show_conditional_status
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
