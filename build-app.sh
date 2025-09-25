#!/bin/bash

# TraceChain Build Script
# This script compiles and builds all components of the TraceChain application

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
BUILD_DIR="$PROJECT_ROOT/build"
DIST_DIR="$PROJECT_ROOT/dist"
LOG_DIR="$PROJECT_ROOT/logs"

# Build configuration
BUILD_ENV=${BUILD_ENV:-"development"}
BUILD_TARGET=${BUILD_TARGET:-"all"} # all, smart-contracts, backend, frontend, docker

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
    echo -e "${BLUE}TraceChain Build Script${NC}"
    echo -e "${BLUE}======================${NC}"
    echo ""
    echo "Usage: $0 [options] [target]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV        Build environment (development|staging|production)"
    echo "  -c, --clean          Clean build directories before building"
    echo "  -p, --parallel       Build components in parallel"
    echo "  -v, --verbose        Verbose output"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Targets:"
    echo "  all                  Build all components (default)"
    echo "  smart-contracts      Build smart contracts only"
    echo "  backend              Build backend only"
    echo "  frontend             Build frontend only"
    echo "  docker               Build Docker images only"
    echo "  test                 Build and run tests"
    echo "  deploy               Build for deployment"
    echo ""
    echo "Examples:"
    echo "  $0                           # Build all in development"
    echo "  $0 -e production all         # Build all for production"
    echo "  $0 -c smart-contracts        # Clean build smart contracts"
    echo "  $0 -p frontend               # Build frontend in parallel"
    echo "  $0 -v backend                # Build backend with verbose output"
}

# Function to create directories
create_directories() {
    print_info "Creating build directories..."
    mkdir -p "$BUILD_DIR"
    mkdir -p "$DIST_DIR"
    mkdir -p "$LOG_DIR"
    print_status "Build directories created"
}

