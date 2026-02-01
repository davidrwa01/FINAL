# 👤 Profile System - Visual Reference Guide

**Design mockup and component structure reference**

---

## 🎨 Color Palette

```
PRIMARY COLORS:
┌─────────────────┬────────────────────┬──────────────────┐
│ #0B0B0B         │ #1A1A1A            │ #FFD700          │
│ BLACK (Main BG) │ DARK GRAY (Cards)  │ YELLOW (Accent)  │
└─────────────────┴────────────────────┴──────────────────┘

STATUS COLORS:
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ #00D26A      │ #FFC107      │ #FF4757      │ #1E90FF      │
│ GREEN        │ YELLOW       │ RED          │ BLUE         │
│ (Success)    │ (Warning)    │ (Danger)     │ (Info)       │
└──────────────┴──────────────┴──────────────┴──────────────┘

NEUTRAL COLORS:
┌──────────────┬──────────────┬──────────────┐
│ #FFFFFF      │ #888888      │ #333333      │
│ WHITE        │ GRAY         │ BORDER       │
│ (Text)       │ (Secondary)  │ (Lines)      │
└──────────────┴──────────────┴──────────────┘
```

---

## 📱 Profile Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ PROFILE HEADER                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [YY]  Ihirwe Bruno Prince         ✅ VIP Active           │
│        @davidrwa                   📌 Approved              │
│                                                             │
│  Member Since: Jan 25, 2026 | Last Login: Today | User    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Account] [Subscription] [History] [Security]             │
│  ═════════                                                  │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ ACCOUNT INFORMATION                         [Edit] │   │
│  ├────────────────────────────────────────────────────┤   │
│  │ Full Name       │ Ihirwe Bruno Prince             │   │
│  │ Username        │ @davidrwa (Admin approval)      │   │
│  │ 📧 Email        │ bruno@smartkorafx.com           │   │
│  │ 📱 Phone        │ Not provided                    │   │
│  │ Created         │ Jan 25, 2026                    │   │
│  │ Status          │ Approved                        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  [Save Changes]  [Cancel]                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                  Logout  [Log Out in Red]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Subscription Tab Structure

```
┌─────────────────────────────────────────────────────────────┐
│ SUBSCRIPTION & TRIAL                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [Status] ✅ Active Subscription                            │
│                                                             │
│ ┌──────────┬──────────┬──────────┬──────────┐             │
│ │VIP Plan  │ Active   │ Jan 30   │ Feb 20   │             │
│ └──────────┴──────────┴──────────┴──────────┘             │
│                                                             │
│ [Subscription]  [Trial Usage]                              │
│ ═══════════════                                             │
│                                                             │
│ ┌───────────────────────────────────────┐                 │
│ │ 21 days remaining                  ⭕ │                 │
│ │ Renewal on Feb 20, 2026            21 │                 │
│ │                                    day │                 │
│ └───────────────────────────────────────┘                 │
│                                                             │
│ Plan Features:                                              │
│  ✓ Unlimited signals                                       │
│  ✓ Personal consultant                                     │
│  ✓ API access                                              │
│  ✓ Advanced analytics                                      │
│                                                             │
│ [Upgrade Plan] [Cancel Subscription]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 History Tab Structure

```
┌─────────────────────────────────────────────────────────────┐
│ SCAN HISTORY                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────┬─────────┬──────────┐                             │
│  │ 127 │ 4       │ 66.67%   │  1.85:1                    │
│  │Scans│ ThisWk  │ Win Rate │  Avg R:R                   │
│  └─────┴─────────┴──────────┘                             │
│                                                             │
│  [🔍 Signal Type: All ▼] [Pair: All ▼] [Range: All ▼]   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Pair    │ Signal  │ Conf │ Entry  │ SL    │ TP     │  │
│  ├─────────┼─────────┼──────┼────────┼───────┼────────┤  │
│  │BTC/USDT │ 🟢 BUY  │ 87%  │ 42850  │ 42100 │ 44200  │  │
│  │ETH/USDT │ 🔴 SELL │ 72%  │ 2420   │ 2580  │ 2100   │  │
│  │XAU/USD  │ 🟢 BUY  │ 65%  │ 2095   │ 2050  │ 2150   │  │
│  │EUR/USD  │ ⚪ WAIT │ 45%  │ —      │ —     │ —      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Mobile View (Cards):                                      │
│  ┌────────────────────────────┐                           │
│  │ BTC/USDT                  │                           │
│  │ Jan 30, 2:15 PM          │                           │
│  │ 🟢 BUY    Confidence 87%  │                           │
│  │ Entry: 42850  SL: 42100   │                           │
│  │ TP: 44200     [👁] [⬇️]   │                           │
│  └────────────────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Tab Structure

