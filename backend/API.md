# 📡 Smart-KORAFX API Documentation

Complete API reference for the Smart-KORAFX backend security system.

---

## 🔑 Authentication

All protected endpoints require a valid session cookie. Obtain by logging in via `/api/auth/login`.

**Response Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not approved / no subscription)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Server Error

---

## 📋 Authentication Endpoints

### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Your account is pending admin approval.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "isApproved": false,
    "role": "user"
  },
  "redirectTo": "/pending-approval"
}
```

---

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "emailOrUsername": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "isApproved": true,
    "role": "user",
    "lastLogin": "2026-01-30T10:30:00.000Z"
  },
  "redirectTo": "/"
}
```

---

### Logout

```http
POST /api/auth/logout
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "redirectTo": "/login"
}
```

---

### Check Authentication Status

```http
GET /api/auth/status
```

**Response (Authenticated):**
```json
{
  "success": true,
  "authenticated": true,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "isApproved": true,
    "role": "user",
    "lastLogin": "2026-01-30T10:30:00.000Z"
  }
}
```

---

## 💳 Subscription Endpoints

### Get Active Plans

```http
GET /api/subscription/plans
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "507f1f77bcf86cd799439011",
        "tier": "Regular",
        "priceUSD": 29.99,
        "priceRWF": 40498,
        "formattedUSD": "$29.99",
        "formattedRWF": "40,498 FRW",
        "durationDays": 30,
        "features": [
          "Unlimited Signal Generation",
          "Basic Technical Analysis",
          "Email Support",
          "Access to Trading Signals"
        ],
        "exchangeRate": 1350
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "tier": "Standard",
        "priceUSD": 79.99,
        "priceRWF": 107987,
        "formattedUSD": "$79.99",
        "formattedRWF": "107,987 FRW",
        "durationDays": 90,
        "features": [
          "All Regular Features",
          "Advanced SMC Analysis",
          "Priority Support"
        ],
        "exchangeRate": 1350
      }
    ],
    "paymentInfo": {
      "method": "MTN Mobile Money",
      "ussdCode": "*182*8*1*583894#",
      "receiverName": "David"
    }
  }
}
```

---

### Submit Subscription Request

```http
POST /api/subscription/subscribe
Content-Type: multipart/form-data
Authorization: Required (logged in + approved)

planId: "507f1f77bcf86cd799439011"
transactionId: "MTN123456789"
notes: "Paid via MTN MoMo"
screenshot: [file] (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription request submitted successfully. Pending admin approval.",
  "data": {
    "subscriptionId": "507f1f77bcf86cd799439020",
    "plan": "Regular",
    "amountUSD": 29.99,
    "amountRWF": 40498,
    "status": "PENDING"
  }
}
```

---

### Get Subscription Status

```http
GET /api/subscription/status
Authorization: Required (logged in)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasActiveSubscription": true,
    "activeSubscription": {
      "id": "507f1f77bcf86cd799439020",
      "plan": "Regular",
      "startDate": "2026-01-30T00:00:00.000Z",
      "endDate": "2026-03-01T00:00:00.000Z",
      "daysRemaining": 30
    },
    "pendingSubscriptions": [],
    "trial": {
      "active": false,
      "dailyLimit": 2,
      "remaining": 0,
      "used": 0
    }
  }
}
```

**Response (No Subscription - On Trial):**
```json
{
  "success": true,
  "data": {
    "hasActiveSubscription": false,
    "activeSubscription": null,
    "pendingSubscriptions": [
      {
        "id": "507f1f77bcf86cd799439021",
        "plan": "Standard",
        "amountUSD": 79.99,
        "amountRWF": 107987,
        "transactionId": "MTN987654321",
        "createdAt": "2026-01-30T09:00:00.000Z"
      }
    ],
    "trial": {
      "active": true,
      "dailyLimit": 2,
      "remaining": 1,
      "used": 1
    }
  }
}
```

---

### Get Subscription History

```http
GET /api/subscription/history
Authorization: Required (logged in)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439020",
      "plan": "Regular",
      "status": "ACTIVE",
      "amountUSD": 29.99,
      "amountRWF": 40498,
      "startDate": "2026-01-30T00:00:00.000Z",
      "endDate": "2026-03-01T00:00:00.000Z",
      "transactionId": "MTN123456789",
      "rejectionReason": null,
      "createdAt": "2026-01-29T10:00:00.000Z"
    }
  ]
}
```

