#!/bin/bash

# Smart Podman Compose Startup Script
# This script intelligently detects existing containers and starts only what's needed

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

# Function to check if container is running
check_container() {
    local container_name=$1
    local port=$2
    
    # Check if container is running
    if podman ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        return 0
    fi
    
    # Check if port is in use by any container
    if podman ps --format "table {{.Ports}}" | grep -q ":${port}->"; then
        return 0
    fi
    
    return 1
}

# Function to check external services
check_external_services() {
    print_info "Checking for existing external services..."
    
    local external_postgres=false
    local external_redis=false
    local external_postgres_host=""
    local external_redis_host=""
    
    # Check for external PostgreSQL
    if check_container "postgres" "5432" || lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
        external_postgres=true
        external_postgres_host="localhost"
        print_warning "External PostgreSQL detected on port 5432"
    fi
    
    # Check for external Redis
    if check_container "redis" "6379" || lsof -Pi :6379 -sTCP:LISTEN -t >/dev/null 2>&1; then
        external_redis=true
        external_redis_host="localhost"
        print_warning "External Redis detected on port 6379"
    fi
    
    # Export environment variables for docker-compose
    export EXTERNAL_POSTGRES=$external_postgres
    export EXTERNAL_REDIS=$external_redis
    export POSTGRES_HOST=$external_postgres_host
    export REDIS_HOST=$external_redis_host
    
    if [ "$external_postgres" = true ]; then
        export POSTGRES_PORT="5432"
    fi
    
    if [ "$external_redis" = true ]; then
        export REDIS_PORT="6379"
    fi
}

# Function to start services selectively
start_services() {
    local compose_file="docker-compose.smart.yml"
    
    print_info "Starting TraceChain services with smart container detection..."
    
    # Check for existing services
    check_external_services
    
    # Determine which services to start
    local services_to_start=""
    
    # Always start core application services
    services_to_start="frontend backend hardhat"
    
    # Add infrastructure services if external ones aren't found
    if [ "$EXTERNAL_POSTGRES" = false ]; then
        services_to_start="$services_to_start postgres"
        print_info "Will start PostgreSQL container"
    else
        print_info "Using external PostgreSQL"
    fi
    
    if [ "$EXTERNAL_REDIS" = false ]; then
        services_to_start="$services_to_start redis"
        print_info "Will start Redis container"
    else
        print_info "Using external Redis"
    fi
    
    # Add optional services
    services_to_start="$services_to_start mosquitto prometheus grafana"
    
    print_info "Starting services: $services_to_start"
    
    # Start services using profiles
    podman-compose -f $compose_file --profile all up -d $services_to_start
    
    if [ $? -eq 0 ]; then
        print_status "Services started successfully"
    else
        print_error "Failed to start services"
        return 1
    fi
}

# Function to show service status
show_status() {
    print_info "Service Status:"
    echo ""
    
    # Check PostgreSQL
    if [ "$EXTERNAL_POSTGRES" = true ]; then
        print_warning "PostgreSQL: External (localhost:5432)"
    elif check_container "tracechain-postgres" "5432"; then
        print_status "PostgreSQL: Running (tracechain-postgres)"
    else
        print_error "PostgreSQL: Not running"
    fi
    
    # Check Redis
    if [ "$EXTERNAL_REDIS" = true ]; then
        print_warning "Redis: External (localhost:6379)"
    elif check_container "tracechain-redis" "6379"; then
        print_status "Redis: Running (tracechain-redis)"
    else
        print_error "Redis: Not running"
    fi
    
    # Check other services
    if check_container "tracechain-backend" "3000"; then
        print_status "Backend: Running (tracechain-backend)"
    else
        print_error "Backend: Not running"
    fi
    
    if check_container "tracechain-frontend" "3001"; then
        print_status "Frontend: Running (tracechain-frontend)"
    else
        print_error "Frontend: Not running"
    fi
    
    if check_container "tracechain-hardhat" "8545"; then
        print_status "Hardhat: Running (tracechain-hardhat)"
    else
        print_error "Hardhat: Not running"
    fi
    
    if check_container "tracechain-mqtt" "1883"; then
        print_status "MQTT: Running (tracechain-mqtt)"
    else
        print_error "MQTT: Not running"
    fi
    
    if check_container "tracechain-prometheus" "9090"; then
        print_status "Prometheus: Running (tracechain-prometheus)"
    else
        print_error "Prometheus: Not running"
    fi
    
    if check_container "tracechain-grafana" "3003"; then
        print_status "Grafana: Running (tracechain-grafana)"
    else
        print_error "Grafana: Not running"
    fi
}

# Function to stop services
stop_services() {
    print_info "Stopping TraceChain services..."
    
    podman-compose -f docker-compose.smart.yml down
    
    print_status "Services stopped"
}

# Function to restart services
restart_services() {
    print_info "Restarting TraceChain services..."
    
    stop_services
    sleep 2
    start_services
}

# Function to show logs
show_logs() {
    local service=${1:-""}
    
    if [ -n "$service" ]; then
        podman-compose -f docker-compose.smart.yml logs -f $service
    else
        podman-compose -f docker-compose.smart.yml logs -f
    fi
}

# Function to show help
show_help() {
    echo "Smart Podman Compose Management"
    echo "==============================="
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start           Start services with smart container detection"
    echo "  stop            Stop all TraceChain services"
    echo "  restart         Restart all services"
    echo "  status          Show service status"
    echo "  logs [service]  Show logs (optionally for specific service)"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start services intelligently"
    echo "  $0 status                   # Check service status"
    echo "  $0 logs backend             # Show backend logs"
    echo "  $0 restart                  # Restart all services"
}

# Main command handling
case "${1:-start}" in
    "start")
        start_services
        echo ""
        show_status
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        echo ""
        show_status
        ;;
    "status")
        check_external_services
        show_status
        ;;
    "logs")
        show_logs "$2"
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
