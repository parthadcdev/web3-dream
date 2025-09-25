# Security Framework and Best Practices

## 1. Security Architecture Overview

### Zero-Trust Security Model
The platform implements a zero-trust security model where no entity is inherently trusted, and verification is required for every access request.

```
┌─────────────────────────────────────────────────────────┐
│                   Security Layers                      │
├─────────────────────────────────────────────────────────┤
│  Application Security   │  Network Security            │
│  • Authentication       │  • DDoS Protection           │
│  • Authorization        │  • WAF Rules                 │
│  • Input Validation     │  • Rate Limiting             │
│  • Session Management   │  • VPN Access                │
├─────────────────────────────────────────────────────────┤
│  Data Security          │  Infrastructure Security     │
│  • Encryption at Rest   │  • Container Security        │
│  • Encryption in Transit│  • Kubernetes Security       │
│  • Key Management       │  • Secret Management         │
│  • Data Classification  │  • Network Segmentation      │
├─────────────────────────────────────────────────────────┤
│  Blockchain Security    │  IoT Security                │
│  • Smart Contract Audit │  • Device Authentication     │
│  • Reentrancy Protection│  • Secure Communication      │
│  • Access Controls      │  • Edge Security             │
│  • Oracle Security      │  • Firmware Updates          │
└─────────────────────────────────────────────────────────┘
```

## 2. Authentication and Authorization

### Multi-Factor Authentication (MFA)
```javascript
// auth.js
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class AuthenticationService {
  constructor() {
    this.secretKey = process.env.JWT_SECRET;
    this.web3Provider = new ethers.providers.Web3Provider(window.ethereum);
  }

  // Web3 Wallet Authentication
  async authenticateWithWallet() {
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get signer
      const signer = this.web3Provider.getSigner();
      const address = await signer.getAddress();
      
      // Create nonce for challenge
      const nonce = Math.floor(Math.random() * 1000000);
      
      // Sign message with wallet
      const message = `Sign this message to authenticate with TraceChain: ${nonce}`;
      const signature = await signer.signMessage(message);
      
      // Verify signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
        // Generate JWT token
        const token = jwt.sign(
          { 
            address, 
            nonce,
            type: 'wallet'
          },
          this.secretKey,
          { expiresIn: '24h' }
        );
        
        return { success: true, token, address };
      }
      
      throw new Error('Signature verification failed');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // TOTP Setup for additional security
  async setupTOTP(userId) {
    const secret = speakeasy.generateSecret({
      name: `TraceChain (${userId})`,
      issuer: 'TraceChain Platform'
    });
    
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    return {
      secret: secret.base32,
      qrCode: qrCodeUrl
    };
  }

  // Verify TOTP
  verifyTOTP(token, secret) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps of variance
    });
  }

  // Session Management
  createSession(user) {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store session in Redis
    redis.setex(`session:${sessionId}`, 86400, JSON.stringify({
      userId: user.id,
      address: user.address,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      mfaVerified: false
    }));
    
    return sessionId;
  }

  // Verify Session
  async verifySession(sessionId) {
    const sessionData = await redis.get(`session:${sessionId}`);
    
    if (!sessionData) {
      throw new Error('Invalid session');
    }
    
    const session = JSON.parse(sessionData);
    
    if (new Date() > new Date(session.expiresAt)) {
      await redis.del(`session:${sessionId}`);
      throw new Error('Session expired');
    }
    
    return session;
  }
}

export default AuthenticationService;
```