---

## 🎯 Signal Endpoints

### Generate Signal (Protected)

```http
POST /api/signals/generate
Content-Type: application/json
Authorization: Required (logged in + approved + subscription/trial)

{
  "symbol": "EURUSD",
  "timeframe": "H4",
  "signalType": "BUY"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Signal access granted",
  "data": {
    "hasActiveSubscription": false,
    "onFreeTrial": true,
    "remainingSignals": 1,
    "dailyLimit": 2,
    "canGenerate": true
  }
}
```

**Error (Trial Limit Exceeded):**
```json
{
  "success": false,
  "error": "TRIAL_LIMIT_EXCEEDED",
  "message": "Free trial limit exceeded. You can generate 2 signals per day.",
  "data": {
    "dailyLimit": 2,
    "remaining": 0,
    "message": "Upgrade to a subscription for unlimited signals"
  },
  "redirectTo": "/subscribe"
}
```

---

### Check Signal Access

```http
GET /api/signals/check-access
Authorization: Required (logged in + approved)
```

**Response (Can Generate):**
```json
{
  "success": true,
  "data": {
    "canGenerate": true,
    "hasActiveSubscription": false,
    "onFreeTrial": true,
    "trial": {
      "dailyLimit": 2,
      "used": 1,
      "remaining": 1,
      "message": "1 signal remaining today"
    }
  }
}
```

**Response (Subscribed - Unlimited):**
```json
{
  "success": true,
  "data": {
    "canGenerate": true,
    "hasActiveSubscription": true,
    "subscription": {
      "plan": "Regular",
      "endDate": "2026-03-01T00:00:00.000Z"
    },
    "unlimited": true
  }
}
```

---

### Get Usage Statistics

```http
GET /api/signals/usage-stats
Authorization: Required (logged in + approved)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2026-01-30",
      "used": 1,
      "limit": 2,
      "remaining": 1
    },
    "history": [
      { "date": "2026-01-24", "count": 2 },
      { "date": "2026-01-25", "count": 2 },
      { "date": "2026-01-26", "count": 1 },
      { "date": "2026-01-27", "count": 0 },
      { "date": "2026-01-28", "count": 2 },
      { "date": "2026-01-29", "count": 2 },
      { "date": "2026-01-30", "count": 1 }
    ]
  }
}
```

---

## 👨‍💼 Admin Endpoints

All admin endpoints require admin authentication.

### Get All Users

```http
GET /api/admin/users?status=pending&search=john&page=1&limit=20
Authorization: Required (admin)
```

**Query Parameters:**
- `status` - Filter by status: `pending`, `approved`, or omit for all
- `search` - Search by name, email, or username
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "fullName": "John Doe",
        "email": "john@example.com",
        "username": "johndoe",
        "role": "user",
        "isApproved": false,
        "createdAt": "2026-01-30T08:00:00.000Z",
        "lastLogin": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "pages": 1
    }
  }
}
```

---

### Approve User

```http
POST /api/admin/users/:userId/approve
Authorization: Required (admin)
```

**Response:**
```json
{
  "success": true,
  "message": "User approved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@example.com",
    "isApproved": true,
    "approvedAt": "2026-01-30T10:00:00.000Z"
  }
}
```

---

### Reject/Revoke User

```http
POST /api/admin/users/:userId/reject
Content-Type: application/json
Authorization: Required (admin)

{
  "reason": "Invalid documentation provided"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User approval revoked",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "isApproved": false
  }
}
```

---

### Get All Subscriptions

```http
GET /api/admin/subscriptions?status=PENDING&page=1&limit=20
Authorization: Required (admin)
```

**Query Parameters:**
- `status` - Filter by: `PENDING`, `ACTIVE`, `EXPIRED`, `REJECTED`
- `page` - Page number
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "userId": {
          "_id": "507f1f77bcf86cd799439011",
          "fullName": "John Doe",
          "email": "john@example.com",
          "username": "johndoe"
        },
        "planId": {
          "_id": "507f1f77bcf86cd799439001",
          "tier": "Regular",
          "priceUSD": 29.99,
          "durationDays": 30
        },
        "status": "PENDING",
        "amountUSD": 29.99,
        "amountRWF": 40498,
        "exchangeRate": 1350,
        "transactionId": "MTN123456789",
        "screenshotUrl": "/uploads/payment-1706606400000-123456789.jpg",
        "createdAt": "2026-01-30T09:00:00.000Z"
      }
    ],
    "counts": {
      "pending": 5,
      "active": 42,
      "expired": 18,
      "rejected": 3
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### Approve Subscription

```http
POST /api/admin/subscriptions/:subscriptionId/approve
Authorization: Required (admin)
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription approved successfully",
  "data": {
    "subscriptionId": "507f1f77bcf86cd799439020",
    "status": "ACTIVE",
    "startDate": "2026-01-30T10:00:00.000Z",
    "endDate": "2026-03-01T10:00:00.000Z"
  }
}
```

---

### Reject Subscription

```http
POST /api/admin/subscriptions/:subscriptionId/reject
Content-Type: application/json
Authorization: Required (admin)

