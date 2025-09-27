import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { securityConfig } from '../config/security';

const prisma = new PrismaClient();

export interface RegisterUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'USER' | 'MANUFACTURER' | 'DISTRIBUTOR' | 'RETAILER' | 'ADMIN';
  walletAddress?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    walletAddress?: string;
  };
  error?: string;
}

export class AuthService {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = securityConfig.password.bcryptRounds;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = securityConfig.password;

    if (password.length < config.minLength) {
      errors.push(`Password must be at least ${config.minLength} characters long`);
    }

    if (password.length > config.maxLength) {
      errors.push(`Password must be no more than ${config.maxLength} characters long`);
    }

    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate JWT token
   */
  static generateToken(user: any): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'tracechain_jwt_secret_key_2025_development',
      { expiresIn: '24h' }
    );
  }

  /**
   * Register a new user
   */
  static async registerUser(data: RegisterUserData): Promise<AuthResponse> {
    try {
      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Check if wallet address is already in use (if provided)
      if (data.walletAddress) {
        const existingWallet = await prisma.user.findUnique({
          where: { walletAddress: data.walletAddress }
        });

        if (existingWallet) {
          return {
            success: false,
            error: 'Wallet address is already associated with another account'
          };
        }
      }

      // Hash password
      const hashedPassword = await this.hashPassword(data.password);

      // Create user in database
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword, // Store hashed password
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          role: data.role || 'USER',
          walletAddress: data.walletAddress || null,
        }
      });

      // Generate JWT token
      const token = this.generateToken(user);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          role: user.role,
          walletAddress: user.walletAddress || undefined
        }
      };
    } catch (error: any) {
      console.error('User registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  }

  /**
   * Login user with email and password
   */
  static async loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: credentials.email }
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check if user has a password (for traditional auth)
      if (!user.password) {
        return {
          success: false,
          error: 'This account uses Stytch authentication. Please use magic link or OTP login.'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Generate JWT token
      const token = this.generateToken(user);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          role: user.role,
          walletAddress: user.walletAddress || undefined
        }
      };
    } catch (error: any) {
      console.error('User login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'tracechain_jwt_secret_key_2025_development'
      ) as any;

      // Get fresh user data from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          role: user.role,
          walletAddress: user.walletAddress || undefined
        }
      };
    } catch (error: any) {
      console.error('Token verification error:', error);
      return {
        success: false,
        error: error.message || 'Invalid token'
      };
    }
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(
    eventType: string,
    severity: string,
    description: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.securityEvent.create({
        data: {
          eventType,
          severity,
          description,
          metadata: metadata || {},
          ipAddress,
          userAgent
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

export default AuthService;
