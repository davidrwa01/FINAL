import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth services
export const authService = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  
  checkStatus: async () => {
    const response = await api.get('/auth/status');
    return response.data;
  },
};

// Subscription services
export const subscriptionService = {
  getPlans: async () => {
    const response = await api.get('/subscription/plans');
    return response.data;
  },
  
  subscribe: async (formData) => {
    const response = await api.post('/subscription/subscribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getStatus: async () => {
    const response = await api.get('/subscription/status');
    return response.data;
  },
  
  getHistory: async () => {
    const response = await api.get('/subscription/history');
    return response.data;
  },
};

// Signal services
export const signalService = {
  generate: async (data) => {
    const response = await api.post('/signals/generate', data);
    return response.data;
  },
  
  checkAccess: async () => {
    const response = await api.get('/signals/check-access');
    return response.data;
  },
  
  getUsageStats: async () => {
    const response = await api.get('/signals/usage-stats');
    return response.data;
  },
  
  getMarketData: async (symbols) => {
    const response = await api.get('/signals/market-data/' + JSON.stringify(symbols));
    return response.data;
  },
  
  getKlines: async (symbol, interval, limit) => {
    const response = await api.get(`/signals/klines/${symbol}/${interval}/${limit}`);
    return response.data;
  },
};

// Market data services
// Normalize timeframe format (H1 → 1h, H4 → 4h, D1 → 1d, M5 → 5m, etc)
function normalizeTimeframe(tf) {
  if (typeof tf !== 'string') return '1h';
  const upperTf = tf.toUpperCase();
  // Already normalized
  if (['1M', '5M', '15M', '30M', '1H', '4H', '1D', '1W'].includes(upperTf)) return upperTf.toLowerCase();
  // Convert format
  return upperTf
    .replace('H1', '1h')
    .replace('H4', '4h')
    .replace('D1', '1d')
    .replace('M30', '30m')
    .replace('M15', '15m')
    .replace('M5', '5m')
    .replace('M1', '1m')
    .replace('W1', '1w');
}

export const marketService = {
  getCryptoSnapshot: async () => {
    const response = await api.get('/market/crypto/snapshot');
    return response.data;
  },
  
  getForexSnapshot: async () => {
    const response = await api.get('/market/forex/snapshot');
    return response.data;
  },
  
  getMarketSeries: async (symbol, timeframe = '1h', limit = 120) => {
    // Normalize timeframe format (H1 → 1h, H4 → 4h, D1 → 1d)
    const normalizedTimeframe = normalizeTimeframe(timeframe);
    const response = await api.get('/market/series', {
      params: { symbol, timeframe: normalizedTimeframe, limit }
    });
    return response.data;
  },
  
  getBatchSnapshot: async (symbols) => {
    const response = await api.post('/market/snapshot/batch', { symbols });
    return response.data;
  },
};

// Analysis services
export const analysisService = {
  analyzeSMC: async (klines) => {
    const response = await api.post('/analysis/analyze-smc', { klines });
    return response.data;
  },
  
  generateSignal: async (analysis, currentPrice, symbol, timeframe = 'H1') => {
    const response = await api.post('/analysis/generate-signal', {
      analysis,
      currentPrice,
      symbol,
      timeframe
    });
    return response.data;
  },
};

// Admin services
export const adminService = {
  getUsers: async (params) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },
  
  approveUser: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/approve`);
    return response.data;
  },
  
  rejectUser: async (userId, reason) => {
    const response = await api.post(`/admin/users/${userId}/reject`, { reason });
    return response.data;
  },
  
  getSubscriptions: async (params) => {
    const response = await api.get('/admin/subscriptions', { params });
    return response.data;
  },
  
  approveSubscription: async (subscriptionId) => {
    const response = await api.post(`/admin/subscriptions/${subscriptionId}/approve`);
    return response.data;
  },
  
  rejectSubscription: async (subscriptionId, reason) => {
    const response = await api.post(`/admin/subscriptions/${subscriptionId}/reject`, { reason });
    return response.data;
  },
  
  getPlans: async () => {
    const response = await api.get('/admin/plans');
    return response.data;
  },
  
  savePlan: async (planData) => {
    const response = await api.post('/admin/plans', planData);
    return response.data;
  },
  
  togglePlan: async (planId) => {
    const response = await api.patch(`/admin/plans/${planId}/toggle`);
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
};

export default api;
