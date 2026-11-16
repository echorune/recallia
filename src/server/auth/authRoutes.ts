import { Router } from 'express';
import { AuthService } from './authService';
import { requireAuth, AuthenticatedRequest, extractToken } from './authMiddleware';

export const authRouter = Router();

/**
 * Register student
 */
authRouter.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { user, session } = AuthService.register(name, email, password);
    res.status(201).json({
      success: true,
      user,
      session,
      message: 'Account successfully created. Welcome to Recallia!',
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Registration failed',
      code: 'REGISTRATION_ERROR',
    });
  }
});

/**
 * Log in student
 */
authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, session } = AuthService.login(email, password);
    res.status(200).json({
      success: true,
      user,
      session,
      message: 'Logged in successfully.',
    });
  } catch (error: any) {
    res.status(401).json({
      error: error.message || 'Invalid credentials',
      code: 'LOGIN_FAILED',
    });
  }
});

/**
 * Log out student
 */
authRouter.post('/logout', (req, res) => {
  const token = extractToken(req);
  if (token) {
    AuthService.logout(token);
  }
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * Get current authenticated user profile and session info
 */
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
    session: req.session,
  });
});

/**
 * Request password reset token
 */
authRouter.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const resetData = AuthService.requestPasswordReset(email);
    if (!resetData) {
      // Return message without leaking user existence
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset token has been generated.',
      });
      return;
    }

    // In a production app with SMTP, this would be emailed. For local verification and app UI,
    // we provide the token so the student can verify the reset workflow directly in the interface.
    res.status(200).json({
      success: true,
      message: 'Password reset token generated.',
      resetToken: resetData.token,
      expiresAt: resetData.expiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process password reset request.' });
  }
});

/**
 * Reset password with token
 */
authRouter.post('/reset-password', (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    AuthService.resetPassword(resetToken, newPassword);
    res.status(200).json({
      success: true,
      message: 'Your password has been successfully updated. Please log in with your new credentials.',
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Password reset failed.',
      code: 'RESET_FAILED',
    });
  }
});
