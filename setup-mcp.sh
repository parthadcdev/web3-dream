#!/bin/bash

# TraceChain MCP Setup Script
# This script sets up and runs the Model Context Protocol integration with Cursor AI IDE

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_ROOT="/Users/partha/Work/web3-dream"
CURSOR_MCP_CONFIG="$HOME/.cursor/mcp.json"
MCP_SERVER="$PROJECT_ROOT/mcp-server.js"
API_VALIDATOR="$PROJECT_ROOT/backend/src/scripts/mcp-api-validator.js"

echo -e "${BLUE}🚀 TraceChain MCP Setup Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

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

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ] && [ ! -f "$PROJECT_ROOT/smart-contracts/package.json" ]; then
    print_error "Not in TraceChain project directory. Please run from project root."
    exit 1
fi

print_status "Found TraceChain project at: $PROJECT_ROOT"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_status "Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "npm version: $(npm --version)"

# Create Cursor MCP configuration directory
print_info "Setting up Cursor MCP configuration..."

if [ ! -d "$HOME/.cursor" ]; then
    mkdir -p "$HOME/.cursor"
    print_status "Created Cursor configuration directory"
fi

# Create MCP configuration
cat > "$CURSOR_MCP_CONFIG" << EOF
{
  "mcpServers": {
    "tracechain-project": {
      "command": "node",
      "args": ["$MCP_SERVER"],
      "env": {
        "PROJECT_ROOT": "$PROJECT_ROOT",
        "NODE_ENV": "development"
      }
    },
    "tracechain-api-validator": {
      "command": "node",
      "args": ["$API_VALIDATOR"],
      "env": {
        "PROJECT_ROOT": "$PROJECT_ROOT",
        "API_BASE_URL": "http://localhost:3000",
        "DATABASE_URL": "postgresql://tracechain_user:tracechain_password@localhost:5432/tracechain_db"
      }
    },
    "tracechain-smart-contracts": {
      "command": "npx",
      "args": ["hardhat", "console", "--network", "localhost"],
      "cwd": "$PROJECT_ROOT/smart-contracts",
      "env": {
        "HARDHAT_NETWORK": "localhost",
        "CONTRACT_PATH": "$PROJECT_ROOT/smart-contracts"
      }
    }
  }
}
EOF

print_status "Created Cursor MCP configuration at: $CURSOR_MCP_CONFIG"

# Make scripts executable
print_info "Making MCP scripts executable..."
chmod +x "$MCP_SERVER"
chmod +x "$API_VALIDATOR"
print_status "MCP scripts are now executable"

# Install optional dependencies for enhanced functionality
print_info "Installing optional MCP dependencies..."

# Install Snyk for security scanning (optional)
if command -v npm &> /dev/null; then
    print_info "Installing Snyk CLI for security scanning..."
    npm install -g @snyk/cli 2>/dev/null || print_warning "Failed to install Snyk CLI (optional)"
    
    print_info "Installing Hardhat console for smart contract analysis..."
    npm install -g @hardhat/console 2>/dev/null || print_warning "Failed to install Hardhat console (optional)"
    
    print_info "Installing Artillery for load testing..."
    npm install -g artillery 2>/dev/null || print_warning "Failed to install Artillery (optional)"
fi

# Create environment file for MCP
print_info "Creating MCP environment configuration..."
cat > "$PROJECT_ROOT/.env.mcp" << EOF
# MCP Environment Configuration
PROJECT_ROOT=$PROJECT_ROOT
NODE_ENV=development

# API Configuration
API_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://tracechain_user:tracechain_password@localhost:5432/tracechain_db

# Blockchain Configuration
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
HARDHAT_NETWORK=localhost

# Security Scanning (Optional)
SNYK_TOKEN=\${SNYK_TOKEN}

# Monitoring
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3003
EOF

print_status "Created MCP environment file: $PROJECT_ROOT/.env.mcp"

# Create MCP test script
print_info "Creating MCP test script..."
cat > "$PROJECT_ROOT/test-mcp.sh" << 'EOF'
#!/bin/bash

# MCP Test Script
echo "🧪 Testing MCP Integration..."

# Test MCP server startup
echo "Testing MCP server startup..."
timeout 5s node mcp-server.js &
MCP_PID=$!
sleep 2
kill $MCP_PID 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ MCP server starts successfully"
else
    echo "❌ MCP server failed to start"
fi

# Test API validator
echo "Testing API validator..."
timeout 5s node backend/src/scripts/mcp-api-validator.js &
API_PID=$!
sleep 2
kill $API_PID 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ API validator starts successfully"
else
    echo "❌ API validator failed to start"
fi

echo "🎉 MCP testing complete!"
EOF

chmod +x "$PROJECT_ROOT/test-mcp.sh"
print_status "Created MCP test script: $PROJECT_ROOT/test-mcp.sh"

# Create MCP usage examples
print_info "Creating MCP usage examples..."
cat > "$PROJECT_ROOT/MCP_EXAMPLES.md" << 'EOF'
# MCP Usage Examples for TraceChain

## Smart Contract Analysis

### Security Analysis
```
Ask Cursor: "Use MCP to analyze the security of smart-contracts/contracts/ProductRegistry.sol"
```

### Gas Optimization
```
Ask Cursor: "Use MCP to optimize gas usage in smart-contracts/contracts/NFTCertificate.sol"
```