### Role-Based Access Control (RBAC)
```javascript
// rbac.js
class RBACService {
  constructor() {
    this.roles = {
      SUPER_ADMIN: {
        permissions: ['*'],
        description: 'Full system access'
      },
      ADMIN: {
        permissions: [
          'user.manage',
          'product.manage',
          'compliance.manage',
          'analytics.view',
          'settings.manage'
        ],
        description: 'Administrative access'
      },
      MANUFACTURER: {
        permissions: [
          'product.create',
          'product.update.own',
          'checkpoint.add',
          'compliance.submit',
          'analytics.view.own'
        ],
        description: 'Manufacturer access'
      },
      DISTRIBUTOR: {
        permissions: [
          'product.view',
          'checkpoint.add',
          'analytics.view.own'
        ],
        description: 'Distributor access'
      },
      RETAILER: {
        permissions: [
          'product.view',
          'checkpoint.add',
          'customer.verify'
        ],
        description: 'Retailer access'
      },
      AUDITOR: {
        permissions: [
          'product.view',
          'compliance.audit',
          'analytics.view'
        ],
        description: 'Auditor access'
      },
      CONSUMER: {
        permissions: [
          'product.verify',
          'feedback.submit'
        ],
        description: 'Consumer access'
      }
    };
  }

  // Check Permission
  hasPermission(userRole, permission) {
    const role = this.roles[userRole];
    
    if (!role) {
      return false;
    }
    
    // Super admin has all permissions
    if (role.permissions.includes('*')) {
      return true;
    }
    
    // Check specific permission
    if (role.permissions.includes(permission)) {
      return true;
    }
    
    // Check wildcard permissions (e.g., 'product.*')
    const wildcardPermission = permission.split('.')[0] + '.*';
    if (role.permissions.includes(wildcardPermission)) {
      return true;
    }
    
    return false;
  }

  // Resource-based Access Control
  canAccessResource(userId, resourceType, resourceId, action) {
    // Check ownership or stakeholder relationship
    switch (resourceType) {
      case 'product':
        return this.canAccessProduct(userId, resourceId, action);
      case 'checkpoint':
        return this.canAccessCheckpoint(userId, resourceId, action);
      default:
        return false;
    }
  }

  async canAccessProduct(userId, productId, action) {
    // Get product stakeholders
    const product = await Product.findById(productId);
    
    if (!product) {
      return false;
    }
    
    // Check if user is a stakeholder
    const isStakeholder = product.stakeholders.includes(userId);
    
    switch (action) {
      case 'view':
        // Anyone can view public product info
        return true;
      case 'update':
        // Only stakeholders can update
        return isStakeholder;
      case 'delete':
        // Only manufacturer or admin can delete
        return product.manufacturer === userId || this.hasRole(userId, 'ADMIN');
      default:
        return false;
    }
  }
}

export default RBACService;
```

## 3. Data Security

### Encryption Implementation
```javascript
// encryption.js
import crypto from 'crypto';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
  }

  // Generate encryption key
  generateKey() {
    return randomBytes(this.keyLength);
  }

  // Encrypt sensitive data
  encrypt(text, key) {
    try {
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedData, key) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      
      const decipher = createDecipheriv(
        this.algorithm, 
        key, 
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Hash sensitive data (one-way)
  hash(data, salt = null) {
    if (!salt) {
      salt = randomBytes(16).toString('hex');
    }
    
    const hash = crypto.createHash('sha256');
    hash.update(data + salt);
    
    return {
      hash: hash.digest('hex'),
      salt
    };
  }

  // Verify hash
  verifyHash(data, hash, salt) {
    const { hash: computedHash } = this.hash(data, salt);
    return computedHash === hash;
  }

  // Encrypt PII data
  async encryptPII(piiData, userId) {
    const key = await this.getUserEncryptionKey(userId);
    const encryptedData = {};
    
    for (const [field, value] of Object.entries(piiData)) {
      if (this.isPIIField(field)) {
        encryptedData[field] = this.encrypt(value, key);
      } else {
        encryptedData[field] = value;
      }
    }
    
    return encryptedData;
  }

  // Get user-specific encryption key
  async getUserEncryptionKey(userId) {
    // Retrieve or generate user-specific encryption key
    const keyStore = await redis.get(`encryption_key:${userId}`);
    
    if (!keyStore) {
      const key = this.generateKey();
      await redis.setex(`encryption_key:${userId}`, 86400 * 30, key.toString('hex')); // 30 days
      return key;
    }
    
    return Buffer.from(keyStore, 'hex');
  }

  // Check if field contains PII
  isPIIField(fieldName) {
    const piiFields = [
      'email', 'phone', 'address', 'ssn', 'passport',
      'patient_id', 'medical_record', 'personal_data'
    ];
    
    return piiFields.some(pii => 
      fieldName.toLowerCase().includes(pii)
    );
  }
}

export default EncryptionService;
```

