export interface StytchUser {
    user_id: string;
    email: string;
    name?: {
        first_name?: string;
        last_name?: string;
    };
    created_at: string;
    status: string;
}
export interface StytchSession {
    session_token: string;
    session_jwt: string;
    user: StytchUser;
    expires_at: string;
}
export declare class StytchService {
    /**
     * Send magic link to user's email
     */
    static sendMagicLink(email: string, redirectUrl?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Authenticate magic link token
     */
    static authenticateMagicLink(token: string): Promise<{
        success: boolean;
        session?: StytchSession;
        error?: string;
    }>;
    /**
     * Send OTP to user's email
     */
    static sendOTP(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Authenticate OTP
     */
    static authenticateOTP(email: string, code: string): Promise<{
        success: boolean;
        session?: StytchSession;
        error?: string;
    }>;
    /**
     * Authenticate session token
     */
    static authenticateSession(sessionToken: string): Promise<{
        success: boolean;
        user?: StytchUser;
        error?: string;
    }>;
    /**
     * Authenticate session JWT
     */
    static authenticateSessionJWT(sessionJWT: string): Promise<{
        success: boolean;
        user?: StytchUser;
        error?: string;
    }>;
    /**
     * Revoke session
     */
    static revokeSession(sessionToken: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get user by ID
     */
    static getUser(userId: string): Promise<{
        success: boolean;
        user?: StytchUser;
        error?: string;
    }>;
    /**
     * Update user
     */
    static updateUser(userId: string, updates: Partial<StytchUser>): Promise<{
        success: boolean;
        user?: StytchUser;
        error?: string;
    }>;
}
export default StytchService;
//# sourceMappingURL=stytchService.d.ts.map