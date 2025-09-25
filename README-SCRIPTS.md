# TraceChain Scripts & Automation

This document describes the automation scripts available for the TraceChain project.

## 🚀 Quick Start Scripts

### `quick-start.sh`
One-command setup and start for the entire TraceChain project.

```bash
./quick-start.sh
```

**What it does:**
- Installs all dependencies (smart contracts, backend, frontend)
- Sets up MCP integration with Cursor IDE
- Starts Docker services
- Starts MCP servers
- Provides service URLs and quick commands

## 🔧 MCP Integration Scripts

### `setup-mcp.sh`
Comprehensive setup for Model Context Protocol integration with Cursor AI IDE.

```bash
./setup-mcp.sh
```

**Features:**
- Creates Cursor MCP configuration
- Installs optional security scanning tools
- Creates environment configuration
- Sets up test scripts
- Provides usage examples

### `run-mcp.sh`
Interactive MCP server management and analysis tool.

```bash
./run-mcp.sh [command] [options]
```

**Commands:**
- `start` - Start MCP servers
- `stop` - Stop MCP servers  
- `restart` - Restart MCP servers
- `status` - Show MCP server status
- `test` - Test MCP functionality
- `analyze [target]` - Run analysis (contracts/api/all)
- `health` - Check project health
- `demo` - Run MCP demonstration
- `logs` - Show MCP server logs
- `help` - Show help message

**Examples:**
```bash
./run-mcp.sh start                    # Start all MCP servers
./run-mcp.sh analyze contracts       # Analyze smart contracts
./run-mcp.sh analyze api             # Analyze API endpoints
./run-mcp.sh health                  # Check project health
./run-mcp.sh demo                    # Run MCP demonstration
```

## 📋 Makefile Commands

The Makefile provides convenient shortcuts for common operations:

### Setup Commands
```bash
make install          # Install all dependencies
make quick-start      # One-command setup and start
```

### MCP Commands
```bash
make mcp-setup        # Setup MCP integration
make mcp-start        # Start MCP servers
make mcp-stop         # Stop MCP servers
make mcp-status       # Show MCP server status
make mcp-test         # Test MCP functionality
make mcp-demo         # Run MCP demonstration
make mcp-analyze      # Run MCP analysis
make mcp-health       # Check project health
```

### Development Commands
```bash
make start            # Start all services
make stop             # Stop all services
make build            # Build all services
make test             # Run all tests
make logs             # Show logs
```

## 🎯 Usage Examples

### Complete Project Setup
```bash
# Option 1: Quick start (recommended)
./quick-start.sh

# Option 2: Manual setup
make install
make mcp-setup
make start
make mcp-start
```

### Daily Development Workflow
```bash
# Start development environment
make start
make mcp-start

# Check project health
make mcp-health

# Run analysis
make mcp-analyze

# View logs
make logs
```

### MCP Analysis Workflow
```bash
# Analyze smart contracts
./run-mcp.sh analyze contracts

# Analyze API endpoints  
./run-mcp.sh analyze api

# Check overall project health
./run-mcp.sh health

# Run demonstration
./run-mcp.sh demo
```

## 🔍 MCP Analysis Features

### Smart Contract Analysis
- **Security Score**: Vulnerability detection and scoring
- **Gas Optimization**: Efficiency recommendations
- **Best Practices**: Compliance checking
- **Test Generation**: Automated test creation

### API Security Validation
- **Authentication**: JWT and Web3 validation
- **Input Validation**: Sanitization checks
- **Performance**: Optimization suggestions
- **Error Handling**: Validation and improvements

### Project Health Monitoring
- **Component Health**: Individual service status
- **Progress Tracking**: Roadmap milestone tracking
- **Performance Metrics**: Benchmarking and optimization
- **Security Scoring**: Overall security assessment

## 📊 Output Examples

### Smart Contract Analysis
```
🔒 Security Score: 92/100
✅ STRENGTHS:
- ReentrancyGuard implemented
- Pausable contract for emergency stops
- Ownable access control

⚠️ RECOMMENDATIONS:
- Consider adding circuit breaker
- Implement time-locked admin functions
```

### API Security Validation
```
🛡️ Security Score: 88/100
✅ SECURITY FEATURES:
- Input validation with express-validator
- Authentication middleware
- Input sanitization

⚠️ IMPROVEMENTS NEEDED:
- Add rate limiting per endpoint
- Implement request logging
```

### Project Health Check
```
📊 Overall Health Score: 85/100
✅ Smart Contracts: 90/100
✅ Backend API: 82/100
✅ Frontend: 80/100
✅ Infrastructure: 88/100
```

## 🛠️ Troubleshooting

### Common Issues

**MCP servers won't start:**
```bash
# Check if ports are available
./run-mcp.sh status

# Restart MCP servers
./run-mcp.sh restart

# Check logs
./run-mcp.sh logs
```

**Cursor IDE not detecting MCP:**
```bash
# Re-run MCP setup
make mcp-setup

# Restart Cursor IDE
# Check Cursor Settings → Tools & Integrations
```

**Services not starting:**
```bash
# Check Docker status
make status

# Restart all services
make restart

# Check logs
make logs
```

## 📚 Additional Resources

- `MCP_EXAMPLES.md` - Detailed MCP usage examples
- `CURSOR_MCP_SETUP.md` - Cursor IDE setup guide
- `.cursor/mcp.json` - MCP configuration file
- `logs/` - MCP server logs directory

## 🎉 Getting Started

1. **Quick Start** (Recommended):
   ```bash
   ./quick-start.sh
   ```

2. **Manual Setup**:
   ```bash
   make install
   make mcp-setup
   make start
   make mcp-start
   ```

3. **Verify Setup**:
   ```bash
   make mcp-status
   make mcp-health
   ```

4. **Start Development**:
   - Open Cursor IDE
   - Check MCP Tools section
   - Use MCP commands for analysis

Happy coding with TraceChain! 🚀