### Key Management
```javascript
// key-management.js
import AWS from 'aws-sdk';

class KeyManagementService {
  constructor() {
    this.kms = new AWS.KMS({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
  }

  // Create new encryption key
  async createEncryptionKey(keyDescription) {
    try {
      const params = {
        Description: keyDescription,
        KeyUsage: 'ENCRYPT_DECRYPT',
        KeySpec: 'SYMMETRIC_DEFAULT',
        Origin: 'AWS_KMS'
      };
      
      const result = await this.kms.createKey(params).promise();
      
      // Create alias for easier management
      await this.kms.createAlias({
        AliasName: `alias/${keyDescription.replace(/\s+/g, '-').toLowerCase()}`,
        TargetKeyId: result.KeyMetadata.KeyId
      }).promise();
      
      return result.KeyMetadata.KeyId;
    } catch (error) {
      throw new Error(`Key creation failed: ${error.message}`);
    }
  }

  // Encrypt data with KMS
  async encryptWithKMS(plaintext, keyId) {
    try {
      const params = {
        KeyId: keyId,
        Plaintext: Buffer.from(plaintext, 'utf8')
      };
      
      const result = await this.kms.encrypt(params).promise();
      return result.CiphertextBlob.toString('base64');
    } catch (error) {
      throw new Error(`KMS encryption failed: ${error.message}`);
    }
  }

  // Decrypt data with KMS
  async decryptWithKMS(ciphertext, keyId) {
    try {
      const params = {
        CiphertextBlob: Buffer.from(ciphertext, 'base64'),
        KeyId: keyId
      };
      
      const result = await this.kms.decrypt(params).promise();
      return result.Plaintext.toString('utf8');
    } catch (error) {
      throw new Error(`KMS decryption failed: ${error.message}`);
    }
  }

  // Rotate encryption key
  async rotateKey(keyId) {
    try {
      await this.kms.scheduleKeyDeletion({
        KeyId: keyId,
        PendingWindowInDays: 7
      }).promise();
      
      // Create new key
      const newKey = await this.createEncryptionKey(`rotated-key-${Date.now()}`);
      
      return newKey;
    } catch (error) {
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }

  // Generate data encryption key (DEK)
  async generateDEK(keyId) {
    try {
      const params = {
        KeyId: keyId,
        KeySpec: 'AES_256',
        NumberOfBytes: 32
      };
      
      const result = await this.kms.generateDataKey(params).promise();
      
      return {
        plaintext: result.Plaintext,
        ciphertext: result.CiphertextBlob
      };
    } catch (error) {
      throw new Error(`DEK generation failed: ${error.message}`);
    }
  }
}

export default KeyManagementService;
```

## 4. Smart Contract Security

