#!/bin/bash

# TraceChain Deployment Script
# This script deploys the TraceChain application to various environments

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
DIST_DIR="$PROJECT_ROOT/dist"
BUILD_DIR="$PROJECT_ROOT/build"
LOG_DIR="$PROJECT_ROOT/logs"

# Deployment configuration
DEPLOY_ENV=${DEPLOY_ENV:-"staging"}
DEPLOY_TARGET=${DEPLOY_TARGET:-"all"} # all, smart-contracts, backend, frontend, infrastructure
DEPLOY_REGION=${DEPLOY_REGION:-"us-east-1"}
DEPLOY_PROVIDER=${DEPLOY_PROVIDER:-"podman"} # podman, kubernetes, aws, gcp, azure

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
    echo -e "${BLUE}TraceChain Deployment Script${NC}"
    echo -e "${BLUE}============================${NC}"
    echo ""
    echo "Usage: $0 [options] [target]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV        Deployment environment (staging|production)"
    echo "  -r, --region REGION  Deployment region (default: us-east-1)"
    echo "  -p, --provider PROV  Deployment provider (podman|kubernetes|aws|gcp|azure)"
    echo "  -c, --config FILE    Custom deployment configuration file"
    echo "  -d, --dry-run        Show what would be deployed without actually deploying"
    echo "  -v, --verbose        Verbose output"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Targets:"
    echo "  all                  Deploy all components (default)"
    echo "  smart-contracts      Deploy smart contracts only"
    echo "  backend              Deploy backend API only"
    echo "  frontend             Deploy frontend only"
    echo "  infrastructure       Deploy infrastructure only"
    echo "  rollback             Rollback to previous version"
    echo ""
    echo "Examples:"
    echo "  $0                           # Deploy all to staging"
    echo "  $0 -e production all         # Deploy all to production"
    echo "  $0 -p kubernetes backend     # Deploy backend to Kubernetes"
    echo "  $0 -d all                    # Dry run deployment"
    echo "  $0 rollback                  # Rollback deployment"
}

# Function to create deployment directories
create_deployment_dirs() {
    print_info "Creating deployment directories..."
    mkdir -p "$DIST_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$PROJECT_ROOT/deployments"
    print_status "Deployment directories created"
}

# Function to validate deployment environment
validate_environment() {
    print_info "Validating deployment environment..."
    
    case "$DEPLOY_ENV" in
        "staging"|"production")
            print_status "Environment validated: $DEPLOY_ENV"
            ;;
        *)
            print_error "Invalid deployment environment: $DEPLOY_ENV"
            print_info "Valid environments: staging, production"
            exit 1
            ;;
    esac
    
    case "$DEPLOY_PROVIDER" in
        "podman"|"kubernetes"|"aws"|"gcp"|"azure")
            print_status "Provider validated: $DEPLOY_PROVIDER"
            ;;
        *)
            print_error "Invalid deployment provider: $DEPLOY_PROVIDER"
            print_info "Valid providers: podman, kubernetes, aws, gcp, azure"
            exit 1
            ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking deployment prerequisites..."
    
    local missing_deps=()
    
    # Check required tools based on provider
    case "$DEPLOY_PROVIDER" in
        "podman")
            if ! command -v podman &> /dev/null; then
                missing_deps+=("podman")
            fi
            if ! command -v podman-compose &> /dev/null; then
                missing_deps+=("podman-compose")
            fi
            ;;
        "kubernetes")
            if ! command -v kubectl &> /dev/null; then
                missing_deps+=("kubectl")
            fi
            if ! command -v helm &> /dev/null; then
                missing_deps+=("helm")
            fi
            ;;
        "aws")
            if ! command -v aws &> /dev/null; then
                missing_deps+=("aws-cli")
            fi
            if ! command -v terraform &> /dev/null; then
                missing_deps+=("terraform")
            fi
            ;;
        "gcp")
            if ! command -v gcloud &> /dev/null; then
                missing_deps+=("gcloud")
            fi
            ;;
        "azure")
            if ! command -v az &> /dev/null; then
                missing_deps+=("azure-cli")
            fi
            ;;
    esac
    
    # Check common dependencies
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        print_info "Please install the missing dependencies and try again"
        exit 1
    fi
    
    print_status "All prerequisites satisfied"
}

# Function to build deployment package
build_deployment_package() {
    print_header "Building Deployment Package"
    
    if [ ! -f "$PROJECT_ROOT/build-app.sh" ]; then
        print_error "Build script not found"
        return 1
    fi
    
    print_info "Building application for $DEPLOY_ENV environment..."
    
    # Build the application
    "$PROJECT_ROOT/build-app.sh" -e "$DEPLOY_ENV" -c deploy
    
    if [ $? -eq 0 ]; then
        print_status "Deployment package built successfully"
    else
        print_error "Failed to build deployment package"
        return 1
    fi
}

