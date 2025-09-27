import * as stytch from 'stytch';

// Initialize Stytch client
const stytchClient = new stytch.Client({
  project_id: process.env.STYTCH_PROJECT_ID!,
  secret: process.env.STYTCH_SECRET!,
  env: process.env.STYTCH_ENVIRONMENT === 'live' ? stytch.envs.live : stytch.envs.test,
});

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

export class StytchService {
  /**
   * Send magic link to user's email
   */
  static async sendMagicLink(email: string, redirectUrl?: string): Promise<{ success: boolean; message: string }> {
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
    } catch (error: any) {
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
  static async authenticateMagicLink(token: string): Promise<{ success: boolean; session?: StytchSession; error?: string }> {
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
    } catch (error: any) {
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
  static async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await stytchClient.otps.email.loginOrCreate({
        email,
        expiration_minutes: 10,
      });

      return {
        success: true,
        message: 'OTP sent successfully'
      };
    } catch (error: any) {
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
  static async authenticateOTP(email: string, code: string): Promise<{ success: boolean; session?: StytchSession; error?: string }> {
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
    } catch (error: any) {
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
  static async authenticateSession(sessionToken: string): Promise<{ success: boolean; user?: StytchUser; error?: string }> {
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
    } catch (error: any) {
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
  static async authenticateSessionJWT(sessionJWT: string): Promise<{ success: boolean; user?: StytchUser; error?: string }> {
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
    } catch (error: any) {
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
  static async revokeSession(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      await stytchClient.sessions.revoke({
        session_token: sessionToken,
      });

      return {
        success: true
      };
    } catch (error: any) {
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
  static async getUser(userId: string): Promise<{ success: boolean; user?: StytchUser; error?: string }> {
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
    } catch (error: any) {
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
  static async updateUser(userId: string, updates: Partial<StytchUser>): Promise<{ success: boolean; user?: StytchUser; error?: string }> {
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
    } catch (error: any) {
      console.error('Stytch update user error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update user'
      };
    }
  }
}

export default StytchService;
