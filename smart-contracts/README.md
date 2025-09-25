# TraceChain Smart Contracts

A comprehensive suite of smart contracts for decentralized supply chain traceability with $TRACE utility token integration, compliance checking, and automated payments.

## 🏗️ Architecture Overview

The TraceChain smart contract system consists of several interconnected contracts that work together to provide end-to-end supply chain traceability:

```
┌─────────────────────────────────────────────────────────┐
│                   Core Contracts                       │
├─────────────────────────────────────────────────────────┤
│  TraceToken           │  ProductRegistry               │
│  RewardsDistributor   │  NFTCertificate                │
│  ComplianceContract   │  PaymentContract               │
│  TraceAccessControl   │  ProductFactory                │
│  NFTFactory           │  ComplianceFactory             │
└─────────────────────────────────────────────────────────┘
```

## 📋 Contract Descriptions

### Core Contracts

#### 1. **TraceToken** (`TraceToken.sol`)
- **Purpose**: ERC-20 utility token with staking, rewards, and governance features
- **Features**:
  - Token distribution and rewards system
  - Staking mechanism with 5% APY
  - Vesting schedules for team and investors
  - Anti-gaming mechanisms
  - Pausable functionality

#### 2. **ProductRegistry** (`ProductRegistry.sol`)
- **Purpose**: Central registry for all products in the system
- **Features**:
  - Product registration and management
  - Stakeholder management
  - Checkpoint tracking
  - Batch number validation
  - Metadata URI storage

#### 3. **NFTCertificate** (`NFTCertificate.sol`)
- **Purpose**: NFT-based product certificates for authenticity
- **Features**:
  - Certificate minting and management
  - Verification by token ID or QR code
  - Expiry date validation
  - Certificate invalidation
  - Metadata URI support

#### 4. **ComplianceContract** (`ComplianceContract.sol`)
- **Purpose**: Automated compliance checking and certification
- **Features**:
  - Industry-standard compliance rules
  - Automated compliance checking
  - Evidence management
  - Confidence scoring
  - Multi-standard support (ISO, FDA, CE, etc.)

#### 5. **PaymentContract** (`PaymentContract.sol`)
- **Purpose**: Automated payments and escrow for supply chain transactions
- **Features**:
  - Escrow payments
  - Milestone-based payments
  - Dispute resolution
  - Multi-signature support
  - Platform fee management

#### 6. **TraceAccessControl** (`AccessControl.sol`)
- **Purpose**: Comprehensive access control system
- **Features**:
  - Role-based permissions
  - Multi-signature requirements
  - Activity tracking and limits
  - Blacklist management
  - Emergency controls

### Factory Contracts

#### 7. **ProductFactory** (`ProductFactory.sol`)
- **Purpose**: Deploy and manage ProductRegistry instances
- **Features**:
  - Scalable registry deployment
  - Organization management
  - Registry statistics
  - Fee management

#### 8. **NFTFactory** (`NFTFactory.sol`)
- **Purpose**: Deploy and manage NFTCertificate instances
- **Features**:
  - Certificate contract deployment
  - Type management
  - Statistics tracking
  - Fee management

#### 9. **ComplianceFactory** (`ComplianceFactory.sol`)
- **Purpose**: Deploy and manage ComplianceContract instances
- **Features**:
  - Industry-specific compliance contracts
  - Rule management
  - Statistics tracking
  - Fee management

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Hardhat
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-contracts
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Compile contracts**
   ```bash
   npm run compile
   ```

### Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with gas reporting
npm run test:gas

# Run coverage analysis
npm run test:coverage
```

### Deployment

Deploy all contracts to a network:

```bash
# Deploy to local network
npm run deploy:local

# Deploy to Mumbai testnet
npm run deploy:mumbai

# Deploy to Polygon mainnet
npm run deploy:polygon
```

### Verification

Verify deployed contracts:

```bash
# Verify all contracts
npm run verify:all

# Verify on specific network
npm run verify:mumbai
npm run verify:polygon
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Network Configuration
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
PRIVATE_KEY=your_private_key_here

# API Keys
POLYGONSCAN_API_KEY=your_polygonscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key