# Function to clean build directories
clean_build() {
    print_info "Cleaning build directories..."
    
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"/*
        print_status "Cleaned build directory"
    fi
    
    if [ -d "$DIST_DIR" ]; then
        rm -rf "$DIST_DIR"/*
        print_status "Cleaned dist directory"
    fi
    
    # Clean component-specific build directories
    if [ -d "$PROJECT_ROOT/backend/dist" ]; then
        rm -rf "$PROJECT_ROOT/backend/dist"
    fi
    
    if [ -d "$PROJECT_ROOT/frontend/build" ]; then
        rm -rf "$PROJECT_ROOT/frontend/build"
    fi
    
    if [ -d "$PROJECT_ROOT/smart-contracts/artifacts" ]; then
        rm -rf "$PROJECT_ROOT/smart-contracts/artifacts"
    fi
    
    if [ -d "$PROJECT_ROOT/smart-contracts/cache" ]; then
        rm -rf "$PROJECT_ROOT/smart-contracts/cache"
    fi
    
    print_status "Build cleanup complete"
}

# Function to build smart contracts
build_smart_contracts() {
    print_header "Building Smart Contracts"
    
    if [ ! -f "$PROJECT_ROOT/smart-contracts/package.json" ]; then
        print_error "Smart contracts package.json not found"
        return 1
    fi
    
    print_info "Installing smart contracts dependencies..."
    cd "$PROJECT_ROOT/smart-contracts"
    npm install --silent
    
    print_info "Compiling smart contracts..."
    npm run compile 2>&1 | tee "$LOG_DIR/smart-contracts-build.log"
    
    if [ $? -eq 0 ]; then
        print_status "Smart contracts compiled successfully"
        
        # Copy artifacts to build directory
        mkdir -p "$BUILD_DIR/smart-contracts"
        cp -r artifacts "$BUILD_DIR/smart-contracts/"
        cp -r cache "$BUILD_DIR/smart-contracts/" 2>/dev/null || true
        
        print_status "Smart contract artifacts copied to build directory"
    else
        print_error "Smart contracts compilation failed"
        return 1
    fi
}

# Function to build backend
build_backend() {
    print_header "Building Backend API"
    
    if [ ! -f "$PROJECT_ROOT/backend/package.json" ]; then
        print_error "Backend package.json not found"
        return 1
    fi
    
    print_info "Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend"
    npm install --silent
    
    print_info "Building backend TypeScript..."
    npm run build 2>&1 | tee "$LOG_DIR/backend-build.log"
    
    if [ $? -eq 0 ]; then
        print_status "Backend built successfully"
        
        # Copy built files to build directory
        mkdir -p "$BUILD_DIR/backend"
        cp -r dist/* "$BUILD_DIR/backend/" 2>/dev/null || true
        cp package.json "$BUILD_DIR/backend/"
        cp package-lock.json "$BUILD_DIR/backend/" 2>/dev/null || true
        
        print_status "Backend artifacts copied to build directory"
    else
        print_error "Backend build failed"
        return 1
    fi
}

# Function to build frontend
build_frontend() {
    print_header "Building Frontend Application"
    
    if [ ! -f "$PROJECT_ROOT/frontend/package.json" ]; then
        print_error "Frontend package.json not found"
        return 1
    fi
    
    print_info "Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend"
    npm install --silent
    
    print_info "Building frontend React application..."
    
    # Set build environment
    export NODE_ENV="$BUILD_ENV"
    export REACT_APP_ENV="$BUILD_ENV"
    export REACT_APP_API_URL="http://localhost:3000"
    
    npm run build 2>&1 | tee "$LOG_DIR/frontend-build.log"
    
    if [ $? -eq 0 ]; then
        print_status "Frontend built successfully"
        
        # Copy built files to build directory
        mkdir -p "$BUILD_DIR/frontend"
        cp -r build/* "$BUILD_DIR/frontend/"
        
        print_status "Frontend artifacts copied to build directory"
    else
        print_error "Frontend build failed"
        return 1
    fi
}

# Function to build Docker images
build_docker() {
    print_header "Building Docker Images"
    
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        print_error "Docker Compose file not found"
        return 1
    fi
    
    print_info "Building Docker images..."
    
    # Build images based on environment
    case "$BUILD_ENV" in
        "production")
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
            ;;
        "staging")
            docker-compose -f docker-compose.yml -f docker-compose.staging.yml build --no-cache
            ;;
        *)
            docker-compose build --no-cache
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        print_status "Docker images built successfully"
    else
        print_error "Docker image build failed"
        return 1
    fi
}

# Function to run tests
run_tests() {
    print_header "Running Tests"
    
    local test_results=0
    
    # Test smart contracts
    if [ -f "$PROJECT_ROOT/smart-contracts/package.json" ]; then
        print_info "Testing smart contracts..."
        cd "$PROJECT_ROOT/smart-contracts"
        npm test 2>&1 | tee "$LOG_DIR/smart-contracts-test.log"
        if [ $? -ne 0 ]; then
            test_results=$((test_results + 1))
        fi
    fi
    
    # Test backend
    if [ -f "$PROJECT_ROOT/backend/package.json" ]; then
        print_info "Testing backend..."
        cd "$PROJECT_ROOT/backend"
        npm test 2>&1 | tee "$LOG_DIR/backend-test.log"
        if [ $? -ne 0 ]; then
            test_results=$((test_results + 1))
        fi
    fi
    
    # Test frontend
    if [ -f "$PROJECT_ROOT/frontend/package.json" ]; then
        print_info "Testing frontend..."
        cd "$PROJECT_ROOT/frontend"
        npm test -- --coverage --watchAll=false 2>&1 | tee "$LOG_DIR/frontend-test.log"
        if [ $? -ne 0 ]; then
            test_results=$((test_results + 1))
        fi
    fi
    
    if [ $test_results -eq 0 ]; then
        print_status "All tests passed successfully"
    else
        print_error "$test_results test suite(s) failed"
        return 1
    fi
}

# Function to create deployment package
create_deployment_package() {
    print_header "Creating Deployment Package"
    
    local package_name="tracechain-${BUILD_ENV}-$(date +%Y%m%d-%H%M%S)"
    local package_dir="$DIST_DIR/$package_name"
    
    print_info "Creating deployment package: $package_name"
    
    mkdir -p "$package_dir"
    
    # Copy built components
    if [ -d "$BUILD_DIR/smart-contracts" ]; then
        cp -r "$BUILD_DIR/smart-contracts" "$package_dir/"
    fi
    
    if [ -d "$BUILD_DIR/backend" ]; then
        cp -r "$BUILD_DIR/backend" "$package_dir/"
    fi
    
    if [ -d "$BUILD_DIR/frontend" ]; then
        cp -r "$BUILD_DIR/frontend" "$package_dir/"
    fi
    
    # Copy configuration files
    cp docker-compose.yml "$package_dir/"
    cp docker-compose.prod.yml "$package_dir/" 2>/dev/null || true
    cp docker-compose.staging.yml "$package_dir/" 2>/dev/null || true
    
    # Copy deployment scripts
    cp deploy.sh "$package_dir/" 2>/dev/null || true
    cp start.sh "$package_dir/" 2>/dev/null || true
    
    # Create deployment info
    cat > "$package_dir/deployment-info.json" << EOF
{
    "packageName": "$package_name",
    "buildEnvironment": "$BUILD_ENV",
    "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "buildTarget": "$BUILD_TARGET",
    "version": "1.0.0",
    "components": {
        "smart-contracts": $(test -d "$BUILD_DIR/smart-contracts" && echo "true" || echo "false"),
        "backend": $(test -d "$BUILD_DIR/backend" && echo "true" || echo "false"),
        "frontend": $(test -d "$BUILD_DIR/frontend" && echo "true" || echo "false"),
        "docker": true
    }
}
EOF
    
    # Create archive
    cd "$DIST_DIR"
    tar -czf "${package_name}.tar.gz" "$package_name"
    
    print_status "Deployment package created: $DIST_DIR/${package_name}.tar.gz"
    print_info "Package contents:"
    ls -la "$package_dir"
}

# Function to build all components
build_all() {
    print_header "Building All Components"
    
    local build_start_time=$(date +%s)
    local build_results=0
    
    # Create directories
    create_directories
    
    # Build components based on target
    case "$BUILD_TARGET" in
        "smart-contracts")
            build_smart_contracts
            if [ $? -ne 0 ]; then build_results=$((build_results + 1)); fi
            ;;
        "backend")
            build_backend
            if [ $? -ne 0 ]; then build_results=$((build_results + 1)); fi
            ;;
        "frontend")
            build_frontend
            if [ $? -ne 0 ]; then build_results=$((build_results + 1)); fi
            ;;
        "docker")
            build_docker
            if [ $? -ne 0 ]; then build_results=$((build_results + 1)); fi
            ;;
        "test")
            run_tests
            if [ $? -ne 0 ]; then build_results=$((build_results + 1)); fi
            ;;
        "deploy")
            build_smart_contracts && build_backend && build_frontend && build_docker
            if [ $? -eq 0 ]; then
                create_deployment_package
            else
                build_results=$((build_results + 1))
            fi
            ;;
        "all"|*)
            build_smart_contracts
            if [ $? -ne 0 ]; then build_results=$((build_results + 1)); fi
            
            build_backend
            if [ $? -ne 0 ]; then build_results=$((build_results + 1)); fi
            
            build_frontend
            if [ $? -ne 0 ]; then build_results=$((build_results + 1)); fi
            
            build_docker
            if [ $? -ne 0 ]; then build_results=$((build_results + 1)); fi
            ;;
    esac
    
    local build_end_time=$(date +%s)
    local build_duration=$((build_end_time - build_start_time))
    
    if [ $build_results -eq 0 ]; then
        print_status "Build completed successfully in ${build_duration}s"
        print_info "Build artifacts available in: $BUILD_DIR"
        print_info "Build logs available in: $LOG_DIR"
    else
        print_error "Build failed with $build_results error(s)"
        print_info "Check logs in: $LOG_DIR"
        return 1
    fi
}

# Parse command line arguments
CLEAN_BUILD=false
PARALLEL_BUILD=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            BUILD_ENV="$2"
            shift 2
            ;;
        -c|--clean)
            CLEAN_BUILD=true
            shift
            ;;
        -p|--parallel)
            PARALLEL_BUILD=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
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
            BUILD_TARGET="$1"
            shift
            ;;
    esac
done

# Validate build environment
case "$BUILD_ENV" in
    "development"|"staging"|"production")
        ;;
    *)
        print_error "Invalid build environment: $BUILD_ENV"
        print_info "Valid environments: development, staging, production"
        exit 1
        ;;
esac

# Validate build target
case "$BUILD_TARGET" in
    "all"|"smart-contracts"|"backend"|"frontend"|"docker"|"test"|"deploy")
        ;;
    *)
        print_error "Invalid build target: $BUILD_TARGET"
        print_info "Valid targets: all, smart-contracts, backend, frontend, docker, test, deploy"
        exit 1
        ;;
esac

# Main execution
print_header "TraceChain Build Process"
print_info "Build Environment: $BUILD_ENV"
print_info "Build Target: $BUILD_TARGET"
print_info "Clean Build: $CLEAN_BUILD"
print_info "Parallel Build: $PARALLEL_BUILD"
echo ""

# Clean build if requested
if [ "$CLEAN_BUILD" = true ]; then
    clean_build
fi

# Run build
build_all

# Final status
if [ $? -eq 0 ]; then
    print_status "🎉 TraceChain build completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "  • Run the application: ./run-app.sh"
    echo "  • Deploy to production: ./deploy-app.sh"
    echo "  • View build logs: $LOG_DIR"
    echo "  • Check build artifacts: $BUILD_DIR"
else
    print_error "Build failed. Check logs for details."
    exit 1
fi
