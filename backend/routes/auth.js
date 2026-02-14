const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Register new user
router.post('/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: errors.array()[0].msg,
          errors: errors.array()
        });
      }

      const { fullName, email, username, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'USER_EXISTS',
          message: existingUser.email === email 
            ? 'Email already registered' 
            : 'Username already taken'
        });
      }

      // Create new user (not approved by default)
      const user = new User({
        fullName,
        email,
        username,
        passwordHash: password, // Will be hashed by pre-save hook
        role: 'user',
        isApproved: false
      });

      await user.save();

      // Create session
      req.session.userId = user._id;
      req.session.userRole = user.role;

      // Log registration
      await req.logActivity('REGISTER', {
        description: 'User registered successfully',
        details: {
          email: user.email,
          username: user.username,
          fullName: user.fullName
        }
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful. Your account is pending admin approval.',
        data: {
          userId: user._id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          isApproved: user.isApproved,
          role: user.role
        },
        redirectTo: '/pending-approval'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error creating account. Please try again.'
      });
    }
  }
);

// Login
router.post('/login',
  [
    body('emailOrUsername').trim().notEmpty().withMessage('Email or username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: errors.array()[0].msg
        });
      }

      const { emailOrUsername, password } = req.body;

      // Find user by email or username
      const user = await User.findOne({
        $or: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername }
        ]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email/username or password'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email/username or password'
        });
      }

      // Update last login
      await user.updateLastLogin();

      // Create session
      req.session.userId = user._id;
      req.session.userRole = user.role;

      // Log successful login
      await req.logActivity('LOGIN', {
        description: 'User logged in successfully',
        details: {
          email: user.email,
          username: user.username
        }
      });

      // Determine redirect based on approval status
      let redirectTo = '/trading';
      if (!user.isApproved) {
        redirectTo = '/pending-approval';
      } else if (user.role === 'admin') {
        redirectTo = '/admin';
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          userId: user._id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          isApproved: user.isApproved,
          role: user.role,
          lastLogin: user.lastLogin
        },
        redirectTo
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error logging in. Please try again.'
      });
    }
  }
);

// Logout
router.post('/logout', async (req, res) => {
  try {
    // Log logout before destroying session
    if (req.session?.userId) {
      await req.logActivity('LOGOUT', {
        description: 'User logged out'
      });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          success: false,
          error: 'SERVER_ERROR',
          message: 'Error logging out'
        });
      }

      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Logged out successfully',
        redirectTo: '/login'
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error logging out'
    });
  }
});

// Check authentication status
router.get('/status', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.json({
        success: true,
        authenticated: false,
        data: null
      });
    }

    const user = await User.findById(req.session.userId).select('-passwordHash');
    
    if (!user) {
      req.session.destroy();
      return res.json({
        success: true,
        authenticated: false,
        data: null
      });
    }

    res.json({
      success: true,
      authenticated: true,
      data: {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        isApproved: user.isApproved,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error checking authentication status'
    });
  }
});

// Update user profile
router.patch('/profile', requireAuth,
  [
    body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
    body('phone').optional().trim()
  ],
  async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          error: 'NOT_AUTHENTICATED',
          message: 'Please login to update profile'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: errors.array()[0].msg
        });
      }

      const { fullName, phone } = req.body;
      const updateData = {};

      if (fullName) updateData.fullName = fullName;
      if (phone !== undefined) updateData.phone = phone;

      const user = await User.findByIdAndUpdate(
        req.session.userId,
        updateData,
        { new: true }
      ).select('-passwordHash');

      // Log profile update
      await req.logActivity('PROFILE_UPDATE', {
        description: 'User profile updated',
        details: updateData
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          userId: user._id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          phone: user.phone || '',
          isApproved: user.isApproved
        }
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error updating profile'
      });
    }
  }
);

// Change password
router.post('/change-password', requireAuth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
  ],
  async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          error: 'NOT_AUTHENTICATED',
          message: 'Please login to change password'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: errors.array()[0].msg
        });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Verify passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'PASSWORD_MISMATCH',
          message: 'New passwords do not match'
        });
      }

      const user = await User.findById(req.session.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_PASSWORD',
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      await user.save();

      // Log password change
      await req.logActivity('PASSWORD_CHANGE', {
        description: 'User changed their password'
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error changing password'
      });
    }
  }
);

// Forgot password - send reset code to email
router.post('/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: errors.array()[0].msg
        });
      }

      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if email exists (security)
        return res.json({
          success: true,
          message: 'If an account exists with this email, a reset code will be sent.'
        });
      }

      // Generate OTP (6 digits)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in memory (in production, use Redis or database with expiry)
      // For now, we'll store it in user object with 15-minute expiry
      user.resetOtp = otp;
      user.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      // In production, send via email service (SendGrid, Mailgun, etc)
      console.log(`Reset code for ${email}: ${otp}`);

      res.json({
        success: true,
        message: 'Reset code sent to email',
        // Remove this in production - only for testing
        data: {
          email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
          otpForTesting: otp
        }
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error processing password reset request'
      });
    }
  }
);

// Verify reset OTP
router.post('/verify-reset-otp',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: errors.array()[0].msg
        });
      }

      const { email, otp } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      }

      // Check OTP
      if (!user.resetOtp || user.resetOtp !== otp) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_OTP',
          message: 'Invalid OTP'
        });
      }

      // Check OTP expiry (15 minutes)
      if (new Date() > user.resetOtpExpiry) {
        user.resetOtp = null;
        user.resetOtpExpiry = null;
        await user.save();
        return res.status(400).json({
          success: false,
          error: 'OTP_EXPIRED',
          message: 'OTP has expired. Please request a new one.'
        });
      }

      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          resetToken: Buffer.from(`${email}:${Date.now()}`).toString('base64')
        }
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error verifying OTP'
      });
    }
  }
);

// Reset password with OTP
router.post('/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: errors.array()[0].msg
        });
      }

      const { email, otp, newPassword, confirmPassword } = req.body;

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'PASSWORD_MISMATCH',
          message: 'Passwords do not match'
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      }

      // Verify OTP
      if (!user.resetOtp || user.resetOtp !== otp) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_OTP',
          message: 'Invalid OTP'
        });
      }

      // Check expiry
      if (new Date() > user.resetOtpExpiry) {
        user.resetOtp = null;
        user.resetOtpExpiry = null;
        await user.save();
        return res.status(400).json({
          success: false,
          error: 'OTP_EXPIRED',
          message: 'OTP has expired'
        });
      }

      // Update password
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      await user.save();

      // Log password reset
      await req.logActivity('PASSWORD_RESET', {
        description: 'User reset their password'
      });

      res.json({
        success: true,
        message: 'Password reset successfully. You can now login with your new password.'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error resetting password'
      });
    }
  }
);

module.exports = router;
