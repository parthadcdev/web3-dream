# TraceChain Build & Run Guide

This guide covers building, running, and deploying the TraceChain application using the comprehensive automation scripts.

## 🚀 Quick Start

### **One-Command Setup & Run**
```bash
./quick-start.sh
```
This will install dependencies, set up MCP, and start all services.

### **Build & Run Workflow**
```bash
# Build the application
make build

# Run the application
make run

# Check status
make run-status
```

## 🔨 Build Scripts

### **`build-app.sh` - Comprehensive Build System**

**Basic Usage:**
```bash
./build-app.sh [options] [target]
```

**Options:**
- `-e, --env ENV` - Build environment (development|staging|production)
- `-c, --clean` - Clean build directories before building
- `-p, --parallel` - Build components in parallel
- `-v, --verbose` - Verbose output

**Targets:**
- `all` - Build all components (default)
- `smart-contracts` - Build smart contracts only
- `backend` - Build backend only
- `frontend` - Build frontend only
- `docker` - Build Docker images only
- `test` - Build and run tests
- `deploy` - Build for deployment

**Examples:**
```bash
# Build all components
./build-app.sh

# Clean build for production
./build-app.sh -e production -c all

# Build only smart contracts
./build-app.sh smart-contracts

# Build with verbose output
./build-app.sh -v backend
```

**What it builds:**
- **Smart Contracts**: Compiles Solidity contracts, generates artifacts
- **Backend**: Builds TypeScript, creates optimized JavaScript
- **Frontend**: Builds React app, optimizes assets
- **Docker**: Creates container images
- **Tests**: Runs comprehensive test suites

## 🏃 Run Scripts

### **`run-app.sh` - Application Runner**

**Basic Usage:**
```bash
./run-app.sh [options] [mode]
```

**Options:**
- `-e, --env ENV` - Runtime environment (development|staging|production)
- `-p, --port PORT` - Override default ports
- `-d, --detach` - Run in background
- `-l, --logs` - Show logs after starting
- `-s, --stop` - Stop running services
- `-r, --restart` - Restart services

**Modes:**
- `all` - Run all services (default)
- `services` - Run Docker services only
- `smart-contracts` - Run Hardhat node only
- `backend` - Run backend API only
- `frontend` - Run frontend only
- `mcp` - Run MCP servers only
- `dev` - Run in development mode
- `prod` - Run in production mode

**Examples:**
```bash
# Run all services
./run-app.sh

# Run in development mode
./run-app.sh dev

# Run backend only
./run-app.sh backend

# Run with custom port
./run-app.sh -p 8080 backend

# Stop all services
./run-app.sh stop

# Restart services
./run-app.sh restart
```

**Services Started:**
- **Frontend**: React app on port 3001
- **Backend**: Express API on port 3000
- **Hardhat**: Blockchain node on port 8545
- **Database**: PostgreSQL on port 5432
- **Cache**: Redis on port 6379
- **MQTT**: Mosquitto on port 1883
- **Monitoring**: Prometheus (9090) + Grafana (3003)

## 🚀 Deploy Scripts

### **`deploy-app.sh` - Deployment System**

**Basic Usage:**
```bash
./deploy-app.sh [options] [target]
```

**Options:**
- `-e, --env ENV` - Deployment environment (staging|production)
- `-r, --region REGION` - Deployment region
- `-p, --provider PROV` - Deployment provider (docker|kubernetes|aws|gcp|azure)
- `-d, --dry-run` - Show what would be deployed
- `-v, --verbose` - Verbose output

**Targets:**
- `all` - Deploy all components (default)
- `smart-contracts` - Deploy smart contracts only
- `backend` - Deploy backend only
- `frontend` - Deploy frontend only
- `infrastructure` - Deploy infrastructure only
- `rollback` - Rollback to previous version

**Examples:**
```bash
# Deploy to staging
./deploy-app.sh -e staging all

# Deploy to production
./deploy-app.sh -e production all

# Deploy using Kubernetes
./deploy-app.sh -p kubernetes all

# Dry run deployment
./deploy-app.sh -d all

# Rollback deployment
./deploy-app.sh rollback
```

## 📋 Makefile Commands

### **Build Commands**
```bash
make build          # Build all components
make build-clean    # Clean build all components
make build-prod     # Build for production
```

