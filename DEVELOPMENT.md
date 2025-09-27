# Development Guide for TraceChain

## Overview

This guide provides comprehensive information for developers working on TraceChain, including setup, development workflow, and best practices.

## Quick Start

### Prerequisites

- **Node.js 18+** and npm/yarn
- **Neon PostgreSQL** account (free tier available)
- **Redis** (local or cloud)
- **MetaMask** wallet for blockchain interactions
- **Git** for version control

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/web3-dream.git
   cd web3-dream
   ```

2. **Set up Neon database**
   ```bash
   ./scripts/setup-neon.sh
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   
   # Smart contracts
   cd ../smart-contracts && npm install
   ```

4. **Configure environment**
   ```bash
   # Copy environment templates
   cp backend/env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp smart-contracts/.env.example smart-contracts/.env
   
   # Update DATABASE_URL in backend/.env with your Neon connection string
   ```

5. **Start development environment**
   ```bash
   ./run-app.sh
   ```

## Development Workflow

### Database Development

#### Using Neon PostgreSQL

TraceChain uses **Neon PostgreSQL** for all database operations:

```bash
# Set up database
./scripts/setup-neon.sh

# Run migrations
cd backend
npx prisma migrate dev

# Seed database
npm run db:seed

# View database
npx prisma studio
```

#### Database Schema Changes

1. **Modify Prisma schema**
   ```bash
   # Edit backend/prisma/schema.prisma
   ```

2. **Create migration**
   ```bash
   cd backend
   npx prisma migrate dev --name your_migration_name
   ```

3. **Update Prisma client**
   ```bash
   npx prisma generate
   ```

### Backend Development

#### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript types
├── prisma/              # Database schema and migrations
├── tests/               # Test files
└── package.json
```

#### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run security tests
npm run test:security

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

#### API Development

- **Base URL**: `http://localhost:3000`
- **Health Check**: `GET /api/health`
- **Database Health**: `GET /api/database/health`
- **API Documentation**: Available at `/api/health` endpoint

#### Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
```

### Frontend Development

#### Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── store/          # Redux store
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript types
├── public/             # Static assets
└── package.json
```

#### Development Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

#### Environment Variables

```env
# API
REACT_APP_API_URL=http://localhost:3000

# Blockchain
REACT_APP_BLOCKCHAIN_NETWORK=mumbai
REACT_APP_PRODUCT_REGISTRY_ADDRESS=0x...
REACT_APP_NFT_CERTIFICATE_ADDRESS=0x...
```

### Smart Contract Development

#### Project Structure

```
smart-contracts/
├── contracts/          # Solidity contracts
├── test/              # Test files
├── scripts/           # Deployment scripts
├── artifacts/         # Compiled contracts
├── cache/             # Hardhat cache
└── hardhat.config.js  # Hardhat configuration
```

#### Development Commands

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Run specific test
npm test test/NFTCertificate.test.js

# Deploy to local network
npm run deploy:local

# Deploy to testnet
npm run deploy:mumbai

# Deploy to mainnet
npm run deploy:polygon
```

#### Environment Variables

```env
# Networks
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# API Keys
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Private Key (for deployment)
PRIVATE_KEY=your_private_key_here
```

## Testing

### Backend Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run security tests
npm run test:security
```

### Frontend Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage --watchAll=false
```

### Smart Contract Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test test/NFTCertificate.test.js

# Run tests with gas reporting
npm run test:gas
```

## Deployment

### Development Deployment

```bash
# Start all services
./run-app.sh

# Start specific service
./run-app.sh backend
./run-app.sh frontend
./run-app.sh smart-contracts
```

### Staging Deployment

```bash
# Deploy to staging
./scripts/deploy-neon.sh deploy -e staging
```

### Production Deployment

```bash
# Deploy to production
./scripts/deploy-neon.sh deploy -e production
```

## Database Management

### Using Neon

```bash
# Set up database
./scripts/setup-neon.sh

# Deploy migrations
./scripts/deploy-neon.sh migrate -e production

# Seed database
./scripts/deploy-neon.sh seed -e development

# Check status
./scripts/deploy-neon.sh status -e production

# Reset database (development only)
./scripts/deploy-neon.sh reset -e development
```

### Database Operations

```bash
# View database in browser
cd backend && npx prisma studio

# Pull schema from database
cd backend && npx prisma db pull

# Push schema to database
cd backend && npx prisma db push

# Reset database
cd backend && npx prisma migrate reset
```

## Security

### Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique secrets
   - Rotate secrets regularly

2. **Database Security**
   - Use SSL connections
   - Implement proper access controls
   - Regular security audits

3. **API Security**
   - Implement rate limiting
   - Use proper authentication
   - Validate all inputs

4. **Smart Contract Security**
   - Follow best practices
   - Use OpenZeppelin libraries
   - Regular security audits

### Security Testing

```bash
# Run security tests
cd backend && npm run test:security

# Run security audit
npm audit

# Run dependency scan
npm audit --audit-level moderate
```

## Monitoring and Debugging

### Logging

```bash
# View backend logs
tail -f logs/backend.log

# View frontend logs
tail -f logs/frontend.log

# View smart contract logs
tail -f logs/smart-contracts.log
```

### Health Checks

```bash
# Check API health
curl http://localhost:3000/api/health

# Check database health
curl http://localhost:3000/api/database/health

# Check service status
./run-app.sh status
```

### Performance Monitoring

- **Backend**: Built-in performance monitoring
- **Database**: Neon provides built-in monitoring
- **Frontend**: React DevTools and performance profiling

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check connection string
   echo $DATABASE_URL
   
   # Test connection
   cd backend && npx prisma db pull
   ```

2. **Port Conflicts**
   ```bash
   # Check port usage
   lsof -i :3000
   lsof -i :3001
   
   # Kill process
   kill -9 <PID>
   ```

3. **Dependency Issues**
   ```bash
   # Clear cache
   npm cache clean --force
   
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

### Getting Help

- **Documentation**: Check this guide and README.md
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Community**: Join our Discord server

## Contributing

### Development Process

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests for new functionality**
5. **Run all tests**
6. **Submit a pull request**

### Code Standards

- **TypeScript**: Use strict mode and proper typing
- **ESLint**: Follow project linting rules
- **Prettier**: Consistent code formatting
- **Tests**: Maintain test coverage
- **Documentation**: Update docs with changes

### Commit Messages

Use conventional commit messages:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: code style changes
refactor: code refactoring
test: add tests
chore: build process changes
```

## Resources

### Documentation
- [Neon Documentation](https://neon.tech/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://reactjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)

### Tools
- [Neon Console](https://console.neon.tech)
- [Prisma Studio](https://www.prisma.io/studio)
- [React DevTools](https://reactjs.org/blog/2019/08/15/new-react-devtools.html)
- [Hardhat Network](https://hardhat.org/hardhat-network)

### Community
- [GitHub Repository](https://github.com/your-org/web3-dream)
- [Discord Server](https://discord.gg/tracechain)
- [Twitter](https://twitter.com/tracechain)

---

**Happy coding!** 🚀

For questions or support, please reach out to the development team.
