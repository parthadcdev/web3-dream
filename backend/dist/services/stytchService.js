"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StytchService = void 0;
const stytch = __importStar(require("stytch"));
// Initialize Stytch client
const stytchClient = new stytch.Client({
    project_id: process.env.STYTCH_PROJECT_ID,
    secret: process.env.STYTCH_SECRET,
    env: process.env.STYTCH_ENVIRONMENT === 'live' ? stytch.envs.live : stytch.envs.test,
});
class StytchService {
    /**
     * Send magic link to user's email
     */
    static async sendMagicLink(email, redirectUrl) {
        try {
            const response = await stytchClient.magicLinks.email.loginOrCreate({
                email,
                login_magic_link_url: redirectUrl || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback?type=magic_link`,
                signup_magic_link_url: redirectUrl || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback?type=magic_link`,
            });
            return {
                success: true,
                message: 'Magic link sent successfully'
            };
        }
        catch (error) {
            console.error('Stytch magic link error:', error);
            return {
                success: false,
                message: error.message || 'Failed to send magic link'
            };
        }
    }
    /**
     * Authenticate magic link token
     */
    static async authenticateMagicLink(token) {
        try {
            const response = await stytchClient.magicLinks.authenticate({
                magic_links_token: token,
            });
            return {
                success: true,
                session: {
                    session_token: response.session_token,
                    session_jwt: response.session_jwt,
                    user: {
                        user_id: response.user.user_id,
                        email: response.user.emails?.[0]?.email || '',
                        name: response.user.name,
                        created_at: response.user.created_at || '',
                        status: response.user.status || ''
                    },
                    expires_at: response.session?.expires_at || '',
                }
            };
        }
        catch (error) {
            console.error('Stytch magic link authentication error:', error);
            return {
                success: false,
                error: error.message || 'Invalid magic link'
            };
        }
    }
    /**
     * Send OTP to user's email
     */
    static async sendOTP(email) {
        try {
            const response = await stytchClient.otps.email.loginOrCreate({
                email,
                expiration_minutes: 10,
            });
            return {
                success: true,
                message: 'OTP sent successfully'
            };
        }
        catch (error) {
            console.error('Stytch OTP error:', error);
            return {
                success: false,
                message: error.message || 'Failed to send OTP'
            };
        }
    }
    /**
     * Authenticate OTP
     */
    static async authenticateOTP(email, code) {
        try {
            const response = await stytchClient.otps.authenticate({
                method_id: email,
                code,
            });
            return {
                success: true,
                session: {
                    session_token: response.session_token,
                    session_jwt: response.session_jwt,
                    user: {
                        user_id: response.user.user_id,
                        email: response.user.emails?.[0]?.email || '',
                        name: response.user.name,
                        created_at: response.user.created_at || '',
                        status: response.user.status || ''
                    },
                    expires_at: response.session?.expires_at || '',
                }
            };
        }
        catch (error) {
            console.error('Stytch OTP authentication error:', error);
            return {
                success: false,
                error: error.message || 'Invalid OTP'
            };
        }
    }
    /**
     * Authenticate session token
     */
    static async authenticateSession(sessionToken) {
        try {
            const response = await stytchClient.sessions.authenticate({
                session_token: sessionToken,
            });
            return {
                success: true,
                user: {
                    user_id: response.user.user_id,
                    email: response.user.emails[0]?.email || '',
                    name: response.user.name,
                    created_at: response.user.created_at,
                    status: response.user.status
                }
            };
        }
        catch (error) {
            console.error('Stytch session authentication error:', error);
            return {
                success: false,
                error: error.message || 'Invalid session'
            };
        }
    }
    /**
     * Authenticate session JWT
     */
    static async authenticateSessionJWT(sessionJWT) {
        try {
            const response = await stytchClient.sessions.authenticateJwt({
                session_jwt: sessionJWT,
            });
            return {
                success: true,
                user: {
                    user_id: response.user.user_id,
                    email: response.user.emails[0]?.email || '',
                    name: response.user.name,
                    created_at: response.user.created_at,
                    status: response.user.status
                }
            };
        }
        catch (error) {
            console.error('Stytch JWT authentication error:', error);
            return {
                success: false,
                error: error.message || 'Invalid JWT'
            };
        }
    }
    /**
     * Revoke session
     */
    static async revokeSession(sessionToken) {
        try {
            await stytchClient.sessions.revoke({
                session_token: sessionToken,
            });
            return {
                success: true
            };
        }
        catch (error) {
            console.error('Stytch session revocation error:', error);
            return {
                success: false,
                error: error.message || 'Failed to revoke session'
            };
        }
    }
    /**
     * Get user by ID
     */
    static async getUser(userId) {
        try {
            const response = await stytchClient.users.get({
                user_id: userId,
            });
            return {
                success: true,
                user: {
                    user_id: response.user.user_id,
                    email: response.user.emails[0]?.email || '',
                    name: response.user.name,
                    created_at: response.user.created_at,
                    status: response.user.status
                }
            };
        }
        catch (error) {
            console.error('Stytch get user error:', error);
            return {
                success: false,
                error: error.message || 'User not found'
            };
        }
    }
    /**
     * Update user
     */
    static async updateUser(userId, updates) {
        try {
            const response = await stytchClient.users.update({
                user_id: userId,
                name: updates.name,
            });
            return {
                success: true,
                user: {
                    user_id: response.user.user_id,
                    email: response.user.emails[0]?.email || '',
                    name: response.user.name,
                    created_at: response.user.created_at,
                    status: response.user.status
                }
            };
        }
        catch (error) {
            console.error('Stytch update user error:', error);
            return {
                success: false,
                error: error.message || 'Failed to update user'
            };
        }
    }
}
exports.StytchService = StytchService;
exports.default = StytchService;
//# sourceMappingURL=stytchService.js.map