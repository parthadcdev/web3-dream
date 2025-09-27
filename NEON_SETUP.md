# Neon Database Setup for TraceChain

## Overview
This guide will help you set up Neon PostgreSQL database for TraceChain using MCP tools or manual setup. The project uses a dedicated "tracechain" database with proper naming conventions.

## Prerequisites
- Neon account (sign up at [neon.tech](https://neon.tech))
- Node.js and npm installed
- TraceChain project cloned
- MCP Neon tools configured (optional but recommended)

## Step 1: Create Neon Database

### Option A: Using MCP Tools (Recommended)

1. **Create TraceChain Project**
   ```bash
   # Use MCP Neon tools to create dedicated project
   mcp_Neon_create_project --name "tracechain"
   ```

2. **Create Proper Database**
   ```bash
   # Create tracechain_db database (not default neondb)
   mcp_Neon_run_sql --sql "CREATE DATABASE tracechain_db;"
   ```

3. **Get Connection String**
   ```bash
   # Get connection string for tracechain_db
   mcp_Neon_get_connection_string --databaseName "tracechain_db"
   ```

### Option B: Manual Setup

1. **Sign up/Login to Neon**
   - Go to [console.neon.tech](https://console.neon.tech)
   - Create a new account or login

2. **Create a New Project**
   - Click "Create Project"
   - Choose project name: **"tracechain"**
   - Select a region (recommended: US West 2)
   - Choose PostgreSQL version (recommended: 17)

3. **Create Database**
   - In SQL Editor, run: `CREATE DATABASE tracechain_db;`
   - Switch to the new database

4. **Get Connection String**
   - After project creation, go to "Connection Details"
   - Copy the connection string for `tracechain_db`
   - It should look like: `postgresql://neondb_owner:password@ep-xxx-xxx.us-west-2.aws.neon.tech/tracechain_db?sslmode=require`

## Step 2: Configure Environment Variables

1. **Create .env file in backend directory**
   ```bash
   cd backend
   cp env.example .env
   ```

2. **Update DATABASE_URL in .env**
   ```env
   # TraceChain Database Configuration
   DATABASE_URL="postgresql://neondb_owner:password@ep-xxx-xxx.us-west-2.aws.neon.tech/tracechain_db?channel_binding=require&sslmode=require"
   ```

   **Important**: Use `tracechain_db` as the database name, not the default `neondb`.

## Step 3: Install Dependencies

```bash
cd backend
npm install
```

## Step 4: Generate Prisma Client

```bash
npm run prisma:generate
```

## Step 5: Run Database Migration

```bash
npm run prisma:migrate
```

## Step 6: Seed Database (Optional)

```bash
npm run db:seed
```

## Step 7: Test Connection

```bash
npm run dev
```

The backend should start successfully and connect to Neon database.

## Step 8: Update Docker Compose (Optional)

If you want to run other services with Docker but use Neon for database:

```bash
# Start only Redis and other services
docker-compose up redis mosquitto prometheus grafana -d
```

## Verification

1. **Check Database Connection**
   - Backend should start without database connection errors
   - Check logs for "✅ Database connection successful"

2. **Verify Tables Created**
   ```sql
   -- Run in Neon SQL Editor or via MCP
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```
   Expected tables:
   - `users` - User management and authentication
   - `products` - Product traceability and lifecycle
   - `checkpoints` - Supply chain tracking points
   - `nft_certificates` - Anti-counterfeiting certificates
   - `audit_logs` - Security and compliance logging
   - `compliance_standards` - Regulatory compliance data
   - `security_events` - Security monitoring events
   - `token_transactions` - $TRACE token transactions

3. **Test API Endpoints**
   - Visit `http://localhost:3000/api/health` - System health
   - Visit `http://localhost:3000/api/database/health` - Database health
   - Should return healthy status

4. **Verify Seeded Data**
   ```sql
   -- Check if sample data was created
   SELECT COUNT(*) FROM users; -- Should return 3
   SELECT COUNT(*) FROM products; -- Should return 2
   SELECT COUNT(*) FROM compliance_standards; -- Should return 3
   ```

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL is correct
- Check if SSL is required (add `?sslmode=require`)
- Ensure database name matches in connection string

### Migration Issues
- Run `npx prisma migrate reset` to reset database
- Check Prisma schema for syntax errors
- Verify all required fields are defined

### Performance Issues
- Neon has connection limits on free tier
- Consider connection pooling for production
- Monitor usage in Neon console

## Production Considerations

1. **Connection Pooling**
   - Use PgBouncer or similar for production
   - Configure connection limits appropriately

2. **Backup Strategy**
   - Neon provides automatic backups
   - Configure point-in-time recovery if needed

3. **Monitoring**
   - Set up alerts for connection issues
   - Monitor query performance
   - Track database usage

4. **Security**
   - Use strong passwords
   - Enable SSL connections
   - Restrict IP access if possible

## Benefits of Neon

- **Serverless**: No need to manage PostgreSQL instances
- **Automatic Scaling**: Handles traffic spikes automatically
- **Built-in Backups**: Automatic point-in-time recovery
- **Branching**: Create database branches for development
- **Monitoring**: Built-in performance monitoring
- **Cost Effective**: Pay only for what you use
- **MCP Integration**: Use MCP tools for database management
- **Proper Naming**: Dedicated `tracechain_db` database for better organization

## Current Configuration

- **Project Name**: `tracechain`
- **Database Name**: `tracechain_db`
- **Region**: `us-west-2` (Oregon)
- **PostgreSQL Version**: 17
- **Connection**: SSL required with channel binding
- **MCP Project ID**: `winter-fog-46101421`

## Next Steps

1. Set up database branching for different environments
2. Configure monitoring and alerts
3. Set up automated backups
4. Implement connection pooling for production
5. Set up database performance monitoring
