/**
 * Analysis Service
 * Handles SMC analysis and signal generation
 */

import marketDataService from './marketDataService';

class AnalysisService {
  constructor() {
    this.analysisCache = {};
  }

  // Send klines to backend for SMC analysis
  async analyzeSMC(klines) {
    try {
      const response = await fetch('/api/analysis/analyze-smc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klines })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Analysis failed');
      }

      return data.data;
    } catch (error) {
      console.error('SMC analysis error:', error);
      return null;
    }
  }

  // Generate live signal from analysis
  async generateSignal(analysis, currentPrice, symbol, timeframe = 'H1') {
    try {
      const response = await fetch('/api/analysis/generate-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          currentPrice,
          symbol,
          timeframe
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signal generation failed');
      }

      return data.data;
    } catch (error) {
      console.error('Signal generation error:', error);
      return null;
    }
  }

  // Full pipeline: fetch data → analyze → generate signal
  async generateLiveSignal(symbol, timeframe = 'H1') {
    try {
      // 1. Get market series (klines)
      const klines = await marketDataService.getMarketSeries(symbol, timeframe, 120);

      if (!klines || klines.length < 5) {
        return {
          error: 'Insufficient market data',
          signal: 'WAIT',
          confidence: 0
        };
      }

      // 2. Perform SMC analysis
      const analysis = await this.analyzeSMC(klines);

      if (!analysis) {
        return {
          error: 'Analysis failed',
          signal: 'WAIT',
          confidence: 0
        };
      }

      // 3. Get current price
      const currentPrice = await marketDataService.getCurrentPrice(symbol);

      if (!currentPrice) {
        return {
          error: 'Price unavailable',
          signal: 'WAIT',
          confidence: 0
        };
      }

      // 4. Generate signal
      const signal = await this.generateSignal(
        analysis,
        currentPrice,
        symbol,
        timeframe
      );

      if (!signal) {
        return {
          error: 'Signal generation failed',
          signal: 'WAIT',
          confidence: 0
        };
      }

      return signal;
    } catch (error) {
      console.error('Live signal generation error:', error);
      return {
        error: error.message,
        signal: 'WAIT',
        confidence: 0
      };
    }
  }

  // Format signal for display
  formatSignalDisplay(signalData) {
    if (!signalData) return null;

    const displayData = {
      symbol: marketDataService.prettySymbol(signalData.symbol),
      timeframe: signalData.timeframe || 'H1',
      signal: signalData.signal,
      confidence: signalData.confidence,
      entry: marketDataService.formatPrice(signalData.entry),
      stopLoss: marketDataService.formatPrice(signalData.stopLoss),
      takeProfit: marketDataService.formatPrice(signalData.takeProfit),
      riskReward: signalData.riskReward,
      reason: signalData.reason,
      currentPrice: marketDataService.formatPrice(signalData.analysis?.currentPrice),
      rsi: Math.round(signalData.analysis?.rsi || 0),
      timestamp: new Date(signalData.timestamp).toLocaleTimeString()
    };

    // Add color based on signal
    if (signalData.signal === 'BUY') {
      displayData.color = '#00D26A'; // Green
      displayData.icon = '📈';
    } else if (signalData.signal === 'SELL') {
      displayData.color = '#FF4757'; // Red
      displayData.icon = '📉';
    } else {
      displayData.color = '#888888'; // Gray
      displayData.icon = '⏸️';
    }

    return displayData;
  }
}

export default new AnalysisService();
