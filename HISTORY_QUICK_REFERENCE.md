# Quick Start Guide - Activity History System

## For Developers

### How to Log User Activities

In any route handler that has access to `req`:

```javascript
// Simple logging
await req.logActivity('CUSTOM_ACTION', {
  description: 'User did something important'
});

// With details
await req.logActivity('CUSTOM_ACTION', {
  description: 'User performed action with details',
  details: {
    key1: 'value1',
    key2: 'value2'
  }
});

// With status tracking (for potentially failing operations)
await req.logActivity('RISKY_ACTION', {
  description: 'User attempted risky action',
  details: { attemptedValue: 'something' },
  status: 'SUCCESS' // or 'FAILED'
});

// With error message
await req.logActivity('FAILED_ACTION', {
  description: 'Action failed for user',
  details: { attemptedValue: 'something' },
  status: 'FAILED',
  errorMessage: 'Specific error that occurred'
});
```

### Available Action Types

```
LOGIN, LOGOUT, REGISTER, PROFILE_UPDATE, PASSWORD_CHANGE,
SIGNAL_GENERATED, SIGNAL_ANALYSIS, OCR_SCAN,
SUBSCRIPTION_CREATED, SUBSCRIPTION_APPROVED, SUBSCRIPTION_REJECTED,
PAYMENT_SUBMITTED, TRIAL_SIGNAL_USED,
ACCOUNT_APPROVED, ACCOUNT_REJECTED,
SECURITY_SETTING_CHANGED, LOGIN_FAILED,
UNAUTHORIZED_ACCESS_ATTEMPT, API_CALL,
ACCOUNT_DELETED, EMAIL_VERIFIED, PASSWORD_RESET
```

## For API Consumers

### Fetch User's Complete History
```bash
curl -X GET "http://localhost:3000/api/history?limit=50&page=1" \
  -H "Cookie: connect.sid=your_session_id"
```

### Filter by Action Type
```bash
curl -X GET "http://localhost:3000/api/history?actionType=LOGIN&limit=20" \
  -H "Cookie: connect.sid=your_session_id"
```

### Get Signal Generation History
```bash
curl -X GET "http://localhost:3000/api/history/signals?limit=100" \
  -H "Cookie: connect.sid=your_session_id"
```

### Get Login/Security History
```bash
curl -X GET "http://localhost:3000/api/history/logins?limit=20" \
  -H "Cookie: connect.sid=your_session_id"

curl -X GET "http://localhost:3000/api/history/security?limit=50" \
  -H "Cookie: connect.sid=your_session_id"
```

### Get Activity Statistics (Last 30 Days)
```bash
curl -X GET "http://localhost:3000/api/history/stats?days=30" \
  -H "Cookie: connect.sid=your_session_id"
```

### Get Subscription History
```bash
curl -X GET "http://localhost:3000/api/history/subscriptions?limit=50" \
  -H "Cookie: connect.sid=your_session_id"
```

## Frontend Integration

### In React Components
```jsx
import { useEffect, useState } from 'react';

function MyComponent() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/history/signals', {
          credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
          setHistory(data.data.activities);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {history.map(activity => (
        <div key={activity._id}>
          <h3>{activity.actionType}</h3>
          <p>{activity.description}</p>
          <time>{new Date(activity.createdAt).toLocaleString()}</time>
        </div>
      ))}
    </div>
  );
}
```

## Database Queries (MongoDB)

### View All Activities for a User
```javascript
db.activities.find({ userId: ObjectId("user_id") }).sort({ createdAt: -1 }).limit(100)
```

### View Signal Generation Activities
```javascript
db.activities.find({ 
  userId: ObjectId("user_id"),
  actionType: "SIGNAL_GENERATED"
}).sort({ createdAt: -1 })
```

### View Failed Login Attempts
```javascript
db.activities.find({
  userId: ObjectId("user_id"),
  actionType: "LOGIN_FAILED"
}).sort({ createdAt: -1 })
```

### Check Storage Size
```javascript
db.activities.stats()
```

## Monitoring & Maintenance

### Activity Count by Type
```javascript
db.activities.aggregate([
  { $match: { userId: ObjectId("user_id") } },
  { $group: { _id: "$actionType", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Recent Activities (Last 24 Hours)
```javascript
db.activities.find({
  createdAt: { 
    $gte: new Date(new Date().getTime() - 24*60*60*1000)
  }
}).sort({ createdAt: -1 })
```

### Activities with Errors
```javascript
db.activities.find({
  status: "FAILED"
}).sort({ createdAt: -1 })
```

## Important Notes

⚠️ **Data Retention**: Activities auto-delete after 90 days (TTL index)

✅ **Performance**: Indexed on `userId`, `actionType`, and `createdAt` for fast queries

🔒 **Privacy**: Users can only view their own activities (enforced by `requireAuth`)

📊 **Pagination**: Always use `limit` and `page` parameters for large datasets

🚨 **Error Tracking**: Check `status: 'FAILED'` for debugging user issues

## Troubleshooting

### "Activity logging failed" but action succeeded
This is OK - logging failures don't break the main request. Check MongoDB connection.

### Activities not appearing in history
1. Verify user is authenticated (`req.session.userId` exists)
2. Check MongoDB connection is active
3. Verify no errors in `req.logActivity()` call
4. Check collection exists: `db.activities.find().limit(1)`

### Memory growing - Activities not deleting
1. Verify TTL index exists: `db.activities.getIndexes()`
2. Should show: `"expireAfterSeconds": 7776000` (90 days)
3. If missing, create index: `db.activities.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 })`

---

**Last Updated**: February 4, 2026
