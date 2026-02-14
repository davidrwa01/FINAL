const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actionType: {
    type: String,
    enum: [
      'LOGIN',
      'LOGOUT',
      'REGISTER',
      'PROFILE_UPDATE',
      'PASSWORD_CHANGE',
      'SIGNAL_GENERATED',
      'SIGNAL_ANALYSIS',
      'OCR_SCAN',
      'SUBSCRIPTION_CREATED',
      'SUBSCRIPTION_APPROVED',
      'SUBSCRIPTION_REJECTED',
      'PAYMENT_SUBMITTED',
      'TRIAL_SIGNAL_USED',
      'ACCOUNT_APPROVED',
      'ACCOUNT_REJECTED',
      'SECURITY_SETTING_CHANGED',
      'LOGIN_FAILED',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'API_CALL',
      'ACCOUNT_DELETED',
      'EMAIL_VERIFIED',
      'PASSWORD_RESET'
    ],
    required: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // For signal generation tracking
  signalData: {
    symbol: String,
    timeframe: String,
    direction: String,
    confidence: Number,
    entry: Number,
    stopLoss: Number,
    takeProfit: Number
  },
  // For subscription tracking
  subscriptionData: {
    planId: mongoose.Schema.Types.ObjectId,
    planTier: String,
    amount: Number,
    transactionId: String
  },
  // IP and user agent for security tracking
  ipAddress: String,
  userAgent: String,
  
  // Status of the action
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'SUCCESS'
  },
  
  // Error message if failed
  errorMessage: String,
  
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 7776000 // Auto-delete after 90 days (90 * 24 * 60 * 60)
  },
  
  // Session ID for tracking sessions
  sessionId: String
});

// Compound indexes for common queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, actionType: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

// Static method to log activity
activitySchema.statics.logActivity = async function(userId, actionType, options = {}) {
  try {
    const activity = new this({
      userId,
      actionType,
      description: options.description || '',
      details: options.details || {},
      signalData: options.signalData || null,
      subscriptionData: options.subscriptionData || null,
      ipAddress: options.ipAddress || '',
      userAgent: options.userAgent || '',
      status: options.status || 'SUCCESS',
      errorMessage: options.errorMessage || '',
      sessionId: options.sessionId || ''
    });
    
    return await activity.save();
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw, just log to console - don't break the main flow
  }
};

// Static method to get user's activity history
activitySchema.statics.getUserHistory = async function(userId, filters = {}) {
  try {
    const query = { userId };
    
    if (filters.actionType) {
      query.actionType = filters.actionType;
    }
    
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    const limit = filters.limit || 50;
    const page = filters.page || 1;
    const skip = (page - 1) * limit;
    
    const [activities, total] = await Promise.all([
      this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      this.countDocuments(query)
    ]);
    
    return {
      activities,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error fetching user history:', error);
    throw error;
  }
};

// Static method to get activity summary/stats
activitySchema.statics.getUserActivityStats = async function(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await this.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$actionType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    return stats;
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    throw error;
  }
};

module.exports = mongoose.model('Activity', activitySchema);
