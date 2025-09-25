# TraceChain Development Makefile

.PHONY: help install build start stop test clean deploy

# Default target
help: ## Show this help message
	@echo "TraceChain Development Commands"
	@echo "=============================="
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation commands
install: ## Install all dependencies
	@echo "Installing dependencies..."
	cd smart-contracts && npm install
	cd backend && npm install
	cd frontend && npm install

install-smart-contracts: ## Install smart contracts dependencies
	cd smart-contracts && npm install

install-backend: ## Install backend dependencies
	cd backend && npm install

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

# Build commands
build: ## Build all services
	@echo "Building all services..."
	cd backend && npm run build
	cd frontend && npm run build
	cd smart-contracts && npm run compile

build-smart-contracts: ## Build smart contracts
	cd smart-contracts && npm run compile

build-backend: ## Build backend
	cd backend && npm run build

build-frontend: ## Build frontend
	cd frontend && npm run build

# Development commands
start: ## Start all services with Docker Compose
	docker-compose up -d

start-dev: ## Start all services in development mode
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

start-smart-contracts: ## Start Hardhat local network
	cd smart-contracts && npm run node

start-backend: ## Start backend development server
	cd backend && npm run dev

start-frontend: ## Start frontend development server
	cd frontend && npm start

# Testing commands
test: ## Run all tests
	@echo "Running tests..."
	cd smart-contracts && npm test
	cd backend && npm test
	cd frontend && npm test

test-smart-contracts: ## Test smart contracts
	cd smart-contracts && npm test

test-backend: ## Test backend
	cd backend && npm test

test-frontend: ## Test frontend
	cd frontend && npm test

# Database commands
db-migrate: ## Run database migrations
	cd backend && npm run prisma:migrate

db-seed: ## Seed database with sample data
	cd backend && npm run db:seed

db-reset: ## Reset database
	cd backend && npm run prisma:deploy && npm run db:seed

# Smart contract commands
deploy-local: ## Deploy smart contracts to local network
	cd smart-contracts && npm run deploy:local

deploy-mumbai: ## Deploy smart contracts to Mumbai testnet
	cd smart-contracts && npm run deploy:mumbai

deploy-polygon: ## Deploy smart contracts to Polygon mainnet
	cd smart-contracts && npm run deploy:polygon

# Docker commands
stop: ## Stop all services
	docker-compose down

stop-all: ## Stop all services and remove volumes
	docker-compose down -v

restart: ## Restart all services
	docker-compose restart

logs: ## Show logs for all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

logs-smart-contracts: ## Show smart contracts logs
	docker-compose logs -f hardhat

# Cleanup commands
clean: ## Clean all build artifacts and dependencies
	@echo "Cleaning up..."
	cd smart-contracts && npm run clean && rm -rf node_modules
	cd backend && rm -rf dist node_modules
	cd frontend && rm -rf build node_modules
	docker-compose down -v
	docker system prune -f

clean-docker: ## Clean Docker images and containers
	docker-compose down -v
	docker system prune -af

# Security commands
audit: ## Run security audits
	cd smart-contracts && npm audit
	cd backend && npm audit
	cd frontend && npm audit

audit-fix: ## Fix security vulnerabilities
	cd smart-contracts && npm audit fix
	cd backend && npm audit fix
	cd frontend && npm audit fix

# Monitoring commands
monitor: ## Open monitoring dashboards
	@echo "Opening monitoring dashboards..."
	@echo "Prometheus: http://localhost:9090"
	@echo "Grafana: http://localhost:3003 (admin/admin)"
	@echo "API Health: http://localhost:3000/api/health"

# Documentation commands
docs: ## Generate documentation
	@echo "Generating documentation..."
	cd backend && npm run docs
	cd frontend && npm run docs

# Production deployment
deploy-staging: ## Deploy to staging environment
	@echo "Deploying to staging..."
	# Add staging deployment commands here

deploy-production: ## Deploy to production environment
	@echo "Deploying to production..."
	# Add production deployment commands here

# Health checks
health: ## Check health of all services
	@echo "Checking service health..."
	@curl -s http://localhost:3000/api/health | jq .
	@curl -s http://localhost:3001 | head -n 5
	@curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 | jq .

# Development setup
setup: install build ## Complete development setup
	@echo "Development setup complete!"
	@echo "Run 'make start' to start all services"
	@echo "Run 'make health' to check service health"

# Quick development commands
dev: ## Start development environment
	make start
	@echo "Development environment started!"
	@echo "Frontend: http://localhost:3001"
	@echo "Backend API: http://localhost:3000"
	@echo "Hardhat Node: http://localhost:8545"
	@echo "Monitoring: http://localhost:9090 (Prometheus), http://localhost:3003 (Grafana)"

# Status check
status: ## Show status of all services
	@echo "Service Status:"
	@docker-compose ps