### Security Audit Checklist
```solidity
// SecurityAudit.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SecureProductRegistry is ReentrancyGuard, Pausable, Ownable {
    using SafeMath for uint256;
    
    // State variables
    mapping(uint256 => Product) public products;
    mapping(address => bool) public authorizedStakeholders;
    mapping(address => uint256) public stakeholderLimits;
    
    // Events
    event ProductRegistered(uint256 indexed productId, address indexed manufacturer);
    event StakeholderAuthorized(address indexed stakeholder, uint256 limit);
    
    // Modifiers
    modifier onlyAuthorizedStakeholder() {
        require(authorizedStakeholders[msg.sender], "Unauthorized stakeholder");
        _;
    }
    
    modifier validProductId(uint256 _productId) {
        require(_productId > 0 && _productId < nextProductId, "Invalid product ID");
        _;
    }
    
    modifier withinStakeholderLimit(uint256 _amount) {
        require(
            stakeholderLimits[msg.sender] >= _amount,
            "Exceeds stakeholder limit"
        );
        _;
    }
    
    // Functions with security measures
    function registerProduct(
        string memory _productName,
        string memory _batchNumber,
        uint256 _amount
    ) external 
        onlyAuthorizedStakeholder 
        whenNotPaused 
        nonReentrant 
        withinStakeholderLimit(_amount)
        returns (uint256) 
    {
        require(bytes(_productName).length > 0, "Product name required");
        require(_amount > 0, "Amount must be positive");
        
        uint256 productId = nextProductId++;
        
        products[productId] = Product({
            id: productId,
            name: _productName,
            batchNumber: _batchNumber,
            manufacturer: msg.sender,
            amount: _amount,
            isActive: true,
            createdAt: block.timestamp
        });
        
        // Update stakeholder limit
        stakeholderLimits[msg.sender] = stakeholderLimits[msg.sender].sub(_amount);
        
        emit ProductRegistered(productId, msg.sender);
        
        return productId;
    }
    
    // Emergency functions
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
    
    // Access control
    function authorizeStakeholder(address _stakeholder, uint256 _limit) external onlyOwner {
        require(_stakeholder != address(0), "Invalid address");
        require(_limit > 0, "Limit must be positive");
        
        authorizedStakeholders[_stakeholder] = true;
        stakeholderLimits[_stakeholder] = _limit;
        
        emit StakeholderAuthorized(_stakeholder, _limit);
    }
    
    // View functions
    function getProduct(uint256 _productId) 
        external 
        view 
        validProductId(_productId)
        returns (Product memory) 
    {
        return products[_productId];
    }
    
    // Security check function
    function isSecureState() external view returns (bool) {
        // Check various security conditions
        return !paused() && owner() != address(0);
    }
}
```

### Reentrancy Protection
```solidity
// ReentrancyGuard.sol
contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}
```

## 5. Network Security

### API Security Middleware
```javascript
// security-middleware.js
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, validationResult } from 'express-validator';

class SecurityMiddleware {
  // Rate limiting
  static createRateLimit(windowMs = 15 * 60 * 1000, max = 100) {
    return rateLimit({
      windowMs,
      max,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // Helmet security headers
  static setupHelmet() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "https://api.polygonscan.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          manifestSrc: ["'self'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  // CORS configuration
  static setupCORS() {
    return cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'https://tracechain.com',
          'https://app.tracechain.com',
          'https://verify.tracechain.com'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    });
  }

  // Input validation
  static validateInput() {
    return (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }
      next();
    };
  }

  // SQL injection prevention
  static sanitizeInput(req, res, next) {
    const sanitize = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Remove potentially dangerous characters
          obj[key] = obj[key]
            .replace(/['"]/g, '')
            .replace(/[<>]/g, '')
            .replace(/script/gi, '')
            .replace(/javascript/gi, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };

    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);

    next();
  }

  // XSS protection
  static preventXSS(req, res, next) {
    const escapeHtml = (text) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      
      return text.replace(/[&<>"']/g, (m) => map[m]);
    };

    const escapeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = escapeHtml(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          escapeObject(obj[key]);
        }
      }
    };

    if (req.body) escapeObject(req.body);
    next();
  }
}

export default SecurityMiddleware;
```