```
┌─────────────────────────────────────────────────────────────┐
│ SECURITY                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [Change Password] [Forgot Password] [Active Sessions]      │
│ ═════════════════                                           │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Current Password:   [••••••••] [👁]                  │  │
│ │                                                       │  │
│ │ New Password:       [••••••••] [👁]                  │  │
│ │                     ✓ 8+ chars  ✓ Uppercase         │  │
│ │                     ✓ Number    ✓ Special char      │  │
│ │                                                       │  │
│ │ Confirm Password:   [••••••••] [👁]                  │  │
│ │                                                       │  │
│ │ [Update Password]                                    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Or use "Send Password Reset Link" to verify via email      │
│                                                             │
│ Active Sessions:                                            │
│ ┌────────────────────────────────────────────────────┐    │
│ │ This Device (Windows • Chrome)  ● CURRENT         │    │
│ │ Last active: Just now                             │    │
│ └────────────────────────────────────────────────────┘    │
│                                                             │
│ [Logout from All Devices]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Forgot Password Flow

```
STEP 1: Email Entry
┌─────────────────────────────────────────┐
│ 👤 RESET PASSWORD                       │
│                                         │
│ Enter your email to receive a reset    │
│ code                                    │
│                                         │
│ Email Address:                          │
│ [📧 your@email.com        ]             │
│                                         │
│ [Send Reset Code]                       │
│                                         │
│ < Back to Login                         │
└─────────────────────────────────────────┘

          ↓↓↓ Email Sent ↓↓↓

STEP 2: OTP Verification
┌─────────────────────────────────────────┐
│ ℹ️ Code sent to your*****.com          │
│                                         │
│ Verification Code:                      │
│ [000000]  (6-digit input)               │
│                                         │
│ [Verify Code]                           │
│                                         │
│ Resend in 45s                           │
│ < Back to Login                         │
└─────────────────────────────────────────┘

          ↓↓↓ OTP Valid ↓↓↓

STEP 3: New Password
┌─────────────────────────────────────────┐
│ Create a new strong password            │
│                                         │
│ New Password:   [••••••••] [👁]         │
│                 ✓ 8+ characters        │
│                 ✓ One uppercase        │
│                 ✓ One number           │
│                 ✓ One special char     │
│                                         │
│ Confirm Password: [••••••••] [👁]      │
│                                         │
│ [Reset Password]                        │
│ < Back to Login                         │
└─────────────────────────────────────────┘

      ↓↓↓ Password Set ↓↓↓

STEP 4: Success
┌─────────────────────────────────────────┐
│           ✅ SUCCESS                    │
│                                         │
│ Password Reset Successful!              │
│                                         │
│ You can now login with your new         │
│ password.                               │
│                                         │
│ [Back to Login]                         │
└─────────────────────────────────────────┘
```

---

## 🎯 Component Tree

```
App.jsx
├── Profile.jsx
│   ├── ProfileHeader.jsx
│   │   ├── Avatar (Initials)
│   │   ├── User Info Display
│   │   ├── Status Badges
│   │   └── Account Details
│   │
│   ├── Tab Navigation
│   │   ├── Account Tab
│   │   ├── Subscription Tab
│   │   ├── History Tab
│   │   └── Security Tab
│   │
│   ├── AccountInformation.jsx
│   │   ├── Edit Button
│   │   ├── Form Fields
│   │   ├── Save/Cancel Buttons
│   │   └── Status Messages
│   │
│   ├── SubscriptionCard.jsx
│   │   ├── Status Alert
│   │   ├── Tab Switcher
│   │   ├── Plan Details Grid
│   │   ├── Days Remaining Timer
│   │   ├── Trial Progress Bar
│   │   ├── Features List
│   │   └── Action Buttons
│   │
│   ├── ScanHistory.jsx
│   │   ├── Quick Stats Row
│   │   ├── Filters Section
│   │   ├── History Table/Cards
│   │   ├── Signal Badges
│   │   ├── Result Indicators
│   │   └── Actions (View/Download)
│   │
│   ├── SecuritySettings.jsx
│   │   ├── Tab Navigation
│   │   ├── Change Password Form
│   │   ├── Requirements Checklist
│   │   ├── Forgot Password Link
│   │   ├── Sessions Display
│   │   └── Status Messages
│   │
│   └── Logout Button

