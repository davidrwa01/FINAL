const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const UsageLog = require('../models/UsageLog');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin);

// ==================== USER MANAGEMENT ====================

// Get all users with approval status
router.get('/users', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    
    const query = { role: 'user' };
    
    // Filter by approval status
    if (status === 'pending') {
      query.isApproved = false;
    } else if (status === 'approved') {
      query.isApproved = true;
    }
    
    // Search by name, email, or username
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching users'
    });
  }
});

// Approve user
router.post('/users/:userId/approve', async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.session.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (user.isApproved) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_APPROVED',
        message: 'User is already approved'
      });
    }

    user.isApproved = true;
    user.approvedBy = adminId;
    user.approvedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'User approved successfully',
      data: {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        isApproved: user.isApproved,
        approvedAt: user.approvedAt
      }
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error approving user'
    });
  }
});

// Reject/Revoke user approval
router.post('/users/:userId/reject', 
  [
    body('reason').optional().trim()
  ],
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      }

      user.isApproved = false;
      user.approvedBy = null;
      user.approvedAt = null;
      user.rejectedReason = reason || '';
      await user.save();

      res.json({
        success: true,
        message: 'User approval revoked',
        data: {
          userId: user._id,
          isApproved: user.isApproved
        }
      });
    } catch (error) {
      console.error('Reject user error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error revoking user approval'
      });
    }
  }
);

// Get user details with subscriptions and usage
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    // Get subscriptions
    const subscriptions = await Subscription.find({ userId })
      .populate('planId')
      .sort({ createdAt: -1 });

    // Get usage stats
    const dailyLimit = parseInt(process.env.FREE_TRIAL_SIGNALS_PER_DAY) || 2;
    const dateKey = UsageLog.getTodayDateKey();
    const todayUsage = await UsageLog.countSignalsForDate(userId, dateKey);

    res.json({
      success: true,
      data: {
        user,
        subscriptions,
        usage: {
          today: todayUsage,
          limit: dailyLimit,
          remaining: Math.max(0, dailyLimit - todayUsage)
        }
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching user details'
    });
  }
});

// ==================== SUBSCRIPTION MANAGEMENT ====================

// Get all subscription requests
router.get('/subscriptions', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) {
      query.status = status.toUpperCase();
    }

    const subscriptions = await Subscription.find(query)
      .populate('userId', 'fullName email username')
      .populate('planId', 'tier priceUSD durationDays')
      .populate('adminReviewedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Subscription.countDocuments(query);

    // Get counts by status
    const pending = await Subscription.countDocuments({ status: 'PENDING' });
    const active = await Subscription.countDocuments({ status: 'ACTIVE' });
    const expired = await Subscription.countDocuments({ status: 'EXPIRED' });
    const rejected = await Subscription.countDocuments({ status: 'REJECTED' });

    res.json({
      success: true,
      data: {
        subscriptions,
        counts: { pending, active, expired, rejected },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching subscriptions'
    });
  }
});

// Approve subscription
router.post('/subscriptions/:subscriptionId/approve', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const adminId = req.session.userId;

    const subscription = await Subscription.findById(subscriptionId).populate('planId');
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'SUBSCRIPTION_NOT_FOUND',
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: 'Only pending subscriptions can be approved'
      });
    }

    // Set subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + subscription.planId.durationDays);

    // Expire any other active subscriptions for this user
    await Subscription.updateMany(
      {
        userId: subscription.userId,
        status: 'ACTIVE',
        _id: { $ne: subscriptionId }
      },
      {
        status: 'EXPIRED'
      }
    );

    subscription.status = 'ACTIVE';
    subscription.startDate = startDate;
    subscription.endDate = endDate;
    subscription.adminReviewedBy = adminId;
    subscription.adminReviewedAt = new Date();
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription approved successfully',
      data: {
        subscriptionId: subscription._id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Approve subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error approving subscription'
    });
  }
});

