/**
 * services/api.js
 * 
 * Central API service — all frontend code imports from here.
 * 
 * Exports:
 *   authService          — login, register, profile, logout
 *   adminService         — admin dashboard, user/plan/subscription management
 *   signalService        — access checks & trial tracking
 *   subscriptionService  — plan & payment management
 *   marketService        — OHLCV data, snapshots
 *   analysisService      — SMC analysis, signal generation
 */

// ─── Auth Header Helper ─────────────────────────────────────
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── Base Request Helper ────────────────────────────────────
async function apiRequest(url, options = {}) {
  const config = {
    credentials: 'include',
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    const err = new Error('Network error — check your connection');
    err.response = { status: 0, data: { message: networkError.message } };
    throw err;
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    const err = new Error(`Invalid response from server (${response.status})`);
    err.response = { status: response.status, data: {} };
    throw err;
  }

  if (!response.ok) {
    const err = new Error(data.message || `Request failed (${response.status})`);
    err.response = { status: response.status, data };
    throw err;
  }

  return data;
}

// ─── Timeframe Normalizer ───────────────────────────────────
function normalizeTF(tf) {
  const map = {
    'M1':'1m','M5':'5m','M15':'15m','M30':'30m',
    'H1':'1h','H4':'4h','D1':'1d','W1':'1w',
    '1m':'1m','5m':'5m','15m':'15m','30m':'30m',
    '1h':'1h','4h':'4h','1d':'1d','1w':'1w'
  };
  return map[tf] || '1h';
}

// ═══════════════════════════════════════════════════════════
// AUTH SERVICE
// ═══════════════════════════════════════════════════════════
export const authService = {
  register(userData) {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  login(credentials) {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  getProfile() {
    return apiRequest('/api/auth/profile');
  },

  updateProfile(profileData) {
    return apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  changePassword(passwordData) {
    return apiRequest('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    });
  },

  async logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  verifyToken() {
    return apiRequest('/api/auth/verify');
  },

  setSession(token, user) {
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  },

  getToken() {
    return localStorage.getItem('token');
  },

  getStoredUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch { return null; }
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
};

// ═══════════════════════════════════════════════════════════
// ADMIN SERVICE
// ═══════════════════════════════════════════════════════════
export const adminService = {
  // ─── Dashboard Stats ──────────────────────────────────────
  getDashboardStats() {
    return apiRequest('/api/admin/dashboard-stats');
  },

  getStats() {
    return apiRequest('/api/admin/stats');
  },

  // ─── User Management ─────────────────────────────────────
  getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/users${query ? '?' + query : ''}`);
  },

  getUser(userId) {
    return apiRequest(`/api/admin/users/${userId}`);
  },

  updateUser(userId, userData) {
    return apiRequest(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  deleteUser(userId) {
    return apiRequest(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
  },

  approveUser(userId) {
    return apiRequest(`/api/admin/users/${userId}/approve`, {
      method: 'PUT'
    });
  },

  rejectUser(userId) {
    return apiRequest(`/api/admin/users/${userId}/reject`, {
      method: 'PUT'
    });
  },

  suspendUser(userId) {
    return apiRequest(`/api/admin/users/${userId}/suspend`, {
      method: 'PUT'
    });
  },

  activateUser(userId) {
    return apiRequest(`/api/admin/users/${userId}/activate`, {
      method: 'PUT'
    });
  },

  // ─── Subscription Management ──────────────────────────────
  getSubscriptions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/subscriptions${query ? '?' + query : ''}`);
  },

  getSubscription(subscriptionId) {
    return apiRequest(`/api/admin/subscriptions/${subscriptionId}`);
  },

  approveSubscription(subscriptionId) {
    return apiRequest(`/api/admin/subscriptions/${subscriptionId}/approve`, {
      method: 'PUT'
    });
  },

  rejectSubscription(subscriptionId) {
    return apiRequest(`/api/admin/subscriptions/${subscriptionId}/reject`, {
      method: 'PUT'
    });
  },

  updateSubscription(subscriptionId, data) {
    return apiRequest(`/api/admin/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // ─── Plan Management ──────────────────────────────────────
  getPlans() {
    return apiRequest('/api/admin/plans');
  },

  createPlan(planData) {
    return apiRequest('/api/admin/plans', {
      method: 'POST',
      body: JSON.stringify(planData)
    });
  },

  updatePlan(planId, planData) {
    return apiRequest(`/api/admin/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(planData)
    });
  },

  deletePlan(planId) {
    return apiRequest(`/api/admin/plans/${planId}`, {
      method: 'DELETE'
    });
  },

  // ─── Usage / Logs ─────────────────────────────────────────
  getUsageLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/usage-logs${query ? '?' + query : ''}`);
  },

  getRevenue(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/revenue${query ? '?' + query : ''}`);
  }
};

