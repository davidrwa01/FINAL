  const User = require('../models/User');
  const Subscription = require('../models/Subscription');
  const UsageLog = require('../models/UsageLog');

  // Middleware: Require user to be logged in
  const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
        redirectTo: '/login'
      });
    }
    next();
  };

  // Middleware: Require user to be admin
  const requireAdmin = async (req, res, next) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Admin authentication required'
        });
      }

      const user = await User.findById(req.session.userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('requireAdmin middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error verifying admin access'
      });
    }
  };

  // Middleware: Require user to be admin-approved
  const requireAdminApproved = async (req, res, next) => {
    try {
      const user = await User.findById(req.session.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User account not found',
          redirectTo: '/login'
        });
      }

      if (!user.isApproved) {
        return res.status(403).json({
          success: false,
          error: 'NOT_APPROVED',
          message: 'Your account is pending admin approval',
          redirectTo: '/pending-approval'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('requireAdminApproved middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error verifying account approval'
      });
    }
  };

  // Middleware: Require active subscription OR allow free trial
  const requireSubscriptionOrTrial = async (req, res, next) => {
    try {
      const userId = req.session.userId;
      
      // Check for active subscription
      const activeSubscription = await Subscription.findActiveForUser(userId);
      
      if (activeSubscription && activeSubscription.isCurrentlyActive()) {
        req.hasActiveSubscription = true;
        req.subscription = activeSubscription;
        return next();
      }

      // No active subscription - user is on free trial
      req.hasActiveSubscription = false;
      req.onFreeTrial = true;
      next();
    } catch (error) {
      console.error('requireSubscriptionOrTrial middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error verifying subscription status'
      });
    }
  };

  // Middleware: Enforce daily trial limit (default: 2 signals/day)
  const enforceDailyTrialLimit = (limit = 2) => {
    return async (req, res, next) => {
      try {
        // If user has active subscription, skip trial limit check
        if (req.hasActiveSubscription) {
          return next();
        }

        const userId = req.session.userId;
        
        // Check if user has exceeded daily limit
        const exceeded = await UsageLog.hasExceededDailyLimit(userId, limit);
        
        if (exceeded) {
          const remaining = await UsageLog.getRemainingSignals(userId, limit);
          
          return res.status(403).json({
            success: false,
            error: 'TRIAL_LIMIT_EXCEEDED',
            message: `Free trial limit exceeded. You can generate ${limit} signals per day.`,
            data: {
              dailyLimit: limit,
              remaining: remaining,
              message: 'Upgrade to a subscription for unlimited signals'
            },
            redirectTo: '/subscribe'
          });
        }

        // Store limit info for later use
        req.trialLimit = limit;
        req.remainingSignals = await UsageLog.getRemainingSignals(userId, limit);
        
        next();
      } catch (error) {
        console.error('enforceDailyTrialLimit middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'SERVER_ERROR',
          message: 'Error checking trial limits'
        });
      }
    };
  };

  // Middleware: Log signal usage (call after signal generation)
  const logSignalUsage = async (req, res, next) => {
    try {
      // Only log if user is on free trial (not subscribed)
      if (!req.hasActiveSubscription) {
        const metadata = {
          symbol: req.body.symbol || req.query.symbol,
          timeframe: req.body.timeframe || req.query.timeframe,
          signalType: req.body.signalType,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        };

        await UsageLog.logSignal(req.session.userId, metadata);
      }
      
      next();
    } catch (error) {
      console.error('logSignalUsage middleware error:', error);
      // Don't block the request if logging fails
      next();
    }
  };

  // Middleware: Attach user info to request
  const attachUserInfo = async (req, res, next) => {
    try {
      if (req.session && req.session.userId) {
        const user = await User.findById(req.session.userId).select('-passwordHash');
        if (user) {
          req.user = user;
        }
      }
      next();
    } catch (error) {
      console.error('attachUserInfo middleware error:', error);
      next();
    }
  };

  module.exports = {
    requireAuth,
    requireAdmin,
    requireAdminApproved,
    requireSubscriptionOrTrial,
    enforceDailyTrialLimit,
    logSignalUsage,
    attachUserInfo
  };