# Function to deploy smart contracts
deploy_smart_contracts() {
    print_header "Deploying Smart Contracts"
    
    if [ ! -d "$PROJECT_ROOT/smart-contracts" ]; then
        print_error "Smart contracts directory not found"
        return 1
    fi
    
    print_info "Deploying smart contracts to $DEPLOY_ENV environment..."
    
    cd "$PROJECT_ROOT/smart-contracts"
    
    # Set deployment environment variables
    case "$DEPLOY_ENV" in
        "staging")
            export NETWORK="polygon_mumbai"
            export CONTRACT_ADDRESS_FILE="$PROJECT_ROOT/deployments/staging-contracts.json"
            ;;
        "production")
            export NETWORK="polygon_mainnet"
            export CONTRACT_ADDRESS_FILE="$PROJECT_ROOT/deployments/production-contracts.json"
            ;;
    esac
    
    # Deploy contracts
    npm run deploy -- --network $NETWORK 2>&1 | tee "$LOG_DIR/smart-contracts-deploy.log"
    
    if [ $? -eq 0 ]; then
        print_status "Smart contracts deployed successfully"
        
        # Save contract addresses
        mkdir -p "$PROJECT_ROOT/deployments"
        cat > "$CONTRACT_ADDRESS_FILE" << EOF
{
    "network": "$NETWORK",
    "deploymentDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$DEPLOY_ENV",
    "contracts": {
        "ProductRegistry": "$(grep 'ProductRegistry deployed to:' "$LOG_DIR/smart-contracts-deploy.log" | cut -d' ' -f4 || echo 'N/A')",
        "NFTCertificate": "$(grep 'NFTCertificate deployed to:' "$LOG_DIR/smart-contracts-deploy.log" | cut -d' ' -f4 || echo 'N/A')"
    }
}
EOF
        print_status "Contract addresses saved to $CONTRACT_ADDRESS_FILE"
    else
        print_error "Smart contracts deployment failed"
        return 1
    fi
}

# Function to deploy backend
deploy_backend() {
    print_header "Deploying Backend API"
    
    case "$DEPLOY_PROVIDER" in
        "podman")
            deploy_backend_podman
            ;;
        "kubernetes")
            deploy_backend_kubernetes
            ;;
        "aws")
            deploy_backend_aws
            ;;
        *)
            print_error "Backend deployment not supported for provider: $DEPLOY_PROVIDER"
            return 1
            ;;
    esac
}

deploy_backend_podman() {
    print_info "Deploying backend using Podman..."
    
    # Build backend Podman image
    podman build -t "tracechain-backend:$DEPLOY_ENV" -f "$PROJECT_ROOT/backend/Dockerfile" "$PROJECT_ROOT/backend"
    
    if [ $? -eq 0 ]; then
        print_status "Backend Podman image built successfully"
        
        # Deploy using podman-compose
        case "$DEPLOY_ENV" in
            "staging")
                podman-compose -f docker-compose.yml -f docker-compose.staging.yml up -d backend
                ;;
            "production")
                podman-compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend
                ;;
        esac
        
        print_status "Backend deployed successfully"
    else
        print_error "Backend Podman deployment failed"
        return 1
    fi
}

deploy_backend_kubernetes() {
    print_info "Deploying backend using Kubernetes..."
    
    # Apply Kubernetes manifests
    kubectl apply -f "$PROJECT_ROOT/k8s/backend-deployment.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/backend-service.yaml"
    
    # Wait for deployment to be ready
    kubectl rollout status deployment/tracechain-backend
    
    print_status "Backend deployed to Kubernetes successfully"
}

deploy_backend_aws() {
    print_info "Deploying backend using AWS..."
    
    # Deploy using AWS ECS or Lambda
    print_warning "AWS deployment not fully implemented yet"
    print_info "Please use Docker or Kubernetes deployment for now"
}

# Function to deploy frontend
deploy_frontend() {
    print_header "Deploying Frontend"
    
    case "$DEPLOY_PROVIDER" in
        "podman")
            deploy_frontend_podman
            ;;
        "kubernetes")
            deploy_frontend_kubernetes
            ;;
        "aws")
            deploy_frontend_aws
            ;;
        *)
            print_error "Frontend deployment not supported for provider: $DEPLOY_PROVIDER"
            return 1
            ;;
    esac
}