// ═══════════════════════════════════════════════════════════
// SIGNAL SERVICE
// ═══════════════════════════════════════════════════════════
export const signalService = {
  checkAccess() {
    return apiRequest('/api/signals/check-access');
  },

  generate(signalData) {
    return apiRequest('/api/signals/generate', {
      method: 'POST',
      body: JSON.stringify(signalData)
    });
  }
};

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTION SERVICE
// ═══════════════════════════════════════════════════════════
export const subscriptionService = {
  getStatus() {
    return apiRequest('/api/subscription/status');
  },

  getPlans() {
    return apiRequest('/api/subscription/plans');
  },

  subscribe(planId, paymentData) {
    return apiRequest('/api/subscription/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planId, ...paymentData })
    });
  }
};

// ═══════════════════════════════════════════════════════════
// MARKET SERVICE
// ═══════════════════════════════════════════════════════════
export const marketService = {
  getMarketSeries(symbol, timeframe = '1h', limit = 120) {
    const params = new URLSearchParams({
      symbol: String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, ''),
      timeframe: normalizeTF(timeframe),
      limit: String(Math.min(limit, 1000))
    });
    return apiRequest(`/api/market/series?${params}`);
  },

  getCryptoSnapshot() {
    return apiRequest('/api/market/crypto/snapshot');
  },

  getForexSnapshot() {
    return apiRequest('/api/market/forex/snapshot');
  },

  getMarketData(symbols) {
    return apiRequest(`/api/market/data?symbols=${symbols}`);
  }
};

// ═══════════════════════════════════════════════════════════
// ANALYSIS SERVICE
// ═══════════════════════════════════════════════════════════
export const analysisService = {
  analyzeSMC(klines) {
    return apiRequest('/api/analysis/analyze-smc', {
      method: 'POST',
      body: JSON.stringify({ klines })
    });
  },

  generateSignal(analysis, currentPrice, symbol, timeframe) {
    return apiRequest('/api/analysis/generate-signal', {
      method: 'POST',
      body: JSON.stringify({ analysis, currentPrice, symbol, timeframe })
    });
  },

  getFullAnalysis(symbol, timeframe = '1h') {
    const tf = normalizeTF(timeframe);
    return apiRequest(`/api/analysis/analyze/${symbol}/${tf}?limit=120`);
  },

  getQuickSignal(symbol, timeframe = '1h') {
    return apiRequest(`/api/analysis/quick-signal/${symbol}/${normalizeTF(timeframe)}`);
  },

  getSMC(symbol, timeframe = '1h') {
    return apiRequest(`/api/analysis/smc/${symbol}/${normalizeTF(timeframe)}`);
  },

  getIndicators(symbol, timeframe = '1h') {
    return apiRequest(`/api/analysis/indicators/${symbol}/${normalizeTF(timeframe)}`);
  },

  getConfluence(symbol, timeframe = '1h') {
    return apiRequest(`/api/analysis/confluence/${symbol}/${normalizeTF(timeframe)}`);
  },

  getPositionSizing(symbol, timeframe = '1h', accountSize = 10000) {
    return apiRequest(`/api/analysis/position-sizing/${symbol}/${normalizeTF(timeframe)}?accountSize=${accountSize}`);
  },

  healthCheck() {
    return apiRequest('/api/analysis/health');
  }
};