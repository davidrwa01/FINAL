const Activity = require('../models/Activity');

/**
 * Middleware to automatically log user activities
 * Attaches logActivity method to request object
 */
function activityLogger(req, res, next) {
  // Add logging method to request
  req.logActivity = async (actionType, options = {}) => {
    if (!req.session?.userId) {
      return; // Don't log if user not authenticated
    }

    try {
      await Activity.logActivity(req.session.userId, actionType, {
        description: options.description || '',
        details: options.details || {},
        signalData: options.signalData || null,
        subscriptionData: options.subscriptionData || null,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        status: options.status || 'SUCCESS',
        errorMessage: options.errorMessage || '',
        sessionId: req.sessionID || ''
      });
    } catch (error) {
      console.error('Activity logging error:', error);
      // Don't throw - just log to console
    }
  };

  next();
}

/**
 * Wrapper function to create activity-logging route handlers
 * Automatically logs before and after route execution
 */
function withActivityLogging(actionType, handler, getDetails = null) {
  return async (req, res, next) => {
    try {
      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(data) {
        // Call the original json method
        originalJson.call(this, data);
        
        // Log activity after successful response
        if (req.session?.userId && data.success) {
          const details = getDetails ? getDetails(req, res, data) : {};
          req.logActivity(actionType, {
            description: `${actionType} completed successfully`,
            details,
            status: 'SUCCESS'
          });
        }
      };

      // Execute the handler
      await handler(req, res, next);
    } catch (error) {
      // Log failed activity
      if (req.session?.userId) {
        req.logActivity(actionType, {
          description: `${actionType} failed`,
          details: { errorMessage: error.message },
          status: 'FAILED',
          errorMessage: error.message
        });
      }
      next(error);
    }
  };
}

module.exports = {
  activityLogger,
  withActivityLogging
};
