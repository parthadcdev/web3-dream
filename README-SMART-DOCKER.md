# Smart Docker Compose Guide

This guide covers the smart Docker Compose configurations that can detect existing containers and intelligently start only the services you need.

## 🧠 **Is This a Good Approach?**

**Yes, but with considerations:**

### **✅ Pros:**
- **Resource Efficiency**: Avoids running duplicate services
- **Flexibility**: Works with existing infrastructure
- **Development Speed**: Faster startup when services exist
- **Cost Savings**: Reduces resource usage in cloud environments
- **Integration**: Easy to connect to existing databases/caches

### **⚠️ Considerations:**
- **Complexity**: Adds configuration complexity
- **Debugging**: Can be harder to troubleshoot mixed environments
- **Consistency**: Different environments may behave differently
- **Dependencies**: Relies on external services being properly configured

## 🚀 **Available Approaches**

### **1. Smart Container Detection (`docker-smart-start.sh`)**
**Best for**: Mixed environments with some external services

```bash
# Start with smart detection
make docker-smart

# Or directly
./scripts/docker-smart-start.sh start
```

**Features:**
- Detects existing PostgreSQL/Redis containers
- Uses external services when available
- Starts internal services only when needed
- Provides detailed status information

### **2. Conditional Logic (`docker-conditional-start.sh`)**
**Best for**: Advanced conditional service management

```bash
# Start with conditional logic
make docker-conditional

# Or directly
./scripts/docker-conditional-start.sh start
```

**Features:**
- Advanced service detection
- Environment variable-based configuration
- Dynamic Docker Compose override generation
- Profile-based service selection

### **3. External Services Only (`docker-compose.external.yml`)**
**Best for**: Connecting to existing external services

```bash
# Start with external connections
make docker-external

# Or directly
docker-compose -f docker-compose.external.yml up -d
```

**Features:**
- Connects to external PostgreSQL/Redis
- Uses `host.docker.internal` for host connections
- Minimal service footprint
- Good for production-like environments

## 🔧 **Configuration Options**

### **Environment Variables**

**Smart Detection:**
```bash
export EXTERNAL_POSTGRES=true
export EXTERNAL_REDIS=false
export POSTGRES_HOST=localhost
export REDIS_HOST=localhost
```

**Conditional Logic:**
```bash
export POSTGRES_EXTERNAL=true
export REDIS_EXTERNAL=false
export DATABASE_URL=postgresql://user:pass@host:5432/db
export REDIS_URL=redis://host:6379
```

### **Docker Compose Profiles**

**Available Profiles:**
- `postgres` - PostgreSQL service
- `redis` - Redis service
- `backend` - Backend API
- `frontend` - Frontend application
- `blockchain` - Hardhat node
- `mqtt` - MQTT broker
- `monitoring` - Prometheus + Grafana
- `all` - All services

**Usage:**
```bash
# Start only specific services
COMPOSE_PROFILES=postgres,redis docker-compose -f docker-compose.smart.yml up -d

# Start all services
docker-compose -f docker-compose.smart.yml --profile all up -d
```

## 📊 **Service Detection Logic**

### **Container Detection:**
```bash
# Check if container is running
docker ps --format "table {{.Names}}" | grep -q "container-name"

# Check if port is in use
lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1

# Check service availability
nc -z localhost 5432
```

### **Smart Decision Making:**
1. **Check for existing containers** by name
2. **Check for port usage** by any process
3. **Test service connectivity** with network tools
4. **Set environment variables** based on findings
5. **Choose appropriate Docker Compose configuration**

## 🎯 **Use Cases**

### **Development Scenarios:**

**1. Fresh Development Environment:**
```bash
# Use standard compose - starts all services
make start
```

**2. Existing PostgreSQL, Need Redis:**
```bash
# Smart detection - uses external PostgreSQL, starts Redis
make docker-smart
```

**3. Existing Infrastructure:**
```bash
# External services - connects to existing PostgreSQL/Redis
make docker-external
```

**4. Mixed Environment:**
```bash
# Conditional logic - advanced detection and configuration
make docker-conditional
```

### **Production Scenarios:**

**1. Staging with External Database:**
```bash
export POSTGRES_EXTERNAL=true
export REDIS_EXTERNAL=true
make docker-conditional
```