### DDoS Protection
```javascript
// ddos-protection.js
import Redis from 'ioredis';

class DDoSProtection {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.thresholds = {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    };
  }

  async checkRateLimit(ip, endpoint) {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const hour = Math.floor(now / 3600000);
    const day = Math.floor(now / 86400000);

    const keys = {
      minute: `rate_limit:${ip}:${endpoint}:${minute}`,
      hour: `rate_limit:${ip}:${endpoint}:${hour}`,
      day: `rate_limit:${ip}:${endpoint}:${day}`
    };

    const pipeline = this.redis.pipeline();
    
    // Increment counters
    pipeline.incr(keys.minute);
    pipeline.expire(keys.minute, 60);
    pipeline.incr(keys.hour);
    pipeline.expire(keys.hour, 3600);
    pipeline.incr(keys.day);
    pipeline.expire(keys.day, 86400);

    const results = await pipeline.exec();
    
    const [minuteCount, hourCount, dayCount] = results.map(r => r[1]);

    // Check thresholds
    if (minuteCount > this.thresholds.requestsPerMinute) {
      await this.blockIP(ip, 'minute', 60);
      return false;
    }

    if (hourCount > this.thresholds.requestsPerHour) {
      await this.blockIP(ip, 'hour', 3600);
      return false;
    }

    if (dayCount > this.thresholds.requestsPerDay) {
      await this.blockIP(ip, 'day', 86400);
      return false;
    }

    return true;
  }

  async blockIP(ip, reason, duration) {
    const blockKey = `blocked:${ip}`;
    await this.redis.setex(blockKey, duration, reason);
    
    console.log(`IP ${ip} blocked for ${reason} (${duration}s)`);
  }

  async isBlocked(ip) {
    const blockKey = `blocked:${ip}`;
    const blocked = await this.redis.get(blockKey);
    return blocked !== null;
  }

  async getRateLimitInfo(ip, endpoint) {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const hour = Math.floor(now / 3600000);
    const day = Math.floor(now / 86400000);

    const keys = {
      minute: `rate_limit:${ip}:${endpoint}:${minute}`,
      hour: `rate_limit:${ip}:${endpoint}:${hour}`,
      day: `rate_limit:${ip}:${endpoint}:${day}`
    };

    const [minuteCount, hourCount, dayCount] = await Promise.all([
      this.redis.get(keys.minute) || 0,
      this.redis.get(keys.hour) || 0,
      this.redis.get(keys.day) || 0
    ]);

    return {
      minute: parseInt(minuteCount),
      hour: parseInt(hourCount),
      day: parseInt(dayCount),
      limits: this.thresholds
    };
  }
}

export default DDoSProtection;
```

## 6. IoT Security

### Device Authentication
```javascript
// iot-security.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

class IoTSecurityService {
  constructor() {
    this.deviceSecrets = new Map();
    this.challengeCache = new Map();
  }

  // Register new IoT device
  async registerDevice(deviceId, deviceType, manufacturer) {
    // Generate device-specific credentials
    const deviceSecret = crypto.randomBytes(32).toString('hex');
    const deviceKey = crypto.createHash('sha256')
      .update(deviceId + deviceSecret)
      .digest('hex');

    // Store device credentials securely
    await this.storeDeviceCredentials(deviceId, {
      secret: deviceSecret,
      key: deviceKey,
      type: deviceType,
      manufacturer,
      registeredAt: new Date().toISOString(),
      status: 'active'
    });

    return {
      deviceId,
      secret: deviceSecret, // Should be sent securely to device
      key: deviceKey
    };
  }

  // Device authentication challenge
  async initiateDeviceAuth(deviceId) {
    const device = await this.getDevice(deviceId);
    
    if (!device || device.status !== 'active') {
      throw new Error('Device not found or inactive');
    }

    // Generate challenge
    const challenge = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    
    // Store challenge temporarily
    this.challengeCache.set(deviceId, {
      challenge,
      timestamp,
      expiresAt: timestamp + 300000 // 5 minutes
    });

    return {
      challenge,
      timestamp,
      expiresIn: 300
    };
  }

  // Verify device response
  async verifyDeviceAuth(deviceId, response) {
    const device = await this.getDevice(deviceId);
    const cachedChallenge = this.challengeCache.get(deviceId);

    if (!cachedChallenge) {
      throw new Error('No active challenge for device');
    }

    if (Date.now() > cachedChallenge.expiresAt) {
      this.challengeCache.delete(deviceId);
      throw new Error('Challenge expired');
    }

    // Verify response using device key
    const expectedResponse = crypto.createHmac('sha256', device.key)
      .update(cachedChallenge.challenge + cachedChallenge.timestamp)
      .digest('hex');

    if (response !== expectedResponse) {
      this.challengeCache.delete(deviceId);
      throw new Error('Invalid device response');
    }

    // Generate device token
    const token = jwt.sign(
      {
        deviceId,
        type: device.type,
        manufacturer: device.manufacturer
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Clean up challenge
    this.challengeCache.delete(deviceId);

    return token;
  }

  // Secure data transmission
  async encryptDeviceData(data, deviceId) {
    const device = await this.getDevice(deviceId);
    const key = Buffer.from(device.key, 'hex');
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      timestamp: Date.now()
    };
  }

  // Decrypt device data
  async decryptDeviceData(encryptedData, deviceId) {
    const device = await this.getDevice(deviceId);
    const key = Buffer.from(device.key, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  // Device firmware verification
  async verifyFirmwareSignature(firmwareData, signature, deviceId) {
    const device = await this.getDevice(deviceId);
    const verifier = crypto.createVerify('sha256');
    
    verifier.update(firmwareData);
    
    // In production, use actual device public key
    const publicKey = await this.getDevicePublicKey(deviceId);
    
    return verifier.verify(publicKey, signature, 'hex');
  }

  async storeDeviceCredentials(deviceId, credentials) {
    // Store in secure database with encryption
    const encrypted = await this.encryptCredentials(credentials);
    await redis.setex(`device:${deviceId}`, 86400 * 365, encrypted); // 1 year
  }

  async getDevice(deviceId) {
    const encrypted = await redis.get(`device:${deviceId}`);
    if (!encrypted) return null;
    
    return await this.decryptCredentials(encrypted);
  }
}

export default IoTSecurityService;
```

