# Profile System API Endpoints

All profile-related endpoints are now fully implemented and ready to use.

## Authentication Endpoints

### 1. Update User Profile
**Route:** `PATCH /api/auth/profile`  
**Authentication:** Required (logged in user)

**Request Body:**
```json
{
  "fullName": "John Doe",
  "phone": "+250782123456"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "phone": "+250782123456",
    "isApproved": true
  }
}
```

**Error Responses:**
- `401` - Not authenticated
- `400` - Validation error
- `500` - Server error

---

### 2. Change Password
**Route:** `POST /api/auth/change-password`  
**Authentication:** Required (logged in user)

**Request Body:**
```json
{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

**Validation Requirements:**
- Current password must be correct
- New password must be at least 8 characters
- New password must contain: uppercase, number, special character
- Passwords must match

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `401` - Invalid current password / Not authenticated
- `400` - Password validation failed / Passwords don't match
- `500` - Server error

---

### 3. Send Password Reset Email
**Route:** `POST /api/auth/forgot-password`  
**Authentication:** Not required (public)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "If an account exists with this email, a reset code will be sent.",
  "data": {
    "email": "us***@example.com",
    "otpForTesting": "123456"  // Only in development
  }
}
```

**Notes:**
- Always returns success (doesn't reveal if email exists)
- OTP is generated and sent to email (testing: check console logs)
- OTP valid for 15 minutes
- In production: integrate with SendGrid, Mailgun, or AWS SES

---

### 4. Verify Password Reset OTP
**Route:** `POST /api/auth/verify-reset-otp`  
**Authentication:** Not required (public)

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "resetToken": "dXNlckBleGFtcGxlLmNvbToxNzI0MDEwMDAwMDAw"
  }
}
```

**Error Responses:**
- `404` - User not found
- `400` - Invalid OTP / OTP expired
- `500` - Server error

---

### 5. Reset Password with OTP
**Route:** `POST /api/auth/reset-password`  
**Authentication:** Not required (public)

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

**Validation Requirements:**
- Valid OTP for the email
- OTP must not be expired
- New password must be at least 8 characters
- Passwords must match

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password."
}
```

**Error Responses:**
- `404` - User not found
- `400` - Invalid OTP / Password validation failed
- `500` - Server error

---

## Signals/Trading Endpoints

### 6. Get Trading Signal History
**Route:** `GET /api/signals/history`  
**Authentication:** Required (logged in user)

**Query Parameters:**
- None (filtering done on frontend)

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Trading history retrieved",
  "data": {
    "total": 4,
    "scans": [
      {
        "id": "1",
        "pair": "BTC/USDT",
        "date": "2026-01-29T10:30:00.000Z",
        "signal": "BUY",
        "confidence": 92,
        "entry": 43250,
        "stopLoss": 42800,
        "takeProfit": 44200,
        "result": "WIN"
      },
      {
        "id": "2",
        "pair": "ETH/USDT",
        "date": "2026-01-26T15:45:00.000Z",
        "signal": "SELL",
        "confidence": 78,
        "entry": 2380,
        "stopLoss": 2420,
        "takeProfit": 2300,
        "result": "WIN"
      }
    ],
    "stats": {
      "totalScans": 4,
      "thisWeekScans": 2,
      "winRate": 66.67,
      "avgRR": 1.85
    }
  }
}
```

**Error Responses:**
- `401` - Not authenticated
- `500` - Server error

---

## Testing the APIs

### Using cURL

**Test Profile Update:**
```bash
curl -X PATCH http://localhost:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -b "connect.sid=<session_cookie>" \
  -d '{
    "fullName": "Test User",
    "phone": "+250123456789"
  }'
```

**Test Forgot Password:**
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### Using Frontend (React)

All frontend components are already connected:

```javascript
// Update profile
const response = await fetch('/api/auth/profile', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData),
  credentials: 'include'  // Important: include cookies
});

// Change password
const response = await fetch('/api/auth/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(passwordForm),
  credentials: 'include'
});

// Get trading history
const response = await fetch('/api/signals/history', {
  credentials: 'include'  // Important: include cookies
});
```

---

## Common Issues & Solutions

### 401 Unauthorized
- **Problem:** User not authenticated or session expired
- **Solution:** Check that `credentials: 'include'` is set in fetch requests

### 400 Validation Error
- **Problem:** Invalid input data
- **Solution:** Check request body format and validation requirements

### OTP Not Received
- **Problem:** Email service not configured
- **Solution:** 
  - For testing: OTP is logged to console
  - For production: Set up SendGrid/Mailgun API
  - Check `.env` for email configuration

### Password Reset Token Expired
- **Problem:** OTP valid for only 15 minutes
- **Solution:** Request new code using "Resend Code" button

---

## Implementation Checklist

- [x] PATCH /api/auth/profile - Update user profile
- [x] POST /api/auth/change-password - Change password
- [x] POST /api/auth/forgot-password - Send reset code
- [x] POST /api/auth/verify-reset-otp - Verify OTP
- [x] POST /api/auth/reset-password - Reset password
- [x] GET /api/signals/history - Get trading history
- [x] Frontend integration with AccountInformation component
- [x] Frontend integration with SecuritySettings component
- [x] Frontend integration with ForgotPassword page
- [x] Frontend integration with ScanHistory component
- [x] Authentication middleware applied
- [x] Error handling and validation

---

## Future Enhancements

- [ ] Rate limiting for password reset attempts
- [ ] Email verification for new emails
- [ ] 2-factor authentication (TOTP/SMS)
- [ ] Login history and session management
- [ ] Activity audit log
- [ ] Account deletion
- [ ] Profile picture upload
- [ ] Email notification preferences
- [ ] Export trading history as CSV/PDF
- [ ] Trading statistics calculation
- [ ] Advanced filtering options

---

**Last Updated:** January 31, 2026  
**Version:** 1.0 - Production Ready