# Gas Configuration
REPORT_GAS=true
```

### Network Configuration

The contracts are configured for multiple networks:

- **Hardhat**: Local development
- **Mumbai**: Polygon testnet
- **Polygon**: Polygon mainnet
- **VeChain**: VeChain mainnet (optional)

## 📊 Contract Features

### Token Economics

- **Total Supply**: 1,000,000,000 TRACE tokens
- **Ecosystem Fund**: 200,000,000 TRACE (20%)
- **Team Allocation**: 100,000,000 TRACE (10%)
- **Treasury**: 100,000,000 TRACE (10%)
- **Staking APY**: 5%
- **Minimum Stake**: 1,000 TRACE

### Reward Categories

- **Onboarding**: 100 TRACE
- **First Trace**: 250 TRACE
- **Monthly Usage**: 1 TRACE per 10 items
- **Referral**: 500 TRACE
- **Data Contribution**: 10 TRACE base
- **Quality Improvement**: 50 TRACE
- **Community Engagement**: 25 TRACE

### Compliance Standards

Supported industry standards:
- ISO (International Organization for Standardization)
- FDA (Food and Drug Administration)
- CE (Conformité Européenne)
- GMP (Good Manufacturing Practices)
- HACCP (Hazard Analysis Critical Control Points)
- HALAL
- KOSHER
- FSC (Forest Stewardship Council)
- FAIRTRADE
- BREEAM

## 🔒 Security Features

### Access Control
- Role-based permissions system
- Multi-signature requirements for critical operations
- Activity tracking and daily limits
- Blacklist management
- Emergency pause functionality

### Anti-Gaming Mechanisms
- Minimum action intervals
- Daily operation limits
- Confidence scoring for compliance checks
- Fraud detection algorithms
- Vesting schedules for team tokens

### Gas Optimization
- Batch operations for multiple transactions
- Storage optimization with packed structs
- Efficient event logging
- View functions for data retrieval
- Minimal external calls

## 🧪 Testing

The test suite includes:

### Unit Tests
- Individual contract functionality
- Edge cases and error conditions
- Access control validation
- Gas optimization verification

### Integration Tests
- End-to-end workflows
- Multi-contract interactions
- Performance testing
- Security validation

### Test Coverage
- Comprehensive test coverage
- Gas usage analysis
- Performance benchmarking
- Security audit preparation

## 📈 Performance Metrics

### Gas Usage (Estimated)
- **TraceToken Deployment**: ~2,500,000 gas
- **ProductRegistry Deployment**: ~1,800,000 gas
- **NFTCertificate Deployment**: ~1,200,000 gas
- **ComplianceContract Deployment**: ~2,000,000 gas
- **PaymentContract Deployment**: ~1,500,000 gas

### Transaction Costs (Polygon)
- **Product Registration**: ~0.01 MATIC
- **Checkpoint Addition**: ~0.005 MATIC
- **Certificate Minting**: ~0.02 MATIC
- **Compliance Check**: ~0.01 MATIC
- **Payment Creation**: ~0.015 MATIC

## 🔄 Upgrade Path

The contracts are designed with upgradeability in mind:

1. **Proxy Pattern**: Future contracts can use OpenZeppelin's proxy pattern
2. **Factory Pattern**: New contract versions can be deployed via factories
3. **Migration Scripts**: Automated migration tools for contract updates
4. **Data Preservation**: Critical data is preserved during upgrades

## 📚 API Reference

### TraceToken Functions

```solidity
// Token Management
function distributeReward(address recipient, uint256 amount, string memory category)
function stake(uint256 amount)
function unstake(uint256 amount)
function claimStakingRewards()

// Vesting
function createVestingSchedule(address beneficiary, uint256 amount, uint256 duration, bool revocable)
function releaseVestedTokens(address beneficiary)

// Access Control
function setDistributor(address distributor, bool authorized)
function emergencyPause()
function emergencyUnpause()
```

### ProductRegistry Functions

```solidity
// Product Management
function registerProduct(string memory productName, string memory productType, ...)
function getProduct(uint256 productId)
function deactivateProduct(uint256 productId)

// Checkpoint Management
function addCheckpoint(uint256 productId, string memory status, string memory location, string memory additionalData)
function getCheckpoints(uint256 productId)

// Stakeholder Management
function addStakeholder(uint256 productId, address stakeholder)
function getStakeholderProducts(address stakeholder)
```

### NFTCertificate Functions

```solidity
// Certificate Management
function mintCertificate(address to, uint256 productId, string memory certificateType, ...)
function verifyCertificate(uint256 tokenId)
function verifyByCode(string memory verificationCode)
function invalidateCertificate(uint256 tokenId)

// Metadata
function getCertificate(uint256 tokenId)
function getCertificateByProduct(uint256 productId)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Documentation**: [TraceChain Docs](https://docs.tracechain.com)
- **Discord**: [TraceChain Community](https://discord.gg/tracechain)
- **Email**: support@tracechain.com
- **GitHub Issues**: [Report Issues](https://github.com/tracechain/smart-contracts/issues)

## 🔮 Roadmap

### Phase 1: Core Implementation ✅
- [x] Basic contract deployment
- [x] Token economics
- [x] Product traceability
- [x] Compliance checking
- [x] Payment processing

### Phase 2: Advanced Features 🚧
- [ ] Cross-chain compatibility
- [ ] Advanced analytics
- [ ] Machine learning integration
- [ ] Mobile SDK
- [ ] API marketplace

### Phase 3: Ecosystem Expansion 📋
- [ ] DAO governance
- [ ] Developer grants
- [ ] Partnership integrations
- [ ] Enterprise features
- [ ] Global expansion

---

**Built with ❤️ by the TraceChain Team**