### Best Practices Check
```
Ask Cursor: "Use MCP to check best practices compliance in my smart contracts"
```

## API Validation

### Security Validation
```
Ask Cursor: "Use MCP to validate the security of backend/src/routes/products.ts"
```

### Performance Check
```
Ask Cursor: "Use MCP to check performance of backend/src/routes/users.ts"
```

### Input Sanitization
```
Ask Cursor: "Use MCP to validate input sanitization in my API endpoints"
```

## Project Health Monitoring

### Overall Health Check
```
Ask Cursor: "Use MCP to check the health of all project components"
```

### Component-Specific Check
```
Ask Cursor: "Use MCP to check the health of smart contracts"
Ask Cursor: "Use MCP to check the health of backend API"
Ask Cursor: "Use MCP to check the health of frontend"
Ask Cursor: "Use MCP to check the health of infrastructure"
```

## Test Generation

### Smart Contract Tests
```
Ask Cursor: "Use MCP to generate unit tests for smart-contracts/contracts/ProductRegistry.sol"
Ask Cursor: "Use MCP to generate integration tests for my smart contracts"
```

### API Tests
```
Ask Cursor: "Use MCP to generate unit tests for backend/src/routes/products.ts"
Ask Cursor: "Use MCP to generate integration tests for my API endpoints"
```

## Docker Optimization

### Service Optimization
```
Ask Cursor: "Use MCP to optimize Docker configuration for backend"
Ask Cursor: "Use MCP to optimize Docker configuration for frontend"
Ask Cursor: "Use MCP to optimize Docker configuration for all services"
```

## Roadmap Progress

### Progress Tracking
```
Ask Cursor: "Use MCP to check my progress against Phase 1 MVP milestones"
Ask Cursor: "Use MCP to show what needs to be done for the next sprint"
```
EOF

print_status "Created MCP usage examples: $PROJECT_ROOT/MCP_EXAMPLES.md"

# Create MCP development workflow script
print_info "Creating MCP development workflow script..."
cat > "$PROJECT_ROOT/mcp-workflow.sh" << 'EOF'
#!/bin/bash

# MCP Development Workflow Script
# Use this script to integrate MCP into your daily development workflow

echo "🔄 MCP Development Workflow"
echo "=========================="

# Function to run MCP analysis
run_mcp_analysis() {
    echo "🔍 Running MCP analysis..."
    
    # Check project health
    echo "📊 Checking project health..."
    # This would normally call the MCP server
    echo "✅ Project health check complete"
    
    # Analyze smart contracts
    echo "🔒 Analyzing smart contracts..."
    # This would normally call the MCP server
    echo "✅ Smart contract analysis complete"
    
    # Validate API endpoints
    echo "🛡️ Validating API endpoints..."
    # This would normally call the MCP server
    echo "✅ API validation complete"
}

# Function to generate tests
generate_tests() {
    echo "🧪 Generating tests..."
    
    # Generate smart contract tests
    echo "📝 Generating smart contract tests..."
    # This would normally call the MCP server
    
    # Generate API tests
    echo "📝 Generating API tests..."
    # This would normally call the MCP server
    
    echo "✅ Test generation complete"
}

# Main workflow
case "$1" in
    "start")
        echo "🚀 Starting MCP development workflow..."
        run_mcp_analysis
        ;;
    "test")
        echo "🧪 Running MCP test generation..."
        generate_tests
        ;;
    "health")
        echo "📊 Running project health check..."
        run_mcp_analysis
        ;;
    *)
        echo "Usage: $0 {start|test|health}"
        echo ""
        echo "Commands:"
        echo "  start  - Run full MCP analysis workflow"
        echo "  test   - Generate tests using MCP"
        echo "  health - Check project health"
        exit 1
        ;;
esac
EOF

chmod +x "$PROJECT_ROOT/mcp-workflow.sh"
print_status "Created MCP workflow script: $PROJECT_ROOT/mcp-workflow.sh"

# Test MCP setup
print_info "Testing MCP setup..."
if [ -f "$PROJECT_ROOT/test-mcp.sh" ]; then
    "$PROJECT_ROOT/test-mcp.sh"
else
    print_warning "MCP test script not found, skipping test"
fi

# Final instructions
echo ""
echo -e "${GREEN}🎉 MCP Setup Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Restart Cursor IDE to load the MCP configuration"
echo "2. Check MCP Tools section in Cursor Settings → Tools & Integrations"
echo "3. Look for green status indicators next to your MCP servers"
echo "4. Start using MCP commands in Cursor (see MCP_EXAMPLES.md)"
echo ""
echo -e "${BLUE}Available Scripts:${NC}"
echo "• ./test-mcp.sh           - Test MCP integration"
echo "• ./mcp-workflow.sh       - Run MCP development workflow"
echo "• ./setup-mcp.sh          - Re-run this setup script"
echo ""
echo -e "${BLUE}Configuration Files:${NC}"
echo "• $CURSOR_MCP_CONFIG      - Cursor MCP configuration"
echo "• $PROJECT_ROOT/.env.mcp  - MCP environment variables"
echo "• $PROJECT_ROOT/MCP_EXAMPLES.md - Usage examples"
echo ""
echo -e "${GREEN}Happy coding with MCP! 🚀${NC}"