ForgotPassword.jsx
├── Step Indicator
├── Step 1: Email Entry
│   └── Form + Submit
├── Step 2: OTP Verification
│   ├── OTP Input
│   ├── Resend Timer
│   └── Submit
├── Step 3: Password Creation
│   ├── New Password Field
│   ├── Confirm Password Field
│   ├── Requirements Checklist
│   └── Submit
└── Step 4: Success
    └── Back to Login Button
```

---

## 🔘 Button States

```
PRIMARY BUTTON (Yellow)
┌──────────────────────────────────────┐
│ Default       │ Hover       │ Active │
├──────────────────────────────────────┤
│ #FFD700       │ #FFC600     │ #F0B800│
│ Full opacity  │ Brighter    │ Darker │
└──────────────────────────────────────┘

SECONDARY BUTTON (Gray)
┌──────────────────────────────────────┐
│ Default       │ Hover       │ Active │
├──────────────────────────────────────┤
│ #333 border   │ #555 border │ #888   │
│ Gray text     │ White text  │ White  │
└──────────────────────────────────────┘

DANGER BUTTON (Red)
┌──────────────────────────────────────┐
│ Default          │ Hover             │
├──────────────────────────────────────┤
│ #FF4757 (20%)    │ #FF4757 (30%)     │
│ Red background   │ Darker red        │
│ Red text         │ Red text          │
└──────────────────────────────────────┘
```

---

## 📏 Spacing & Layout

```
HEADER SPACING:
┌─────────────────────────────────────┐
│ py-8 (32px top/bottom)              │
│ px-4 (16px sides)                   │
│ max-w-4xl (56rem max width)         │
│ mx-auto (centered)                  │
└─────────────────────────────────────┘

CARD SPACING:
┌─────────────────────────────────────┐
│ p-6 md:p-8 (24px / 32px padding)   │
│ rounded-xl (12px border radius)     │
│ border border-gray-800              │
│ bg-gray-900/50 (semi-transparent)  │
│ space-y-6 (24px between items)     │
└─────────────────────────────────────┘

FORM SPACING:
┌─────────────────────────────────────┐
│ Input height: py-3 (12px vertical)  │
│ Input padding: px-4 (16px horizontal)│
│ Label margin: mb-2 (8px below)      │
│ Gap between inputs: space-y-6 (24px)│
│ Gap between sections: mt-6 (24px)  │
└─────────────────────────────────────┘
```

---

## 🎭 Status Badge Styles

```
SUBSCRIPTION BADGES:
┌──────────────┬──────────────┬──────────────┐
│ 🟢 ACTIVE    │ 🟡 PENDING   │ 🔴 EXPIRED   │
│ Green BG     │ Yellow BG    │ Red BG       │
│ Green Text   │ Yellow Text  │ Red Text     │
│ CheckCircle  │ Clock icon   │ AlertCircle  │
└──────────────┴──────────────┴──────────────┘

APPROVAL BADGES:
┌──────────────────────────────────────┐
│ ✓ APPROVED          ⏳ PENDING       │
│ Green background    Yellow background │
│ Green text          Yellow text       │
└──────────────────────────────────────┘

SIGNAL BADGES:
┌──────────────┬──────────────┬──────────────┐
│ 🟢 BUY       │ 🔴 SELL      │ ⚪ WAIT      │
│ Green (Buy)  │ Red (Sell)   │ Gray (Wait)  │
│ TrendingUp   │ TrendingDown │ AlertCircle  │
└──────────────┴──────────────┴──────────────┘

