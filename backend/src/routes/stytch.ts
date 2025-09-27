import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import StytchService from '../services/stytchService';
import UserService from '../services/userService';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Validation middleware
const validateEmail = body('email').isEmail().normalizeEmail();
const validateOTP = body('code').isLength({ min: 6, max: 6 }).isNumeric();
const validateToken = body('token').notEmpty();

/**
 * Send magic link to user's email
 * POST /api/stytch/magic-link
 */
router.post('/magic-link', validateEmail, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { email } = req.body;
  const { redirectUrl } = req.query;

  const result = await StytchService.sendMagicLink(email, redirectUrl as string);

  if (result.success) {
    res.json({
      success: true,
      message: result.message
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.message
    });
  }
}));

/**
 * Authenticate magic link token
 * POST /api/stytch/magic-link/authenticate
 */
router.post('/magic-link/authenticate', validateToken, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { token } = req.body;

  const result = await StytchService.authenticateMagicLink(token);

  if (result.success && result.session) {
    // Get or create user in our database
    const userResult = await UserService.getOrCreateStytchUser(result.session.user);
    
    if (!userResult.success || !userResult.user) {
      return res.status(500).json({
        success: false,
        error: userResult.error || 'Failed to create user account'
      });
    }

    // Generate our own JWT token for the user
    const jwtToken = jwt.sign(
      {
        id: userResult.user.id,
        email: userResult.user.email,
        stytch_user_id: result.session.user.user_id,
        role: userResult.user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Authentication successful',
      token: jwtToken,
      user: {
        id: userResult.user.id,
        email: userResult.user.email,
        firstName: userResult.user.firstName,
        lastName: userResult.user.lastName,
        role: userResult.user.role
      },
      stytch_session: {
        session_token: result.session.session_token,
        session_jwt: result.session.session_jwt,
        expires_at: result.session.expires_at
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: result.error || 'Authentication failed'
    });
  }
}));

/**
 * Send OTP to user's email
 * POST /api/stytch/otp
 */
router.post('/otp', validateEmail, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { email } = req.body;

  const result = await StytchService.sendOTP(email);

  if (result.success) {
    res.json({
      success: true,
      message: result.message
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.message
    });
  }
}));

/**
 * Authenticate OTP
 * POST /api/stytch/otp/authenticate
 */
router.post('/otp/authenticate', [validateEmail, validateOTP], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { email, code } = req.body;

  const result = await StytchService.authenticateOTP(email, code);

  if (result.success && result.session) {
    // Get or create user in our database
    const userResult = await UserService.getOrCreateStytchUser(result.session.user);
    
    if (!userResult.success || !userResult.user) {
      return res.status(500).json({
        success: false,
        error: userResult.error || 'Failed to create user account'
      });
    }

    // Generate our own JWT token for the user
    const jwtToken = jwt.sign(
      {
        id: userResult.user.id,
        email: userResult.user.email,
        stytch_user_id: result.session.user.user_id,
        role: userResult.user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Authentication successful',
      token: jwtToken,
      user: {
        id: userResult.user.id,
        email: userResult.user.email,
        firstName: userResult.user.firstName,
        lastName: userResult.user.lastName,
        role: userResult.user.role
      },
      stytch_session: {
        session_token: result.session.session_token,
        session_jwt: result.session.session_jwt,
        expires_at: result.session.expires_at
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: result.error || 'Authentication failed'
    });
  }
}));

/**
 * Authenticate session token
 * POST /api/stytch/session/authenticate
 */
router.post('/session/authenticate', validateToken, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { token } = req.body;

  const result = await StytchService.authenticateSession(token);

  if (result.success && result.user) {
    res.json({
      success: true,
      user: {
        id: result.user.user_id,
        email: result.user.email,
        name: result.user.name,
        role: 'user'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: result.error || 'Session authentication failed'
    });
  }
}));

/**
 * Revoke session
 * POST /api/stytch/session/revoke
 */
router.post('/session/revoke', validateToken, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { token } = req.body;

  const result = await StytchService.revokeSession(token);

  if (result.success) {
    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error || 'Failed to revoke session'
    });
  }
}));

/**
 * Get user profile
 * GET /api/stytch/user/:userId
 */
router.get('/user/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  const result = await StytchService.getUser(userId);

  if (result.success && result.user) {
    res.json({
      success: true,
      user: {
        id: result.user.user_id,
        email: result.user.email,
        name: result.user.name,
        created_at: result.user.created_at,
        status: result.user.status
      }
    });
  } else {
    res.status(404).json({
      success: false,
      error: result.error || 'User not found'
    });
  }
}));

/**
 * Update user profile
 * PUT /api/stytch/user/:userId
 */
router.put('/user/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  const result = await StytchService.updateUser(userId, { name });

  if (result.success && result.user) {
    res.json({
      success: true,
      user: {
        id: result.user.user_id,
        email: result.user.email,
        name: result.user.name,
        created_at: result.user.created_at,
        status: result.user.status
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error || 'Failed to update user'
    });
  }
}));

export default router;
