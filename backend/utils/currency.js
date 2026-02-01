const axios = require('axios');

// Cache for exchange rates
let cachedRate = null;
let lastFetchTime = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Get USD to RWF exchange rate with caching
 * @returns {Promise<number>} Exchange rate
 */
async function getUSDtoRWFRate() {
  try {
    // Check if we have a valid cached rate
    if (cachedRate && lastFetchTime) {
      const timeSinceLastFetch = Date.now() - lastFetchTime;
      if (timeSinceLastFetch < CACHE_DURATION) {
        console.log('Using cached exchange rate:', cachedRate);
        return cachedRate;
      }
    }

    // Fetch fresh rate from API
    const apiUrl = process.env.CURRENCY_API_URL || 'https://api.exchangerate-api.com/v4/latest/USD';
    console.log('Fetching fresh exchange rate from API...');
    
    const response = await axios.get(apiUrl, { timeout: 5000 });
    
    if (response.data && response.data.rates && response.data.rates.RWF) {
      cachedRate = response.data.rates.RWF;
      lastFetchTime = Date.now();
      console.log('Fresh exchange rate fetched:', cachedRate);
      return cachedRate;
    }

    throw new Error('Invalid API response structure');
  } catch (error) {
    console.error('Error fetching exchange rate:', error.message);
    
    // Fallback to cached rate if available
    if (cachedRate) {
      console.log('Using stale cached rate due to API error:', cachedRate);
      return cachedRate;
    }

    // Final fallback: approximate rate (update this periodically)
    const fallbackRate = 1350; // Approximate USD to RWF rate as of Jan 2026
    console.log('Using fallback exchange rate:', fallbackRate);
    return fallbackRate;
  }
}

/**
 * Convert USD amount to RWF
 * @param {number} amountUSD - Amount in USD
 * @returns {Promise<{amountRWF: number, rate: number}>}
 */
async function convertUSDtoRWF(amountUSD) {
  const rate = await getUSDtoRWFRate();
  const amountRWF = Math.round(amountUSD * rate);
  
  return {
    amountRWF,
    rate
  };
}

/**
 * Get formatted currency display
 * @param {number} amountUSD - Amount in USD
 * @returns {Promise<object>}
 */
async function getFormattedCurrency(amountUSD) {
  const { amountRWF, rate } = await convertUSDtoRWF(amountUSD);
  
  return {
    usd: {
      amount: amountUSD,
      formatted: `$${amountUSD.toFixed(2)}`,
      currency: 'USD'
    },
    rwf: {
      amount: amountRWF,
      formatted: `${amountRWF.toLocaleString('en-US')} FRW`,
      currency: 'RWF'
    },
    exchangeRate: rate,
    lastUpdated: lastFetchTime ? new Date(lastFetchTime).toISOString() : null
  };
}

/**
 * Clear the exchange rate cache (useful for testing or manual refresh)
 */
function clearCache() {
  cachedRate = null;
  lastFetchTime = null;
  console.log('Exchange rate cache cleared');
}

module.exports = {
  getUSDtoRWFRate,
  convertUSDtoRWF,
  getFormattedCurrency,
  clearCache
};
