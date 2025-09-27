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
export declare class AuthService {
    /**
     * Hash password using bcrypt
     */
    static hashPassword(password: string): Promise<string>;
    /**
     * Verify password against hash
     */
    static verifyPassword(password: string, hash: string): Promise<boolean>;
    /**
     * Validate password strength
     */
    static validatePasswordStrength(password: string): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Generate JWT token
     */
    static generateToken(user: any): string;
    /**
     * Register a new user
     */
    static registerUser(data: RegisterUserData): Promise<AuthResponse>;
    /**
     * Login user with email and password
     * Note: This requires password field to be added to User model
     */
    static loginUser(credentials: LoginCredentials): Promise<AuthResponse>;
    /**
     * Verify JWT token
     */
    static verifyToken(token: string): Promise<{
        success: boolean;
        user?: any;
        error?: string;
    }>;
    /**
     * Log security event
     */
    static logSecurityEvent(eventType: string, severity: string, description: string, metadata?: any, ipAddress?: string, userAgent?: string): Promise<void>;
}
export default AuthService;
//# sourceMappingURL=authService.d.ts.map