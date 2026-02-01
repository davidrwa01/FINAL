const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED'],
    default: 'PENDING'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    default: 'MTN_USSD'
  },
  ussdCode: {
    type: String,
    default: '*182*8*1*583894#'
  },
  paymentName: {
    type: String,
    default: 'David'
  },
  amountUSD: {
    type: Number,
    required: true
  },
  amountRWF: {
    type: Number,
    required: true
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    trim: true
  },
  screenshotUrl: {
    type: String
  },
  adminReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminReviewedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });

// Update timestamp on save
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if subscription is currently active
subscriptionSchema.methods.isCurrentlyActive = function() {
  if (this.status !== 'ACTIVE') return false;
  
  const now = new Date();
  return this.startDate <= now && this.endDate > now;
};

// Static method to find active subscription for user
subscriptionSchema.statics.findActiveForUser = async function(userId) {
  const now = new Date();
  return await this.findOne({
    userId,
    status: 'ACTIVE',
    startDate: { $lte: now },
    endDate: { $gt: now }
  }).populate('planId');
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