## 7. Compliance and Audit

### Audit Logging
```javascript
// audit-logger.js
import winston from 'winston';
import { createHash } from 'crypto';

class AuditLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.errors({ stack: true })
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'audit.log',
          maxsize: 10000000, // 10MB
          maxFiles: 5
        }),
        new winston.transports.Console()
      ]
    });
  }

  // Log user actions
  async logUserAction(userId, action, resource, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      details,
      ip: details.ip,
      userAgent: details.userAgent,
      sessionId: details.sessionId
    };

    // Generate hash for integrity
    const hash = this.generateLogHash(logEntry);
    logEntry.hash = hash;

    // Store in database for tamper-proof audit trail
    await this.storeAuditLog(logEntry);
    
    // Also log to file
    this.logger.info('User Action', logEntry);
  }

  // Log system events
  async logSystemEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'system',
      event,
      details,
      severity: details.severity || 'info'
    };

    const hash = this.generateLogHash(logEntry);
    logEntry.hash = hash;

    await this.storeAuditLog(logEntry);
    
    this.logger.info('System Event', logEntry);
  }

  // Log security events
  async logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'security',
      event,
      details,
      severity: 'warning'
    };

    const hash = this.generateLogHash(logEntry);
    logEntry.hash = hash;

    await this.storeAuditLog(logEntry);
    
    this.logger.warn('Security Event', logEntry);
  }

  // Generate hash for log integrity
  generateLogHash(logEntry) {
    const { hash, ...dataToHash } = logEntry;
    const dataString = JSON.stringify(dataToHash, Object.keys(dataToHash).sort());
    return createHash('sha256').update(dataString).digest('hex');
  }

  // Store audit log in blockchain for immutability
  async storeAuditLog(logEntry) {
    try {
      // Store in database
      await db.auditLogs.create(logEntry);
      
      // Store hash in blockchain for integrity verification
      if (this.blockchainService) {
        await this.blockchainService.storeAuditHash(logEntry.hash, logEntry.timestamp);
      }
    } catch (error) {
      this.logger.error('Failed to store audit log', { error: error.message, logEntry });
    }
  }

  // Verify log integrity
  async verifyLogIntegrity(logId) {
    const logEntry = await db.auditLogs.findById(logId);
    if (!logEntry) return false;

    const { hash, ...dataToHash } = logEntry;
    const computedHash = this.generateLogHash({ ...dataToHash, hash: null });
    
    return hash === computedHash;
  }

  // Get audit trail for compliance
  async getAuditTrail(userId, startDate, endDate) {
    const logs = await db.auditLogs.find({
      userId,
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ timestamp: -1 });

    return logs.map(log => ({
      timestamp: log.timestamp,
      action: log.action,
      resource: log.resource,
      details: log.details,
      verified: this.verifyLogIntegrity(log._id)
    }));
  }
}

export default AuditLogger;
```

