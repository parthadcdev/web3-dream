#!/bin/bash

# Podman Setup and Management Script for TraceChain
# This script helps set up and manage Podman containers for the TraceChain application

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

# Function to check if podman is installed
check_podman() {
    if ! command -v podman &> /dev/null; then
        print_error "Podman is not installed. Please install Podman first."
        echo ""
        echo "Installation instructions:"
        echo "  macOS: brew install podman"
        echo "  Ubuntu: sudo apt-get install podman"
        echo "  CentOS/RHEL: sudo yum install podman"
        exit 1
    fi
    
    print_status "Podman is installed: $(podman --version)"
}

# Function to check if podman-compose is available
check_podman_compose() {
    if ! command -v podman-compose &> /dev/null; then
        print_warning "podman-compose not found. Installing..."
        
        # Try to install podman-compose
        if command -v pip3 &> /dev/null; then
            pip3 install podman-compose
            print_status "podman-compose installed via pip3"
        elif command -v pip &> /dev/null; then
            pip install podman-compose
            print_status "podman-compose installed via pip"
        else
            print_error "Cannot install podman-compose. Please install it manually:"
            echo "  pip install podman-compose"
            exit 1
        fi
    else
        print_status "podman-compose is available: $(podman-compose --version)"
    fi
}

# Function to set up podman machine (for macOS/Windows)
setup_podman_machine() {
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "msys" ]]; then
        print_info "Setting up Podman machine for macOS/Windows..."
        
        # Check if machine already exists
        if podman machine list | grep -q "podman-machine-default"; then
            print_info "Podman machine already exists"
        else
            print_info "Creating Podman machine..."
            podman machine init
            podman machine start
            print_status "Podman machine created and started"
        fi
    else
        print_info "Podman machine not needed on Linux"
    fi
}

# Function to create podman network
create_network() {
    local network_name="tracechain-network"
    
    if podman network exists $network_name; then
        print_info "Network $network_name already exists"
    else
        print_info "Creating network $network_name..."
        podman network create $network_name
        print_status "Network $network_name created"
    fi
}

# Function to pull base images
pull_images() {
    print_info "Pulling base images..."
    
    local images=(
        "postgres:14"
        "redis:7-alpine"
        "node:18-alpine"
        "eclipse-mosquitto:2.0"
        "prom/prometheus:latest"
        "grafana/grafana:latest"
    )
    
    for image in "${images[@]}"; do
        print_info "Pulling $image..."
        podman pull $image
    done
    
    print_status "All base images pulled"
}

# Function to build application images
build_images() {
    print_info "Building application images..."
    
    # Build backend
    print_info "Building backend image..."
    podman build -t tracechain-backend:latest ./backend
    
    # Build frontend
    print_info "Building frontend image..."
    podman build -t tracechain-frontend:latest ./frontend
    
    # Build smart contracts
    print_info "Building smart contracts image..."
    podman build -t tracechain-hardhat:latest ./smart-contracts
    
    print_status "All application images built"
}

# Function to start services
start_services() {
    local compose_file=${1:-"docker-compose.yml"}
    
    print_info "Starting services with $compose_file..."
    
    # Use the appropriate script if available
    if [ -f "./scripts/docker-smart-start.sh" ]; then
        print_info "Using smart start script..."
        ./scripts/docker-smart-start.sh start
    elif [ -f "./scripts/docker-conditional-start.sh" ]; then
        print_info "Using conditional start script..."
        ./scripts/docker-conditional-start.sh start
    else
        print_info "Using direct podman-compose..."
        podman-compose -f $compose_file up -d
    fi
    
    print_status "Services started"
}

# Function to stop services
stop_services() {
    print_info "Stopping all services..."
    
    # Try different compose files
    for compose_file in "docker-compose.yml" "docker-compose.smart.yml" "docker-compose.external.yml"; do
        if [ -f "$compose_file" ]; then
            print_info "Stopping services from $compose_file..."
            podman-compose -f $compose_file down || true
        fi
    done
    
    print_status "Services stopped"
}

# Function to show service status
show_status() {
    print_info "Service Status:"
    echo ""
    
    # Check for running containers
    local containers=(
        "tracechain-postgres:PostgreSQL"
        "tracechain-redis:Redis"
        "tracechain-backend:Backend"
        "tracechain-frontend:Frontend"
        "tracechain-hardhat:Hardhat"
        "tracechain-mqtt:MQTT"
        "tracechain-prometheus:Prometheus"
        "tracechain-grafana:Grafana"
    )
    
    for container_info in "${containers[@]}"; do
        local container_name=$(echo $container_info | cut -d':' -f1)
        local service_name=$(echo $container_info | cut -d':' -f2)
        
        if podman ps --format "table {{.Names}}" | grep -q "$container_name"; then
            print_status "$service_name: Running ($container_name)"
        else
            print_error "$service_name: Not running"
        fi
    done
}

# Function to show logs
show_logs() {
    local service=${1:-""}
    
    if [ -n "$service" ]; then
        print_info "Showing logs for $service..."
        podman logs -f "tracechain-$service" 2>/dev/null || print_error "Service $service not found"
    else
        print_info "Showing logs for all services..."
        podman logs -f $(podman ps --format "{{.Names}}" | grep tracechain) 2>/dev/null || print_error "No TraceChain services running"
    fi
}

# Function to clean up
cleanup() {
    print_info "Cleaning up..."
    
    # Stop and remove containers
    stop_services
    
    # Remove images
    print_info "Removing application images..."
    podman rmi tracechain-backend:latest tracechain-frontend:latest tracechain-hardhat:latest 2>/dev/null || true
    
    # Remove network
    print_info "Removing network..."
    podman network rm tracechain-network 2>/dev/null || true
    
    print_status "Cleanup completed"
}

# Function to show help
show_help() {
    echo "Podman Setup and Management for TraceChain"
    echo "=========================================="
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup            Set up Podman environment (check installation, create network, pull images)"
    echo "  build            Build application images"
    echo "  start [file]     Start services (default: docker-compose.yml)"
    echo "  stop             Stop all services"
    echo "  restart          Restart all services"
    echo "  status           Show service status"
    echo "  logs [service]   Show logs (optionally for specific service)"
    echo "  cleanup          Clean up containers, images, and networks"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup                     # Initial setup"
    echo "  $0 build                     # Build all images"
    echo "  $0 start                     # Start with default compose file"
    echo "  $0 start docker-compose.smart.yml  # Start with specific compose file"
    echo "  $0 status                    # Check service status"
    echo "  $0 logs backend              # Show backend logs"
    echo "  $0 cleanup                   # Clean everything up"
}

# Main command handling
case "${1:-help}" in
    "setup")
        check_podman
        check_podman_compose
        setup_podman_machine
        create_network
        pull_images
        ;;
    "build")
        build_images
        ;;
    "start")
        start_services "$2"
        echo ""
        show_status
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        sleep 2
        start_services "$2"
        echo ""
        show_status
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "cleanup")
        cleanup
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
