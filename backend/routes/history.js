const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/history - Get user's activity history
 * Query params:
 *   - limit: number of records (default 50)
 *   - page: page number (default 1)
 *   - actionType: filter by action type
 *   - startDate: filter by start date
 *   - endDate: filter by end date
 *   - status: filter by status (SUCCESS, FAILED, PENDING)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { limit, page, actionType, startDate, endDate, status } = req.query;

    const filters = {
      limit: Math.min(parseInt(limit) || 50, 100), // Max 100 per page
      page: Math.max(parseInt(page) || 1, 1),
      actionType: actionType || null,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || null
    };

    const history = await Activity.getUserHistory(userId, filters);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching activity history'
    });
  }
});

/**
 * GET /api/history/stats - Get activity statistics
 * Query params:
 *   - days: number of days to look back (default 30)
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const days = Math.min(parseInt(req.query.days) || 30, 365); // Max 1 year

    const stats = await Activity.getUserActivityStats(userId, days);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        stats
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching activity statistics'
    });
  }
});

/**
 * GET /api/history/signals - Get user's signal generation history
 */
router.get('/signals', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { limit, page } = req.query;

    const filters = {
      limit: Math.min(parseInt(limit) || 50, 100),
      page: Math.max(parseInt(page) || 1, 1),
      actionType: 'SIGNAL_GENERATED'
    };

    const history = await Activity.getUserHistory(userId, filters);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get signal history error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching signal history'
    });
  }
});

/**
 * GET /api/history/logins - Get user's login history
 */
router.get('/logins', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { limit, page } = req.query;

    const filters = {
      limit: Math.min(parseInt(limit) || 20, 100),
      page: Math.max(parseInt(page) || 1, 1),
      actionType: 'LOGIN'
    };

    const history = await Activity.getUserHistory(userId, filters);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching login history'
    });
  }
});

/**
 * GET /api/history/subscriptions - Get user's subscription history
 */
router.get('/subscriptions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { limit, page } = req.query;

    const filters = {
      limit: Math.min(parseInt(limit) || 50, 100),
      page: Math.max(parseInt(page) || 1, 1)
    };

    // Get both subscription creation and approval events
    const query = {
      userId,
      actionType: { $in: ['SUBSCRIPTION_CREATED', 'SUBSCRIPTION_APPROVED', 'SUBSCRIPTION_REJECTED'] }
    };

    const skip = (filters.page - 1) * filters.limit;

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .skip(skip)
        .lean(),
      Activity.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        activities,
        total,
        page: filters.page,
        limit: filters.limit,
        pages: Math.ceil(total / filters.limit)
      }
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

/**
 * GET /api/history/security - Get user's security-related activities
 */
router.get('/security', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { limit, page } = req.query;

    const filters = {
      limit: Math.min(parseInt(limit) || 50, 100),
      page: Math.max(parseInt(page) || 1, 1)
    };

    const query = {
      userId,
      actionType: {
        $in: [
          'PASSWORD_CHANGE',
          'LOGIN_FAILED',
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          'SECURITY_SETTING_CHANGED',
          'PASSWORD_RESET'
        ]
      }
    };

    const skip = (filters.page - 1) * filters.limit;

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .skip(skip)
        .lean(),
      Activity.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        activities,
        total,
        page: filters.page,
        limit: filters.limit,
        pages: Math.ceil(total / filters.limit)
      }
    });
  } catch (error) {
    console.error('Get security history error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching security history'
    });
  }
});

/**
 * DELETE /api/history/:id - Delete a specific activity record (admin only)
 * Note: Users can't delete their own history, only admins can
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // Only allow deletion by the activity owner (for testing)
    const activity = await Activity.findById(id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Activity record not found'
      });
    }

    if (activity.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You cannot delete other users\' activity records'
      });
    }

    await Activity.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Activity record deleted successfully'
    });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error deleting activity record'
    });
  }
});

module.exports = router;