## 8. Incident Response

### Security Incident Response Plan
```javascript
// incident-response.js
class IncidentResponseService {
  constructor() {
    this.severityLevels = {
      LOW: { responseTime: 24, escalation: false },
      MEDIUM: { responseTime: 4, escalation: true },
      HIGH: { responseTime: 1, escalation: true },
      CRITICAL: { responseTime: 0.25, escalation: true }
    };
  }

  // Detect security incident
  async detectIncident(type, details) {
    const incident = {
      id: crypto.randomUUID(),
      type,
      severity: this.assessSeverity(type, details),
      status: 'detected',
      details,
      detectedAt: new Date().toISOString(),
      assignedTo: null,
      resolution: null
    };

    // Store incident
    await this.storeIncident(incident);
    
    // Trigger response based on severity
    await this.triggerResponse(incident);
    
    // Notify stakeholders
    await this.notifyStakeholders(incident);

    return incident;
  }

  // Assess incident severity
  assessSeverity(type, details) {
    switch (type) {
      case 'DATA_BREACH':
        return details.recordsAffected > 1000 ? 'HIGH' : 'MEDIUM';
      case 'UNAUTHORIZED_ACCESS':
        return details.adminAccess ? 'HIGH' : 'MEDIUM';
      case 'DDoS_ATTACK':
        return details.duration > 3600 ? 'HIGH' : 'MEDIUM';
      case 'SMART_CONTRACT_EXPLOIT':
        return 'CRITICAL';
      case 'MALWARE_DETECTED':
        return 'HIGH';
      default:
        return 'LOW';
    }
  }

  // Trigger automated response
  async triggerResponse(incident) {
    const response = this.severityLevels[incident.severity];
    
    switch (incident.type) {
      case 'DATA_BREACH':
        await this.containDataBreach(incident);
        break;
      case 'UNAUTHORIZED_ACCESS':
        await this.blockSuspiciousActivity(incident);
        break;
      case 'DDoS_ATTACK':
        await this.activateDDoSMitigation(incident);
        break;
      case 'SMART_CONTRACT_EXPLOIT':
        await this.emergencyPauseContracts(incident);
        break;
    }

    // Schedule escalation if needed
    if (response.escalation) {
      setTimeout(() => {
        this.escalateIncident(incident);
      }, response.responseTime * 60 * 60 * 1000);
    }
  }

  // Contain data breach
  async containDataBreach(incident) {
    // Revoke affected user sessions
    if (incident.details.affectedUsers) {
      for (const userId of incident.details.affectedUsers) {
        await this.revokeUserSessions(userId);
      }
    }

    // Encrypt sensitive data
    await this.encryptAffectedData(incident.details.dataTypes);
    
    // Notify users
    await this.notifyAffectedUsers(incident.details.affectedUsers);
  }

  // Emergency contract pause
  async emergencyPauseContracts(incident) {
    try {
      // Pause all smart contracts
      await this.pauseAllContracts();
      
      // Notify emergency contacts
      await this.notifyEmergencyContacts(incident);
      
      // Create incident report
      await this.createIncidentReport(incident);
    } catch (error) {
      console.error('Failed to pause contracts:', error);
    }
  }

  // Generate incident report
  async generateIncidentReport(incidentId) {
    const incident = await this.getIncident(incidentId);
    
    const report = {
      incidentId: incident.id,
      type: incident.type,
      severity: incident.severity,
      detectedAt: incident.detectedAt,
      resolvedAt: incident.resolvedAt,
      duration: this.calculateDuration(incident.detectedAt, incident.resolvedAt),
      impact: incident.details.impact,
      rootCause: incident.details.rootCause,
      actionsTaken: incident.details.actionsTaken,
      preventionMeasures: incident.details.preventionMeasures
    };

    return report;
  }
}

export default IncidentResponseService;
```

This comprehensive security framework provides multiple layers of protection for the decentralized traceability platform, ensuring data integrity, user privacy, and system resilience against various security threats.