deploy_frontend_podman() {
    print_info "Deploying frontend using Podman..."
    
    # Build frontend Podman image
    podman build -t "tracechain-frontend:$DEPLOY_ENV" -f "$PROJECT_ROOT/frontend/Dockerfile" "$PROJECT_ROOT/frontend"
    
    if [ $? -eq 0 ]; then
        print_status "Frontend Podman image built successfully"
        
        # Deploy using podman-compose
        case "$DEPLOY_ENV" in
            "staging")
                podman-compose -f docker-compose.yml -f docker-compose.staging.yml up -d frontend
                ;;
            "production")
                podman-compose -f docker-compose.yml -f docker-compose.prod.yml up -d frontend
                ;;
        esac
        
        print_status "Frontend deployed successfully"
    else
        print_error "Frontend Podman deployment failed"
        return 1
    fi
}

deploy_frontend_kubernetes() {
    print_info "Deploying frontend using Kubernetes..."
    
    # Apply Kubernetes manifests
    kubectl apply -f "$PROJECT_ROOT/k8s/frontend-deployment.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/frontend-service.yaml"
    
    # Wait for deployment to be ready
    kubectl rollout status deployment/tracechain-frontend
    
    print_status "Frontend deployed to Kubernetes successfully"
}

deploy_frontend_aws() {
    print_info "Deploying frontend using AWS..."
    
    # Deploy to S3 + CloudFront
    print_warning "AWS deployment not fully implemented yet"
    print_info "Please use Docker or Kubernetes deployment for now"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_header "Deploying Infrastructure"
    
    case "$DEPLOY_PROVIDER" in
        "podman")
            deploy_infrastructure_podman
            ;;
        "kubernetes")
            deploy_infrastructure_kubernetes
            ;;
        "aws")
            deploy_infrastructure_aws
            ;;
        *)
            print_error "Infrastructure deployment not supported for provider: $DEPLOY_PROVIDER"
            return 1
            ;;
    esac
}

deploy_infrastructure_podman() {
    print_info "Deploying infrastructure using Podman..."
    
    # Deploy database, cache, and monitoring services
    case "$DEPLOY_ENV" in
        "staging")
            podman-compose -f docker-compose.yml -f docker-compose.staging.yml up -d postgres redis prometheus grafana
            ;;
        "production")
            podman-compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres redis prometheus grafana
            ;;
    esac
    
    print_status "Infrastructure deployed successfully"
}

deploy_infrastructure_kubernetes() {
    print_info "Deploying infrastructure using Kubernetes..."
    
    # Apply infrastructure manifests
    kubectl apply -f "$PROJECT_ROOT/k8s/postgres-deployment.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/redis-deployment.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/monitoring-deployment.yaml"
    
    print_status "Infrastructure deployed to Kubernetes successfully"
}

deploy_infrastructure_aws() {
    print_info "Deploying infrastructure using AWS..."
    
    # Deploy using Terraform
    print_warning "AWS infrastructure deployment not fully implemented yet"
    print_info "Please use Docker or Kubernetes deployment for now"
}

# Function to perform health checks
perform_health_checks() {
    print_header "Performing Health Checks"
    
    local health_checks_passed=0
    local total_health_checks=0
    
    # Check backend health
    total_health_checks=$((total_health_checks + 1))
    if curl -s "http://localhost:3000/health" > /dev/null 2>&1; then
        print_status "Backend health check passed"
        health_checks_passed=$((health_checks_passed + 1))
    else
        print_error "Backend health check failed"
    fi
    
    # Check frontend health
    total_health_checks=$((total_health_checks + 1))
    if curl -s "http://localhost:3001" > /dev/null 2>&1; then
        print_status "Frontend health check passed"
        health_checks_passed=$((health_checks_passed + 1))
    else
        print_error "Frontend health check failed"
    fi
    
    # Check database connectivity
    total_health_checks=$((total_health_checks + 1))
    if podman-compose exec -T postgres pg_isready -U tracechain_user > /dev/null 2>&1; then
        print_status "Database health check passed"
        health_checks_passed=$((health_checks_passed + 1))
    else
        print_error "Database health check failed"
    fi
    
    # Check Redis connectivity
    total_health_checks=$((total_health_checks + 1))
    if podman-compose exec -T redis redis-cli ping | grep -q "PONG"; then
        print_status "Redis health check passed"
        health_checks_passed=$((health_checks_passed + 1))
    else
        print_error "Redis health check failed"
    fi
    
    print_info "Health checks: $health_checks_passed/$total_health_checks passed"
    
    if [ $health_checks_passed -eq $total_health_checks ]; then
        print_status "All health checks passed"
        return 0
    else
        print_error "Some health checks failed"
        return 1
    fi
}