**2. Local Production-like Testing:**
```bash
# Connect to production-like external services
make docker-external
```

## 🔍 **Monitoring & Debugging**

### **Service Status:**
```bash
# Check smart service status
make docker-status

# Check conditional service status
./scripts/docker-conditional-start.sh status

# Standard Docker status
docker-compose ps
```

### **Logs:**
```bash
# View all logs
./scripts/docker-smart-start.sh logs

# View specific service logs
./scripts/docker-smart-start.sh logs backend

# Standard Docker logs
docker-compose logs -f
```

### **Debugging External Connections:**
```bash
# Test PostgreSQL connection
docker run --rm postgres:14 psql -h host.docker.internal -U tracechain_user -d tracechain_db

# Test Redis connection
docker run --rm redis:7-alpine redis-cli -h host.docker.internal ping

# Check network connectivity
docker run --rm alpine nc -z host.docker.internal 5432
```

## ⚙️ **Configuration Files**

### **Smart Compose (`docker-compose.smart.yml`):**
- Uses profiles for conditional service startup
- Supports external service environment variables
- Includes health checks and dependencies
- Optional service dependencies with `required: false`

### **External Compose (`docker-compose.external.yml`):**
- Connects to external services via `host.docker.internal`
- Minimal service footprint
- No internal PostgreSQL/Redis services
- Production-ready configuration

### **Conditional Override (`docker-compose.conditional.yml`):**
- Generated automatically based on service detection
- Dynamic environment variable configuration
- Profile-based service selection
- Runtime configuration updates

## 🛠️ **Integration with Existing Scripts**

### **Updated Makefile Commands:**
```bash
# Smart Docker commands
make docker-smart          # Smart container detection
make docker-conditional    # Conditional logic
make docker-external       # External services only
make docker-status         # Smart status check
make docker-stop-smart     # Stop smart services
```

### **Integration with Build Scripts:**
```bash
# Build and run with smart detection
make build
make docker-smart

# Build and run with external services
make build
make docker-external
```

### **Integration with MCP:**
```bash
# MCP analysis with smart Docker
make mcp-start
make docker-smart
make mcp-analyze
```

## 🚨 **Troubleshooting**

### **Common Issues:**

**1. External Service Connection Failed:**
```bash
# Check if external service is running
lsof -Pi :5432 -sTCP:LISTEN

# Test connectivity from container
docker run --rm alpine nc -z host.docker.internal 5432

# Check Docker network configuration
docker network ls
```

**2. Port Conflicts:**
```bash
# Find what's using the port
lsof -Pi :5432 -sTCP:LISTEN

# Stop conflicting service
sudo systemctl stop postgresql

# Or use different ports
export POSTGRES_PORT=5433
```

**3. Environment Variable Issues:**
```bash
# Check current environment
env | grep -E "(POSTGRES|REDIS|EXTERNAL)"

# Reset environment
unset POSTGRES_EXTERNAL REDIS_EXTERNAL
```

### **Debugging Commands:**
```bash
# Verbose startup
COMPOSE_LOG_LEVEL=DEBUG make docker-smart

# Check service detection
./scripts/docker-smart-start.sh status

# Test individual components
docker-compose -f docker-compose.smart.yml config
```

## 🎯 **Best Practices**

### **Development:**
1. **Use smart detection** for mixed environments
2. **Use external compose** for production-like testing
3. **Check status regularly** with `make docker-status`
4. **Monitor logs** for connection issues

### **Production:**
1. **Use external services** for databases and caches
2. **Configure proper networking** for container communication
3. **Set up health checks** for external service monitoring
4. **Use environment variables** for configuration management

### **CI/CD:**
1. **Use conditional logic** for different environments
2. **Test with external services** in staging
3. **Monitor service detection** in deployment logs
4. **Have fallback configurations** ready

## 🚀 **Quick Start Guide**

### **1. Standard Development:**
```bash
make start  # Starts all services
```

### **2. Smart Development:**
```bash
make docker-smart  # Detects existing services
```

### **3. External Services:**
```bash
make docker-external  # Connects to external services
```

### **4. Advanced Conditional:**
```bash
make docker-conditional  # Advanced detection and configuration
```

The smart Docker approach provides flexibility while maintaining simplicity. Choose the approach that best fits your development workflow and infrastructure setup!