### **Run Commands**
```bash
make run            # Run the application
make run-dev        # Run in development mode
make run-prod       # Run in production mode
make run-stop       # Stop all services
make run-restart    # Restart all services
make run-status     # Show service status
make run-logs       # Show service logs
```

### **Deploy Commands**
```bash
make deploy         # Deploy to staging
make deploy-prod    # Deploy to production
make deploy-rollback # Rollback deployment
```

### **MCP Commands**
```bash
make mcp-setup      # Setup MCP integration
make mcp-start      # Start MCP servers
make mcp-status     # Show MCP status
make mcp-demo       # Run MCP demonstration
make mcp-analyze    # Run MCP analysis
```

## 🔄 Complete Workflows

### **Development Workflow**
```bash
# 1. Quick setup
./quick-start.sh

# 2. Build and run
make build
make run

# 3. Development with MCP
make mcp-start
make mcp-analyze

# 4. Check status
make run-status
```

### **Production Deployment Workflow**
```bash
# 1. Build for production
make build-prod

# 2. Deploy to staging
make deploy

# 3. Test staging environment
make run-status

# 4. Deploy to production
make deploy-prod

# 5. Monitor deployment
make run-logs
```

### **Testing Workflow**
```bash
# 1. Clean build and test
make build-clean
./build-app.sh test

# 2. Run with MCP analysis
make mcp-start
make mcp-analyze

# 3. Deploy and test
make deploy
make run-status
```

## 📊 Build Outputs

### **Build Directory Structure**
```
build/
├── smart-contracts/
│   ├── artifacts/          # Compiled contract artifacts
│   └── cache/             # Hardhat cache
├── backend/
│   ├── dist/              # Compiled TypeScript
│   └── package.json       # Dependencies
└── frontend/
    └── build/             # Optimized React build
```

### **Deployment Packages**
```
dist/
├── tracechain-staging-20241201-143022/
│   ├── smart-contracts/
│   ├── backend/
│   ├── frontend/
│   ├── docker-compose.yml
│   └── deployment-info.json
└── tracechain-staging-20241201-143022.tar.gz
```

## 🔍 Monitoring & Logs

### **Log Locations**
- **Build Logs**: `logs/smart-contracts-build.log`, `logs/backend-build.log`, `logs/frontend-build.log`
- **Runtime Logs**: `logs/hardhat.log`, `logs/backend.log`, `logs/frontend.log`
- **Deployment Logs**: `logs/smart-contracts-deploy.log`

### **Health Checks**
```bash
# Check service status
make run-status

# View logs
make run-logs

# MCP health check
make mcp-health
```

### **Service URLs**
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Hardhat Node**: http://localhost:8545
- **Database**: localhost:5432
- **Redis**: localhost:6379
- **MQTT**: localhost:1883
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3003

## 🛠️ Troubleshooting

### **Common Issues**

**Build fails:**
```bash
# Clean build
make build-clean

# Check logs
cat logs/*-build.log

# Verify dependencies
npm install
```

**Services won't start:**
```bash
# Check ports
lsof -i :3000
lsof -i :3001

# Stop and restart
make run-stop
make run

# Check Docker
docker-compose ps
```

**Deployment fails:**
```bash
# Check prerequisites
./deploy-app.sh -d all

# View deployment logs
cat logs/*-deploy.log

# Rollback if needed
make deploy-rollback
```

### **Performance Optimization**

**Build Performance:**
```bash
# Parallel builds
./build-app.sh -p all

# Skip tests during development
./build-app.sh -e development all
```

**Runtime Performance:**
```bash
# Run in production mode
make run-prod

# Use optimized Docker images
./deploy-app.sh -e production all
```

## 🎯 Best Practices

### **Development**
1. Use `make run-dev` for development
2. Run `make mcp-analyze` regularly
3. Check `make run-status` before committing
4. Use `make build-clean` before major changes

### **Testing**
1. Run `./build-app.sh test` before deployment
2. Use MCP analysis for code quality
3. Test in staging before production
4. Monitor logs during testing

### **Deployment**
1. Always test in staging first
2. Use `./deploy-app.sh -d` for dry runs
3. Monitor health checks after deployment
4. Keep rollback plan ready

## 🚀 Getting Started

1. **Initial Setup:**
   ```bash
   ./quick-start.sh
   ```

2. **Development:**
   ```bash
   make run-dev
   make mcp-start
   ```

3. **Production:**
   ```bash
   make build-prod
   make deploy-prod
   ```

Happy building with TraceChain! 🎉