# Function to rollback deployment
rollback_deployment() {
    print_header "Rolling Back Deployment"
    
    print_info "Rolling back to previous version..."
    
    case "$DEPLOY_PROVIDER" in
        "podman")
            # Rollback Podman services
            podman-compose down
            podman-compose up -d --scale backend=0 --scale frontend=0
            sleep 5
            podman-compose up -d
            ;;
        "kubernetes")
            # Rollback Kubernetes deployments
            kubectl rollout undo deployment/tracechain-backend
            kubectl rollout undo deployment/tracechain-frontend
            ;;
        *)
            print_error "Rollback not supported for provider: $DEPLOY_PROVIDER"
            return 1
            ;;
    esac
    
    print_status "Rollback completed"
}

# Function to deploy all components
deploy_all() {
    print_header "Deploying TraceChain Application"
    print_info "Environment: $DEPLOY_ENV"
    print_info "Provider: $DEPLOY_PROVIDER"
    print_info "Target: $DEPLOY_TARGET"
    echo ""
    
    local deploy_start_time=$(date +%s)
    local deployment_success=true
    
    # Validate environment and prerequisites
    validate_environment
    check_prerequisites
    
    # Create deployment directories
    create_deployment_dirs
    
    # Deploy based on target
    case "$DEPLOY_TARGET" in
        "smart-contracts")
            build_deployment_package
            deploy_smart_contracts
            if [ $? -ne 0 ]; then deployment_success=false; fi
            ;;
        "backend")
            build_deployment_package
            deploy_backend
            if [ $? -ne 0 ]; then deployment_success=false; fi
            ;;
        "frontend")
            build_deployment_package
            deploy_frontend
            if [ $? -ne 0 ]; then deployment_success=false; fi
            ;;
        "infrastructure")
            deploy_infrastructure
            if [ $? -ne 0 ]; then deployment_success=false; fi
            ;;
        "rollback")
            rollback_deployment
            if [ $? -ne 0 ]; then deployment_success=false; fi
            ;;
        "all"|*)
            build_deployment_package
            deploy_infrastructure
            if [ $? -ne 0 ]; then deployment_success=false; fi
            
            deploy_smart_contracts
            if [ $? -ne 0 ]; then deployment_success=false; fi
            
            deploy_backend
            if [ $? -ne 0 ]; then deployment_success=false; fi
            
            deploy_frontend
            if [ $? -ne 0 ]; then deployment_success=false; fi
            ;;
    esac
    
    local deploy_end_time=$(date +%s)
    local deploy_duration=$((deploy_end_time - deploy_start_time))
    
    if [ "$deployment_success" = true ]; then
        print_status "Deployment completed successfully in ${deploy_duration}s"
        
        # Perform health checks
        sleep 10
        perform_health_checks
        
        echo ""
        print_info "Deployment Summary:"
        echo "  • Environment: $DEPLOY_ENV"
        echo "  • Provider: $DEPLOY_PROVIDER"
        echo "  • Duration: ${deploy_duration}s"
        echo "  • Status: Success"
        echo ""
        print_info "Service URLs:"
        echo "  • Frontend: http://localhost:3001"
        echo "  • Backend API: http://localhost:3000"
        echo "  • Monitoring: http://localhost:3003"
        echo ""
        print_info "Management Commands:"
        echo "  • Check status: podman-compose ps"
        echo "  • View logs: podman-compose logs -f"
        echo "  • Rollback: $0 rollback"
    else
        print_error "Deployment failed after ${deploy_duration}s"
        print_info "Check logs in: $LOG_DIR"
        return 1
    fi
}

# Parse command line arguments
DRY_RUN=false
VERBOSE=false
CUSTOM_CONFIG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            DEPLOY_ENV="$2"
            shift 2
            ;;
        -r|--region)
            DEPLOY_REGION="$2"
            shift 2
            ;;
        -p|--provider)
            DEPLOY_PROVIDER="$2"
            shift 2
            ;;
        -c|--config)
            CUSTOM_CONFIG="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
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
            DEPLOY_TARGET="$1"
            shift
            ;;
    esac
done

# Handle dry run
if [ "$DRY_RUN" = true ]; then
    print_info "DRY RUN MODE - No actual deployment will occur"
    print_info "Environment: $DEPLOY_ENV"
    print_info "Provider: $DEPLOY_PROVIDER"
    print_info "Target: $DEPLOY_TARGET"
    print_info "Region: $DEPLOY_REGION"
    exit 0
fi

# Main execution
deploy_all
