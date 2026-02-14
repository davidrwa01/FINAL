/**
 * services/analysisService.js (UPDATED)
 * 
 * Integrates with the new backend analysis routes.
 * Handles all symbol types: crypto, forex, gold, indices.
 * 
 * ✅ Uses correct endpoint paths
 * ✅ Proper error handling with fallbacks
 * ✅ Comprehensive signal generation
 * ✅ Works with synthetic data when APIs fail
 */

import marketDataService from './marketDataService';

class AnalysisService {
  constructor() {
    this.apiBaseUrl = '/api/analysis';
    this.analysisCache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
  }

  /**
   * Main method: Generate complete live signal
   * Fetches market data → analyzes → generates signal
   * Works for all symbol types (crypto, forex, gold, indices)
   */
  async generateLiveSignal(symbol, timeframe = 'H1', accountSize = 10000) {
    if (!symbol || !timeframe) {
      return this._errorSignal('Missing symbol or timeframe');
    }

    try {
      console.log(`🚀 Generating live signal for ${symbol}/${timeframe}...`);

      // Check cache first
      const cacheKey = `${symbol}:${timeframe}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        console.log(`📦 Using cached signal for ${symbol}`);
        return cached;
      }

      // 1. Get market series (OHLC data)
      console.log(`📊 Fetching market series for ${symbol}...`);
      const seriesData = await this._getMarketSeries(symbol, timeframe);
      
      if (!seriesData || seriesData.length < 20) {
        return this._errorSignal(`Insufficient data for ${symbol} (need 20+ candles)`);
      }

      // 2. Run full analysis
      console.log(`🔍 Running analysis...`);
      const analysis = await this._analyzeSymbol(symbol, timeframe, seriesData);

      if (!analysis) {
        return this._errorSignal('Analysis failed');
      }

      // 3. Get position sizing
      console.log(`💰 Calculating position sizing...`);
      const riskData = await this._getPositionSizing(symbol, timeframe, accountSize);

      // 4. Combine all data
      const completeSignal = this._buildCompleteSignal(
        symbol,
        timeframe,
        analysis,
        riskData,
        seriesData
      );

      console.log(`✅ Signal generated:`, completeSignal);

      // Cache the result
      this._saveToCache(cacheKey, completeSignal);

      return completeSignal;

    } catch (error) {
      console.error(`❌ Live signal error for ${symbol}:`, error);
      return this._errorSignal(error.message || 'Signal generation failed');
    }
  }

  /**
   * Fetch market series (OHLC candles)
   * Uses /api/analysis/analyze/:symbol/:timeframe endpoint
   */
  async _getMarketSeries(symbol, timeframe, limit = 120) {
    try {
      const normalizedTF = this._normalizeTimeframe(timeframe);
      const url = `${this.apiBaseUrl}/analyze/${symbol}/${normalizedTF}?limit=${limit}`;

      console.log(`📡 Fetching from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || 'No data returned');
      }

      // Extract klines from analysis data
      const analysis = result.data;
      
      // If we got the full analysis, extract the series
      if (analysis.series && Array.isArray(analysis.series)) {
        return analysis.series;
      }