RESULT BADGES:
┌──────────────┬──────────────┬──────────────┐
│ ✓ WIN        │ ✗ LOSS       │ ⏳ PENDING   │
│ Green        │ Red          │ Gray         │
│ Checkmark    │ X icon       │ Clock        │
└──────────────┴──────────────┴──────────────┘
```

---

## 📱 Mobile Optimization

```
DESKTOP (>1024px)
┌─────────────────────────────────────┐
│ HEADER (fixed) - Side by side       │
│─────────────────────────────────────│
│ TABS (horizontal)                   │
│─────────────────────────────────────│
│ CONTENT (full width)                │
│                                     │
│ │ Column 1  │ Column 2  │ Column 3 │
│ └───────────┴───────────┴──────────│
│                                     │
│ HISTORY TABLE: 8 columns            │
└─────────────────────────────────────┘

TABLET (768-1024px)
┌─────────────────────────────────────┐
│ HEADER (fixed)                      │
│─────────────────────────────────────│
│ TABS (horizontal)                   │
│─────────────────────────────────────│
│ CONTENT (full width)                │
│                                     │
│ │ Column 1  │ Column 2  │           │
│ └───────────┴───────────┘           │
│                                     │
│ HISTORY: Hybrid card/table          │
└─────────────────────────────────────┘

MOBILE (<768px)
┌──────────────────┐
│ HEADER           │
├──────────────────┤
│ TABS (stacked)   │
│ or scrollable    │
├──────────────────┤
│ CONTENT          │
│ (stacked cards)  │
│                  │
│ [Card 1]         │
│ [Card 2]         │
│ [Card 3]         │
│                  │
│ HISTORY: Cards   │
│ (one per row)    │
│                  │
│ [Scan 1]         │
│ [Scan 2]         │
│ [Scan 3]         │
│                  │
│ [Actions]        │
└──────────────────┘
```

---

## 🎨 Icon Reference

| Icon | Usage | Color |
|------|-------|-------|
| User | Profile button | Gray → Yellow on hover |
| Mail | Email field | Gray |
| Lock | Password field | Gray |
| Eye / EyeOff | Show/hide password | Gray |
| CheckCircle | Status badges, requirements | Green |
| AlertCircle | Warnings, errors | Yellow/Red |
| LogOut | Logout button | Gray → Yellow on hover |
| Calendar | Date display | Gray |
| RefreshCw | Loading state | Yellow (animate) |
| TrendingUp | BUY signal | Green |
| TrendingDown | SELL signal | Red |
| Filter | Filter section | Gray |
| Download | Download action | Gray → Yellow on hover |
| Smartphone | Phone field | Gray |
| Package | Subscription plan | Yellow |

---

## 🔗 Navigation Flow

```
Login Page
  ↓ Forgot password link
  └─→ /forgot-password → Success → /login

Profile Navigation
  ├─ From TradingDashboard (User icon) → /profile
  ├─ From AdminDashboard (User icon) → /profile
  └─ From Profile:
      ├─ Account Tab (edit) → Save
      ├─ Subscription Tab → Upgrade → /subscribe
      ├─ History Tab (no navigation)
      ├─ Security Tab → Reset link → /forgot-password
      └─ Logout button → /login

Profile Routes
  /profile               (protected)
  /forgot-password      (public)
  /login                (public)
  /register             (public)
  /trading              (protected + approved)
  /subscribe            (protected + approved)
  /admin                (protected + admin)
  /pending-approval     (protected)
```

---

## 🎯 Responsive Grid System

```
SINGLE COLUMN (Mobile)
┌──────────────────┐
│ Full width card  │
│ Padding: 16px    │
└──────────────────┘

TWO COLUMNS (Tablet)
┌────────────┬────────────┐
│ Card 1     │ Card 2     │
│ Gap: 16px  │ Gap: 16px  │
├────────────┼────────────┤
│ Card 3     │ Card 4     │
└────────────┴────────────┘

FOUR COLUMNS (Desktop Stats)
┌──────┬──────┬──────┬──────┐
│Card 1│Card 2│Card 3│Card 4│
│Gap:  │16px  │      │      │
└──────┴──────┴──────┴──────┘

EIGHT COLUMNS (Desktop Table)
┌────┬────┬────┬────┬────┬────┬────┬────┐
│Col1│Col2│Col3│Col4│Col5│Col6│Col7│Col8│
│Gap:  12px between columns              │
└────┴────┴────┴────┴────┴────┴────┴────┘
```

---

**Visual Reference Complete!**

Use this guide alongside the component code to understand layout, spacing, and design decisions.

Last Updated: January 31, 2026 ✅
