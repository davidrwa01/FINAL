const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const UsageLog = require('../models/UsageLog');
const { requireAuth, requireAdminApproved } = require('../middleware/auth');
const { convertUSDtoRWF, getFormattedCurrency } = require('../utils/currency');
const { body, validationResult } = require('express-validator');

// Configure multer for screenshot uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.'));
    }
  }
});

// Get all active plans with real-time RWF conversion
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ displayOrder: 1 });
    
    // Convert USD prices to RWF for each plan
    const plansWithRWF = await Promise.all(
      plans.map(async (plan) => {
        const currency = await getFormattedCurrency(plan.priceUSD);
        return {
          id: plan._id,
          tier: plan.tier,
          priceUSD: plan.priceUSD,
          priceRWF: currency.rwf.amount,
          formattedUSD: currency.usd.formatted,
          formattedRWF: currency.rwf.formatted,
          durationDays: plan.durationDays,
          features: plan.features,
          exchangeRate: currency.exchangeRate
        };
      })
    );

    res.json({
      success: true,
      data: {
        plans: plansWithRWF,
        paymentInfo: {
          method: 'MTN Mobile Money',
          ussdCode: process.env.MTN_USSD_CODE || '*182*8*1*583894#',
          receiverName: process.env.PAYMENT_RECEIVER_NAME || 'David'
        }
      }
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching subscription plans'
    });
  }
});

// Submit subscription payment request
router.post('/subscribe',
  requireAuth,
  requireAdminApproved,
  upload.single('screenshot'),
  [
    body('planId').notEmpty().withMessage('Plan ID is required'),
    body('transactionId').trim().notEmpty().withMessage('Transaction ID is required')
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

      const { planId, transactionId, notes } = req.body;
      const userId = req.session.userId;

      // Verify plan exists
      const plan = await Plan.findById(planId);
      if (!plan || !plan.isActive) {
        return res.status(404).json({
          success: false,
          error: 'PLAN_NOT_FOUND',
          message: 'Selected plan not found or is no longer active'
        });
      }

      // Check for existing pending subscription
      const existingPending = await Subscription.findOne({
        userId,
        status: 'PENDING'
      });

      if (existingPending) {
        return res.status(409).json({
          success: false,
          error: 'PENDING_EXISTS',
          message: 'You already have a pending subscription request'
        });
      }

      // Convert USD to RWF
      const { amountRWF, rate } = await convertUSDtoRWF(plan.priceUSD);

      // Create subscription request
      const subscription = new Subscription({
        userId,
        planId,
        status: 'PENDING',
        paymentMethod: 'MTN_USSD',
        ussdCode: process.env.MTN_USSD_CODE || '*182*8*1*583894#',
        paymentName: process.env.PAYMENT_RECEIVER_NAME || 'David',
        amountUSD: plan.priceUSD,
        amountRWF,
        exchangeRate: rate,
        transactionId,
        screenshotUrl: req.file ? `/uploads/${req.file.filename}` : null,
        notes
      });

      await subscription.save();

      res.status(201).json({
        success: true,
        message: 'Subscription request submitted successfully. Pending admin approval.',
        data: {
          subscriptionId: subscription._id,
          plan: plan.tier,
          amountUSD: plan.priceUSD,
          amountRWF,
          status: subscription.status
        }
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error submitting subscription request'
      });
    }
  }
);

// Get user's subscription status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get active subscription
    const activeSubscription = await Subscription.findActiveForUser(userId);

    // Get pending subscriptions
    const pendingSubscriptions = await Subscription.find({
      userId,
      status: 'PENDING'
    }).populate('planId').sort({ createdAt: -1 });

    // Get trial usage
    const dailyLimit = parseInt(process.env.FREE_TRIAL_SIGNALS_PER_DAY) || 2;
    const remaining = await UsageLog.getRemainingSignals(userId, dailyLimit);

    const response = {
      success: true,
      data: {
        hasActiveSubscription: !!activeSubscription,
        activeSubscription: activeSubscription ? {
          id: activeSubscription._id,
          plan: activeSubscription.planId.tier,
          startDate: activeSubscription.startDate,
          endDate: activeSubscription.endDate,
          daysRemaining: Math.ceil((activeSubscription.endDate - new Date()) / (1000 * 60 * 60 * 24))
        } : null,
        pendingSubscriptions: pendingSubscriptions.map(sub => ({
          id: sub._id,
          plan: sub.planId.tier,
          amountUSD: sub.amountUSD,
          amountRWF: sub.amountRWF,
          transactionId: sub.transactionId,
          createdAt: sub.createdAt
        })),
        trial: {
          active: !activeSubscription,
          dailyLimit,
          remaining,
          used: dailyLimit - remaining
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching subscription status'
    });
  }
});

// Get user's subscription history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const subscriptions = await Subscription.find({ userId })
      .populate('planId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: subscriptions.map(sub => ({
        id: sub._id,
        plan: sub.planId ? sub.planId.tier : 'N/A',
        status: sub.status,
        amountUSD: sub.amountUSD,
        amountRWF: sub.amountRWF,
        startDate: sub.startDate,
        endDate: sub.endDate,
        transactionId: sub.transactionId,
        rejectionReason: sub.rejectionReason,
        createdAt: sub.createdAt
      }))
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching subscription history'
    });
  }
});

module.exports = router;
