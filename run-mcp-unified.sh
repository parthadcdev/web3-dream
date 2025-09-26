#!/bin/bash

# Unified TraceChain MCP Server Management
# This script manages the unified MCP server for TraceChain

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_ROOT="$(dirname "$(readlink -f "$0")")"
MCP_SERVER="$PROJECT_ROOT/mcp-server-unified.js"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="$PROJECT_ROOT/pids/mcp-unified.pid"

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

# Function to create directories
create_directories() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$PROJECT_ROOT/pids"
}

# Function to start the unified MCP server
start_mcp_server() {
    print_header "Starting Unified MCP Server"
    create_directories

    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        print_warning "Unified MCP server is already running (PID: $(cat "$PID_FILE"))"
        return 0
    fi

    print_info "Starting unified MCP server..."
    print_info "Server: $MCP_SERVER"
    print_info "Log file: $LOG_DIR/mcp-unified.log"

    nohup node "$MCP_SERVER" > "$LOG_DIR/mcp-unified.log" 2>&1 &
    local mcp_pid=$!
    echo $mcp_pid > "$PID_FILE"

    sleep 2 # Give it a moment to start

    if kill -0 $mcp_pid 2>/dev/null; then
        print_status "Unified MCP server started (PID: $mcp_pid)"
        print_info "Available tools:"
        print_info "  - Project Management (health, structure analysis)"
        print_info "  - Smart Contracts (analyze, compile, deploy)"
        print_info "  - API Validation (endpoint testing, security)"
        print_info "  - Build & Deployment (build, deploy, rollback)"
        print_info "  - Linear Integration (create, search, update issues)"
        print_info "  - Security & Testing (scans, test generation)"
        print_info "  - Monitoring & Optimization (performance, Docker)"
    else
        print_error "Failed to start unified MCP server"
        print_info "Check logs: $LOG_DIR/mcp-unified.log"
        return 1
    fi
}

# Function to stop the unified MCP server
stop_mcp_server() {
    print_header "Stopping Unified MCP Server"

    if [ -f "$PID_FILE" ]; then
        local mcp_pid=$(cat "$PID_FILE")
        if kill -0 $mcp_pid 2>/dev/null; then
            print_info "Stopping unified MCP server (PID: $mcp_pid)..."
            kill $mcp_pid
            sleep 1
            if ! kill -0 $mcp_pid 2>/dev/null; then
                print_status "Unified MCP server stopped"
                rm -f "$PID_FILE"
            else
                print_error "Failed to stop unified MCP server"
                return 1
            fi
        else
            print_warning "Unified MCP server not running (PID file found but process not active)"
            rm -f "$PID_FILE"
        fi
    else
        print_warning "Unified MCP server not running (PID file not found)"
    fi
}

# Function to check unified MCP server status
status_mcp_server() {
    print_header "Unified MCP Server Status"

    if [ -f "$PID_FILE" ]; then
        local mcp_pid=$(cat "$PID_FILE")
        if kill -0 $mcp_pid 2>/dev/null; then
            print_status "Unified MCP server is running (PID: $mcp_pid)"
            print_info "Server: $MCP_SERVER"
            print_info "Log file: $LOG_DIR/mcp-unified.log"
        else
            print_error "Unified MCP server is not running (PID file found but process not active)"
            rm -f "$PID_FILE"
        fi
    else
        print_error "Unified MCP server is not running"
    fi
}

# Function to test the unified MCP server
test_mcp_server() {
    print_header "Testing Unified MCP Server"
    create_directories

    if ! [ -f "$PID_FILE" ] || ! kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        print_error "Unified MCP server is not running. Start it first with: $0 start"
        return 1
    fi

    print_info "Running test-mcp-unified.js..."
    node "$PROJECT_ROOT/test-mcp-unified.js"
}

# Function to show logs
show_logs() {
    print_header "Unified MCP Server Logs"
    
    if [ -f "$LOG_DIR/mcp-unified.log" ]; then
        tail -f "$LOG_DIR/mcp-unified.log"
    else
        print_warning "Log file not found: $LOG_DIR/mcp-unified.log"
    fi
}

# Function to show help
show_help() {
    print_header "Unified TraceChain MCP Server Management"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start          Start unified MCP server"
    echo "  stop           Stop unified MCP server"
    echo "  restart        Restart unified MCP server"
    echo "  status         Show unified MCP server status"
    echo "  test           Test unified MCP functionality"
    echo "  logs           Show unified MCP server logs"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start unified MCP server"
    echo "  $0 status                  # Check server status"
    echo "  $0 test                    # Test server functionality"
    echo "  $0 logs                    # View server logs"
    echo ""
    echo "Features:"
    echo "  - Project Management & Testing"
    echo "  - Smart Contract Analysis & Deployment"
    echo "  - API Validation & Testing"
    echo "  - Build & Deployment Automation"
    echo "  - Linear Issue Management"
    echo "  - Security Scanning & Testing"
    echo "  - Performance Monitoring & Optimization"
}

# Main logic
case "${1:-help}" in
    start)
        start_mcp_server
        ;;
    stop)
        stop_mcp_server
        ;;
    restart)
        stop_mcp_server
        start_mcp_server
        ;;
    status)
        status_mcp_server
        ;;
    test)
        test_mcp_server
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