// Reject subscription
router.post('/subscriptions/:subscriptionId/reject',
  [
    body('reason').trim().notEmpty().withMessage('Rejection reason is required')
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

      const { subscriptionId } = req.params;
      const { reason } = req.body;
      const adminId = req.session.userId;

      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'SUBSCRIPTION_NOT_FOUND',
          message: 'Subscription not found'
        });
      }

      if (subscription.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Only pending subscriptions can be rejected'
        });
      }

      subscription.status = 'REJECTED';
      subscription.rejectionReason = reason;
      subscription.adminReviewedBy = adminId;
      subscription.adminReviewedAt = new Date();
      await subscription.save();

      res.json({
        success: true,
        message: 'Subscription rejected',
        data: {
          subscriptionId: subscription._id,
          status: subscription.status,
          rejectionReason: subscription.rejectionReason
        }
      });
    } catch (error) {
      console.error('Reject subscription error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error rejecting subscription'
      });
    }
  }
);

// ==================== PLAN MANAGEMENT ====================

// Get all plans (including inactive)
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ displayOrder: 1 });
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching plans'
    });
  }
});

// Create or update plan
router.post('/plans',
  [
    body('tier').isIn(['Regular', 'Standard', 'VIP']).withMessage('Invalid tier'),
    body('priceUSD').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('durationDays').isInt({ min: 1 }).withMessage('Duration must be at least 1 day'),
    body('features').isArray().withMessage('Features must be an array'),
    body('isActive').optional().isBoolean()
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

      const { tier, priceUSD, durationDays, features, isActive, displayOrder } = req.body;

      // Check if plan exists
      let plan = await Plan.findOne({ tier });

      if (plan) {
        // Update existing plan
        plan.priceUSD = priceUSD;
        plan.durationDays = durationDays;
        plan.features = features;
        plan.isActive = isActive !== undefined ? isActive : plan.isActive;
        if (displayOrder !== undefined) plan.displayOrder = displayOrder;
        await plan.save();

        res.json({
          success: true,
          message: 'Plan updated successfully',
          data: plan
        });
      } else {
        // Create new plan
        plan = new Plan({
          tier,
          priceUSD,
          durationDays,
          features,
          isActive: isActive !== undefined ? isActive : true,
          displayOrder: displayOrder || 0
        });
        await plan.save();

        res.status(201).json({
          success: true,
          message: 'Plan created successfully',
          data: plan
        });
      }
    } catch (error) {
      console.error('Create/Update plan error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error saving plan'
      });
    }
  }
);

// Toggle plan active status
router.patch('/plans/:planId/toggle', async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'PLAN_NOT_FOUND',
        message: 'Plan not found'
      });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    res.json({
      success: true,
      message: `Plan ${plan.isActive ? 'activated' : 'deactivated'}`,
      data: plan
    });
  } catch (error) {
    console.error('Toggle plan error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error toggling plan status'
    });
  }
});

// ==================== DASHBOARD STATS ====================

router.get('/stats', async (req, res) => {
  try {
    // User stats
    const totalUsers = await User.countDocuments({ role: 'user' });
    const pendingUsers = await User.countDocuments({ role: 'user', isApproved: false });
    const approvedUsers = await User.countDocuments({ role: 'user', isApproved: true });

    // Subscription stats
    const pendingSubscriptions = await Subscription.countDocuments({ status: 'PENDING' });
    const activeSubscriptions = await Subscription.countDocuments({ status: 'ACTIVE' });
    const expiredSubscriptions = await Subscription.countDocuments({ status: 'EXPIRED' });

    // Revenue (from approved subscriptions)
    const revenueResult = await Subscription.aggregate([
      { $match: { status: { $in: ['ACTIVE', 'EXPIRED'] } } },
      { $group: { _id: null, total: { $sum: '$amountUSD' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Recent activity
    const recentSubscriptions = await Subscription.find()
      .populate('userId', 'fullName email')
      .populate('planId', 'tier')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          pending: pendingUsers,
          approved: approvedUsers
        },
        subscriptions: {
          pending: pendingSubscriptions,
          active: activeSubscriptions,
          expired: expiredSubscriptions
        },
        revenue: {
          total: totalRevenue,
          currency: 'USD'
        },
        recentActivity: recentSubscriptions
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching statistics'
    });
  }
});

module.exports = router;
