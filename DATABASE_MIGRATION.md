# Database Migration: From Local PostgreSQL to Neon

## Overview

TraceChain has been migrated from using local PostgreSQL (via Docker/Podman) to **Neon PostgreSQL**, a serverless PostgreSQL service. This migration provides better scalability, automatic backups, and eliminates the need for local database management.

## What Changed

### Before (Local PostgreSQL)
- PostgreSQL running in Docker/Podman container
- Local database management and maintenance
- Manual backup and recovery procedures
- Limited scalability and connection management

### After (Neon PostgreSQL)
- Serverless PostgreSQL in the cloud
- Automatic scaling and connection management
- Built-in backups and point-in-time recovery
- Better performance and reliability

## Migration Steps

### 1. Create Neon Database

#### Option A: Using MCP Tools (Recommended)

1. **Create TraceChain Project**
   ```bash
   # Use MCP Neon tools
   mcp_Neon_create_project --name "tracechain"
   ```

2. **Create Proper Database**
   ```bash
   # Create tracechain_db database
   mcp_Neon_run_sql --sql "CREATE DATABASE tracechain_db;"
   ```

3. **Get Connection String**
   ```bash
   mcp_Neon_get_connection_string --databaseName "tracechain_db"
   ```

#### Option B: Manual Setup

1. **Sign up for Neon**
   - Go to [neon.tech](https://neon.tech)
   - Create a free account
   - Create a new project named **"tracechain"**

2. **Create Database**
   - In SQL Editor: `CREATE DATABASE tracechain_db;`
   - Switch to the new database

3. **Get Connection String**
   - Copy connection string for `tracechain_db`
   - Format: `postgresql://neondb_owner:password@ep-xxx-xxx.us-west-2.aws.neon.tech/tracechain_db?channel_binding=require&sslmode=require`

### 2. Update Environment Variables

```bash
# Update backend/.env
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/tracechain_db?sslmode=require"
```

### 3. Run Database Migration

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
```

### 4. Update Docker Configuration

The `docker-compose.yml` has been updated to:
- Remove PostgreSQL service
- Use environment variable for `DATABASE_URL`
- Remove PostgreSQL dependencies

### 5. Update Scripts

All scripts have been updated:
- `run-app.sh` - No longer waits for PostgreSQL
- `build-app.sh` - Updated for Neon
- `setup-neon.sh` - New script for Neon setup

## Benefits of Neon

### 🚀 **Performance**
- **Serverless**: No need to manage database instances
- **Auto-scaling**: Handles traffic spikes automatically
- **Connection pooling**: Built-in connection management
- **Global availability**: Multiple regions available

### 🔒 **Reliability**
- **Automatic backups**: Point-in-time recovery
- **High availability**: 99.9% uptime SLA
- **Disaster recovery**: Built-in redundancy
- **Monitoring**: Real-time performance metrics

### 💰 **Cost Efficiency**
- **Pay-per-use**: Only pay for what you use
- **Free tier**: Generous free tier for development
- **No infrastructure costs**: No servers to manage
- **Predictable pricing**: Transparent pricing model

### 🛠️ **Developer Experience**
- **Easy setup**: Get started in minutes
- **Database branching**: Create branches for development
- **SQL editor**: Built-in query interface
- **API access**: Programmatic database management

## Configuration Changes

### Environment Variables

```env
# Before (Local PostgreSQL)
DATABASE_URL="postgresql://tracechain_user:tracechain_password@localhost:5432/tracechain_db"

# After (Neon PostgreSQL - TraceChain Project)
DATABASE_URL="postgresql://neondb_owner:password@ep-xxx-xxx.us-west-2.aws.neon.tech/tracechain_db?channel_binding=require&sslmode=require"
```

**Key Changes:**
- Project Name: `tracechain` (dedicated project)
- Database Name: `tracechain_db` (proper naming)
- Region: `us-west-2` (Oregon)
- SSL: Required with channel binding
- MCP Integration: Available for database management

### Docker Compose

```yaml
# Before
services:
  postgres:
    image: postgres:14
    # ... PostgreSQL configuration

# After
services:
  # PostgreSQL service removed
  # DATABASE_URL now comes from environment
```

### Scripts

```bash
# Before
./run-app.sh  # Started PostgreSQL container

# After
./run-app.sh  # Uses Neon database
./scripts/setup-neon.sh  # New setup script
```

## Troubleshooting

### Connection Issues

1. **Check connection string format**
   ```bash
   # Ensure SSL is required
   DATABASE_URL="...?sslmode=require"
   ```

2. **Verify database exists**
   - Check Neon console
   - Ensure database name is correct

3. **Check network connectivity**
   ```bash
   # Test connection
   curl -I https://ep-xxx-xxx.us-east-1.aws.neon.tech
   ```

### Migration Issues

1. **Reset database**
   ```bash
   npx prisma migrate reset
   npx prisma migrate dev --name init
   ```

2. **Regenerate Prisma client**
   ```bash
   npx prisma generate
   ```

3. **Check schema compatibility**
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

## Production Considerations

### Security
- Use strong passwords
- Enable SSL connections
- Restrict IP access if possible
- Regular security audits

### Monitoring
- Set up alerts for connection issues
- Monitor query performance
- Track database usage
- Set up backup verification

### Scaling
- Configure connection limits
- Use connection pooling
- Monitor resource usage
- Plan for traffic spikes

## Rollback Plan

If needed, you can rollback to local PostgreSQL:

1. **Restore docker-compose.yml**
   ```bash
   git checkout HEAD~1 -- docker-compose.yml
   ```

2. **Update environment variables**
   ```bash
   DATABASE_URL="postgresql://tracechain_user:tracechain_password@localhost:5432/tracechain_db"
   ```

3. **Start local services**
   ```bash
   docker-compose up -d postgres
   ```

4. **Run migrations**
   ```bash
   npx prisma migrate dev
   ```

## Support

### Documentation
- [Neon Documentation](https://neon.tech/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TraceChain Setup Guide](NEON_SETUP.md)

### Community
- [Neon Discord](https://discord.gg/neon)
- [TraceChain GitHub](https://github.com/your-org/web3-dream)

### Professional Support
- Email: support@tracechain.com
- Neon Support: [Neon Support](https://neon.tech/support)

## Current Database Schema

The TraceChain database includes the following tables:

- **`users`** - User management and authentication (3 seeded users)
- **`products`** - Product traceability and lifecycle (2 sample products)
- **`checkpoints`** - Supply chain tracking points
- **`nft_certificates`** - Anti-counterfeiting certificates
- **`audit_logs`** - Security and compliance logging
- **`compliance_standards`** - Regulatory compliance data (3 standards)
- **`security_events`** - Security monitoring events
- **`token_transactions`** - $TRACE token transactions

## Verification Commands

```bash
# Check database connection
curl http://localhost:3000/api/database/health

# Verify seeded data
npx prisma studio  # Opens database browser

# Check table counts
SELECT COUNT(*) FROM users;           -- Should return 3
SELECT COUNT(*) FROM products;        -- Should return 2
SELECT COUNT(*) FROM compliance_standards; -- Should return 3
```

---

**Migration completed successfully!** 🎉

TraceChain now uses Neon PostgreSQL with proper project naming (`tracechain`), dedicated database (`tracechain_db`), and MCP integration for better performance, reliability, and scalability.
