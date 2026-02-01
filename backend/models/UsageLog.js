const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actionType: {
    type: String,
    enum: ['SIGNAL', 'ANALYSIS'],
    default: 'SIGNAL'
  },
  dateKey: {
    type: String,
    required: true,
    // Format: YYYY-MM-DD (e.g., "2026-01-30")
  },
  metadata: {
    symbol: String,
    timeframe: String,
    signalType: String,
    ipAddress: String,
    userAgent: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast daily counting
usageLogSchema.index({ userId: 1, dateKey: 1, actionType: 1 });

// Static method to count signals for user on specific date
usageLogSchema.statics.countSignalsForDate = async function(userId, dateKey) {
  return await this.countDocuments({
    userId,
    dateKey,
    actionType: 'SIGNAL'
  });
};

// Static method to get today's date key in user's timezone
usageLogSchema.statics.getTodayDateKey = function(timezone = 'Africa/Kigali') {
  const now = new Date();
  const options = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(now); // Returns YYYY-MM-DD
};

// Static method to log a signal usage
usageLogSchema.statics.logSignal = async function(userId, metadata = {}) {
  const dateKey = this.getTodayDateKey();
  
  return await this.create({
    userId,
    actionType: 'SIGNAL',
    dateKey,
    metadata
  });
};

// Static method to check if user has exceeded daily limit
usageLogSchema.statics.hasExceededDailyLimit = async function(userId, limit = 2) {
  const dateKey = this.getTodayDateKey();
  const count = await this.countSignalsForDate(userId, dateKey);
  return count >= limit;
};

// Static method to get remaining signals for today
usageLogSchema.statics.getRemainingSignals = async function(userId, limit = 2) {
  const dateKey = this.getTodayDateKey();
  const count = await this.countSignalsForDate(userId, dateKey);
  return Math.max(0, limit - count);
};

module.exports = mongoose.model('UsageLog', usageLogSchema);