      // Otherwise try to get from market service
      return await marketDataService.getMarketSeries(symbol, timeframe, limit);

    } catch (error) {
      console.warn(`⚠️ Failed to fetch series: ${error.message}`);
      
      // Fallback: Use market data service
      try {
        return await marketDataService.getMarketSeries(symbol, timeframe, limit);
      } catch (fallbackError) {
        console.error(`❌ Fallback also failed: ${fallbackError.message}`);
        return null;
      }
    }
  }

  /**
   * Run SMC analysis via backend
   * POST /api/analysis/analyze-smc
   */
  async _analyzeSymbol(symbol, timeframe, klines) {
    try {
      if (!klines || klines.length < 20) {
        throw new Error('Insufficient candles for analysis');
      }

      const response = await fetch(`${this.apiBaseUrl}/analyze-smc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol,
          timeframe,
          limit: klines.length
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Analysis error ${response.status}:`, errorText);
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Analysis returned no data');
      }

      console.log(`✅ Analysis complete for ${symbol}`);
      return result.data;

    } catch (error) {
      console.error(`❌ Analysis error:`, error.message);
      
      // Return null to trigger error signal
      return null;
    }
  }

  /**
   * Get position sizing via backend
   * GET /api/analysis/position-sizing/:symbol/:timeframe
   */
  async _getPositionSizing(symbol, timeframe, accountSize) {
    try {
      const normalizedTF = this._normalizeTimeframe(timeframe);
      const url = `${this.apiBaseUrl}/position-sizing/${symbol}/${normalizedTF}?accountSize=${accountSize}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn(`⚠️ Position sizing failed: ${response.status}`);
        return null;
      }

      const result = await response.json();
      return result.data?.risk || null;

    } catch (error) {
      console.warn(`⚠️ Position sizing error: ${error.message}`);
      return null;
    }
  }

  /**
   * Build complete signal from all data sources
   */
  _buildCompleteSignal(symbol, timeframe, analysis, riskData, klines) {
    const currentPrice = klines[klines.length - 1].close;

    return {
      // Basic info
      symbol: symbol,
      displaySymbol: marketDataService.prettySymbol(symbol),
      timeframe: timeframe,
      timestamp: new Date().toISOString(),

      // Signal
      signal: analysis.signal || {
        direction: 'WAIT',
        confidence: 0,
        entry: currentPrice,
        stopLoss: 0,
        tp1: 0,
        tp2: 0,
        rr: '0.00',
        reason: 'No clear signal'
      },

      // Confluence
      confluence: analysis.confluence || {
        direction: 'WAIT',
        confidence: 0,
        totalScore: 0,
        breakdown: []
      },

      // Indicators
      indicators: {
        currentPrice: currentPrice,
        rsi: analysis.indicators?.rsi || 50,
        ema20: analysis.indicators?.ema20 || currentPrice,
        ema50: analysis.indicators?.ema50 || currentPrice,
        ema200: analysis.indicators?.ema200 || currentPrice,
        atr: analysis.indicators?.atr || 0,
        support: analysis.indicators?.support || currentPrice * 0.98,
        resistance: analysis.indicators?.resistance || currentPrice * 1.02,
        macd: analysis.indicators?.macd || { trending: 'NEUTRAL' }
      },

      // SMC
      smc: analysis.smc || {
        marketBias: 'NEUTRAL',
        structure: 'RANGING',
        activeOrderBlocks: [],
        activeFVGs: [],
        summary: {
          bosCount: 0,
          chochCount: 0,
          activeOrderBlocks: 0,
          activeFVGs: 0
        }
      },

      // Risk management
      risk: riskData || {
        positionSize: 0,
        riskAmount: 0,
        accountRiskPercent: '0.00',
        expectancy: '0.00',
        recommendation: 'No data'
      },

      // Data source
      dataSource: analysis.dataSource || 'UNKNOWN',

      // Convenience fields for display
      direction: analysis.signal?.direction || 'WAIT',
      confidence: analysis.confluence?.confidence || 0,
      entry: analysis.signal?.entry || currentPrice,
      stopLoss: analysis.signal?.stopLoss || 0,
      tp1: analysis.signal?.tp1 || 0,
      tp2: analysis.signal?.tp2 || 0,
      rr: analysis.signal?.rr || '0.00'
    };
  }

  /**
   * Error signal structure
   */
  _errorSignal(message) {
    return {
      error: message,
      signal: {
        direction: 'WAIT',
        confidence: 0,
        entry: 0,
        stopLoss: 0,
        tp1: 0,
        tp2: 0,
        rr: '0.00',
        reason: message
      },
      confluence: {
        direction: 'WAIT',
        confidence: 0,
        totalScore: 0
      },
      indicators: {
        currentPrice: 0,
        rsi: 50,
        ema20: 0,
        ema50: 0,
        support: 0,
        resistance: 0
      },
      smc: {
        marketBias: 'NEUTRAL',
        structure: 'UNKNOWN',
        activeOrderBlocks: [],
        activeFVGs: []
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Quick signal - just direction and confidence
   * GET /api/analysis/quick-signal/:symbol/:timeframe
   */
  async getQuickSignal(symbol, timeframe = 'H1') {
    try {
      const normalizedTF = this._normalizeTimeframe(timeframe);
      const url = `${this.apiBaseUrl}/quick-signal/${symbol}/${normalizedTF}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'No signal');
      }

      return result.data;

    } catch (error) {
      console.error(`❌ Quick signal error:`, error);
      return this._errorSignal(error.message);
    }
  }

  /**
   * Get only SMC analysis
   * GET /api/analysis/smc/:symbol/:timeframe
   */
  async getSMCAnalysis(symbol, timeframe = 'H1') {
    try {
      const normalizedTF = this._normalizeTimeframe(timeframe);
      const url = `${this.apiBaseUrl}/smc/${symbol}/${normalizedTF}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'No SMC data');
      }

      return result.data.smc;

    } catch (error) {
      console.error(`❌ SMC analysis error:`, error);
      return null;
    }
  }

  /**
   * Get only technical indicators
   * GET /api/analysis/indicators/:symbol/:timeframe
   */
  async getIndicators(symbol, timeframe = 'H1') {
    try {
      const normalizedTF = this._normalizeTimeframe(timeframe);
      const url = `${this.apiBaseUrl}/indicators/${symbol}/${normalizedTF}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'No indicator data');
      }

      return result.data.indicators;

    } catch (error) {
      console.error(`❌ Indicators error:`, error);
      return null;
    }
  }

  /**
   * Get confluence analysis
   * GET /api/analysis/confluence/:symbol/:timeframe
   */
  async getConfluence(symbol, timeframe = 'H1') {
    try {
      const normalizedTF = this._normalizeTimeframe(timeframe);
      const url = `${this.apiBaseUrl}/confluence/${symbol}/${normalizedTF}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'No confluence data');
      }

      return result.data.confluence;

    } catch (error) {
      console.error(`❌ Confluence error:`, error);
      return null;
    }
  }

  /**
   * Format signal for display
   */
  formatSignalDisplay(signalData) {
    if (!signalData || signalData.error) {
      return {
        status: 'error',
        message: signalData?.error || 'No signal available',
        signal: 'WAIT'
      };
    }

    const signal = signalData.signal || signalData;
    const confidence = signalData.confluence?.confidence || signalData.confidence || 0;

    return {
      symbol: signalData.displaySymbol || marketDataService.prettySymbol(signalData.symbol),
      timeframe: signalData.timeframe || 'H1',
      signal: signal.direction || 'WAIT',
      confidence: confidence,
      entry: marketDataService.formatPrice(signal.entry || 0),
      stopLoss: marketDataService.formatPrice(signal.stopLoss || 0),
      tp1: marketDataService.formatPrice(signal.tp1 || 0),
      tp2: marketDataService.formatPrice(signal.tp2 || 0),
      rr: signal.rr || '0.00',
      reason: signal.reason || 'No reason provided',
      
      // Indicators
      currentPrice: marketDataService.formatPrice(signalData.indicators?.currentPrice || 0),
      rsi: Math.round(signalData.indicators?.rsi || 50),
      ema20: marketDataService.formatPrice(signalData.indicators?.ema20 || 0),
      ema50: marketDataService.formatPrice(signalData.indicators?.ema50 || 0),
      
      // Colors and icons
      color: this._getSignalColor(signal.direction),
      icon: this._getSignalIcon(signal.direction),
      
      // Timestamp
      timestamp: new Date(signalData.timestamp || Date.now()).toLocaleTimeString(),
      
      // SMC summary
      smcBias: signalData.smc?.marketBias || 'NEUTRAL',
      structure: signalData.smc?.structure || 'UNKNOWN'
    };
  }

  /**
   * Helper: Get signal color
   */
  _getSignalColor(direction) {
    switch (direction) {
      case 'BUY': return '#00D26A';    // Green
      case 'SELL': return '#FF4757';   // Red
      case 'WAIT': return '#888888';   // Gray
      default: return '#888888';
    }
  }

  /**
   * Helper: Get signal icon
   */
  _getSignalIcon(direction) {
    switch (direction) {
      case 'BUY': return '📈';
      case 'SELL': return '📉';
      case 'WAIT': return '⏸️';
      default: return '❓';
    }
  }

  /**
   * Helper: Normalize timeframe
   */
  _normalizeTimeframe(timeframe) {
    const map = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w',
      'M1': '1m', 'M5': '5m', 'M15': '15m', 'M30': '30m',
      'H1': '1h', 'H4': '4h', 'D1': '1d', 'W1': '1w'
    };
    return map[timeframe] || '1h';
  }

  /**
   * Cache management
   */
  _getFromCache(key) {
    const cached = this.analysisCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.analysisCache.delete(key);
      return null;
    }

    return cached.data;
  }

  _saveToCache(key, data) {
    this.analysisCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.analysisCache.clear();
    console.log('✅ Analysis cache cleared');
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        method: 'GET'
      });

      if (!response.ok) {
        return { status: 'unhealthy', code: response.status };
      }

      const result = await response.json();
      return { status: 'healthy', ...result };

    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

export default new AnalysisService();