{
  "reason": "Invalid transaction ID"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription rejected",
  "data": {
    "subscriptionId": "507f1f77bcf86cd799439020",
    "status": "REJECTED",
    "rejectionReason": "Invalid transaction ID"
  }
}
```

---

### Get All Plans

```http
GET /api/admin/plans
Authorization: Required (admin)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439001",
      "tier": "Regular",
      "priceUSD": 29.99,
      "durationDays": 30,
      "features": [
        "Unlimited Signal Generation",
        "Basic Technical Analysis"
      ],
      "isActive": true,
      "displayOrder": 1,
      "createdAt": "2026-01-29T00:00:00.000Z",
      "updatedAt": "2026-01-29T00:00:00.000Z"
    }
  ]
}
```

---

### Create/Update Plan

```http
POST /api/admin/plans
Content-Type: application/json
Authorization: Required (admin)

{
  "tier": "Regular",
  "priceUSD": 29.99,
  "durationDays": 30,
  "features": [
    "Unlimited Signal Generation",
    "Basic Technical Analysis",
    "Email Support"
  ],
  "isActive": true,
  "displayOrder": 1
}
```

**Response (Created):**
```json
{
  "success": true,
  "message": "Plan created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439001",
    "tier": "Regular",
    "priceUSD": 29.99,
    "durationDays": 30,
    "features": [
      "Unlimited Signal Generation",
      "Basic Technical Analysis",
      "Email Support"
    ],
    "isActive": true,
    "displayOrder": 1
  }
}
```

---

### Toggle Plan Status

```http
PATCH /api/admin/plans/:planId/toggle
Authorization: Required (admin)
```

**Response:**
```json
{
  "success": true,
  "message": "Plan deactivated",
  "data": {
    "_id": "507f1f77bcf86cd799439001",
    "tier": "Regular",
    "isActive": false
  }
}
```

---

### Get Dashboard Statistics

```http
GET /api/admin/stats
Authorization: Required (admin)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "pending": 12,
      "approved": 138
    },
    "subscriptions": {
      "pending": 5,
      "active": 85,
      "expired": 23
    },
    "revenue": {
      "total": 5497.15,
      "currency": "USD"
    },
    "recentActivity": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "userId": {
          "fullName": "John Doe",
          "email": "john@example.com"
        },
        "planId": {
          "tier": "Regular"
        },
        "status": "PENDING",
        "createdAt": "2026-01-30T09:00:00.000Z"
      }
    ]
  }
}
```

---

## 🚫 Error Responses

### Validation Error

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Email is required",
  "errors": [
    {
      "msg": "Email is required",
      "param": "email",
      "location": "body"
    }
  ]
}
```

### Unauthorized

```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "You must be logged in to access this resource",
  "redirectTo": "/login"
}
```

### Not Approved

```json
{
  "success": false,
  "error": "NOT_APPROVED",
  "message": "Your account is pending admin approval",
  "redirectTo": "/pending-approval"
}
```

### Trial Limit Exceeded

```json
{
  "success": false,
  "error": "TRIAL_LIMIT_EXCEEDED",
  "message": "Free trial limit exceeded. You can generate 2 signals per day.",
  "data": {
    "dailyLimit": 2,
    "remaining": 0,
    "message": "Upgrade to a subscription for unlimited signals"
  },
  "redirectTo": "/subscribe"
}
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- File uploads use `multipart/form-data`
- Session cookies are httpOnly and secure in production
- Rate limiting may be applied to prevent abuse
- Currency conversion updates hourly

---

**API Documentation v1.0** | Smart-KORAFX
