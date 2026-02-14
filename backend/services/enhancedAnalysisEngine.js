/**
 * SMART-KORAFX Enhanced Backend Analysis Engine
 * Improvements over client-side version:
 * - Better confluence scoring
 * - Advanced position sizing
 * - Improved SMC detection with context
 * - WebSocket ready architecture
 * - Comprehensive error handling
 * - Caching support for performance
 */

class EnhancedAnalysisEngine {
  constructor(config = {}) {
    this.config = {
      emaPeriods: [20, 50, 200],
      rsiPeriod: 14,
      macdPeriods: { fast: 12, slow: 26, signal: 9 },
      atrPeriod: 14,
      minCandlesRequired: 50,
      swingLookback: 3,
      bosLookback: 20,
      obLookback: 20,
      fvgSignificance: 0.3, // 30% of average range
      liquidityTolerance: 0.001, // 0.1%
      ...config
    };
    
    this.cache = new Map();
  }

  /**
   * Main analysis pipeline
   */
  async analyze(ohlcData, metadata = {}) {
    try {
      if (!this.validateInput(ohlcData)) {
        throw new Error('Invalid OHLC data: insufficient data or missing required fields');
      }

      const analysis = {
        timestamp: new Date().toISOString(),
        symbol: metadata.symbol || 'UNKNOWN',
        timeframe: metadata.timeframe || '1h',
        dataPoints: ohlcData.length,
        
        // Step 1: Technical Indicators
        indicators: this.calculateIndicators(ohlcData),
        
        // Step 2: SMC Analysis
        smc: this.performSMCAnalysis(ohlcData),
        
        // Step 3: Confluence Scoring
        confluence: null,
        
        // Step 4: Signal Generation
        signal: null,
        
        // Step 5: Risk Management
        risk: null
      };

      // Calculate confluence and generate signal
      analysis.confluence = this.scoreConfluence(analysis);
      analysis.signal = this.generateSignalFromConfluence(analysis);
      analysis.risk = this.calculatePositionSizing(analysis);

      return analysis;
    } catch (error) {
      console.error('EnhancedAnalysisEngine.analyze error:', error.message);
      throw error;
    }
  }

  /**
   * STEP 1: Calculate all technical indicators
   */
  calculateIndicators(data) {
    try {
      const closes = data.map(x => x.close);
      const highs = data.map(x => x.high);
      const lows = data.map(x => x.low);

      const emaValues = {};
      for (const period of this.config.emaPeriods) {
        emaValues[`ema${period}`] = this.calculateEMAValue(closes, period);
        emaValues[`ema${period}Series`] = this.calculateEMASeries(closes, period);
      }

      return {
        currentPrice: closes[closes.length - 1],
        
        // Moving Averages
        ema20: emaValues.ema20,
        ema50: emaValues.ema50,
        ema200: emaValues.ema200,
        ema20Series: emaValues.ema20Series,
        ema50Series: emaValues.ema50Series,
        
        // Momentum
        rsi: this.calculateRSI(closes, this.config.rsiPeriod),
        macd: this.calculateMACD(closes),
        
        // Volatility
        atr: this.calculateATR(data, this.config.atrPeriod),
        
        // Support & Resistance
        support: Math.min(...lows.slice(-40)),
        resistance: Math.max(...highs.slice(-40)),
        
        // Trend determination
        trend: this.determineTrend(emaValues.ema20, emaValues.ema50, emaValues.ema200, closes),
        
        // Volatility classification
        volatilityLevel: this.classifyVolatility(data)
      };
    } catch (error) {
      console.error('calculateIndicators error:', error.message);
      throw error;
    }
  }

  calculateEMAValue(data, period) {
    if (data.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return parseFloat(ema.toFixed(8));
  }

  calculateEMASeries(data, period) {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    const ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  }

  calculateRSI(data, period) {
    if (data.length < period + 1) return 50;
    
    let gains = 0, losses = 0;
    for (let i = 1; i < period + 1; i++) {
      const change = data[i] - data[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return parseFloat(rsi.toFixed(2));
  }

  calculateMACD(data) {
    const { fast, slow, signal } = this.config.macdPeriods;
    const ema12 = this.calculateEMASeries(data, fast);
    const ema26 = this.calculateEMASeries(data, slow);
    
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = this.calculateEMASeries(macdLine, signal);
    const histogram = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];

    return {
      macd: parseFloat(macdLine[macdLine.length - 1].toFixed(8)),
      signal: parseFloat(signalLine[signalLine.length - 1].toFixed(8)),
      histogram: parseFloat(histogram.toFixed(8)),
      trending: histogram > 0 ? 'BULLISH' : histogram < 0 ? 'BEARISH' : 'NEUTRAL'
    };
  }

  calculateATR(data, period) {
    if (data.length < period + 1) return 0;
    
    const trs = [];
    for (let i = 1; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      trs.push(tr);
    }

    // Wilder's smoothing
    let atr = trs.slice(0, period).reduce((a, b) => a + b) / period;
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
    }
    return parseFloat(atr.toFixed(8));
  }

  determineTrend(ema20, ema50, ema200, closes) {
    let direction = 'NEUTRAL';
    let strength = 'WEAK';

    if (ema20 > ema50 && ema50 > ema200) {
      direction = 'BULLISH';
      strength = 'STRONG';
    } else if (ema20 < ema50 && ema50 < ema200) {
      direction = 'BEARISH';
      strength = 'STRONG';
    } else if (ema20 > ema50) {
      direction = 'BULLISH';
      strength = 'MODERATE';
    } else if (ema20 < ema50) {
      direction = 'BEARISH';
      strength = 'MODERATE';
    }

    return { direction, strength };
  }

  classifyVolatility(data) {
    if (data.length === 0) return 'UNKNOWN';
    
    const ranges = data.map(x => x.high - x.low);
    const avgRange = ranges.reduce((a, b) => a + b) / ranges.length;
    const recentRange = ranges.slice(-10).reduce((a, b) => a + b) / 10;
    
    if (recentRange > avgRange * 1.3) return 'HIGH';
    if (recentRange < avgRange * 0.7) return 'LOW';
    return 'NORMAL';
  }

  /**
   * STEP 2: Smart Money Concepts Analysis
   */
  performSMCAnalysis(data) {
    try {
      const swings = this.detectSwings(data);
      const bos = this.detectBOS(data, swings);
      const choch = this.detectCHoCH(data, swings, bos);
      const orderBlocks = this.detectOrderBlocksAdvanced(data, swings, bos);
      const fvgs = this.detectFVGAdvanced(data);
      const liquidity = this.detectLiquidityZonesAdvanced(data, swings);

      const structure = this.inferMarketStructure(swings);
      const marketBias = this.determineMarketBias(bos, choch);

      return {
        swings: swings.all.slice(-5), // Last 5 swings
        bos: bos.slice(-3), // Last 3 BOS
        choch: choch.slice(-2), // Last 2 CHoCH
        
        orderBlocks: {
          all: orderBlocks,
          active: orderBlocks.filter(ob => !ob.mitigated).slice(-3),
          bullish: orderBlocks.filter(ob => ob.type === 'BULLISH_OB'),
          bearish: orderBlocks.filter(ob => ob.type === 'BEARISH_OB')
        },
        
        fvgs: {
          all: fvgs,
          active: fvgs.filter(f => !f.filled && f.fillPercent < 50).slice(-3),
          bullish: fvgs.filter(f => f.type === 'BULLISH_FVG'),
          bearish: fvgs.filter(f => f.type === 'BEARISH_FVG')
        },
        
        liquidity: {
          all: liquidity,
          bsl: liquidity.filter(l => l.type === 'BSL'),
          ssl: liquidity.filter(l => l.type === 'SSL')
        },

        structure,
        marketBias,
        
        summary: {
          totalBOS: bos.length,
          totalCHoCH: choch.length,
          activeOrderBlocks: orderBlocks.filter(ob => !ob.mitigated).length,
          activeFVGs: fvgs.filter(f => !f.filled).length,
          liquidityZones: liquidity.length
        }
      };
    } catch (error) {
      console.error('performSMCAnalysis error:', error.message);
      return this.getEmptySMCAnalysis();
    }
  }

  detectSwings(data, lookback = 3) {
    const swings = { highs: [], lows: [], all: [] };

    for (let i = lookback; i < data.length - lookback; i++) {
      let isHigh = true, isLow = true;

      for (let j = 1; j <= lookback; j++) {
        if (data[i - j].high >= data[i].high || data[i + j].high >= data[i].high) isHigh = false;
        if (data[i - j].low <= data[i].low || data[i + j].low <= data[i].low) isLow = false;
      }

      if (isHigh) {
        const swing = { i, price: data[i].high, time: data[i].time, type: 'HIGH' };
        swings.highs.push(swing);
        swings.all.push(swing);
      }

      if (isLow) {
        const swing = { i, price: data[i].low, time: data[i].time, type: 'LOW' };
        swings.lows.push(swing);
        swings.all.push(swing);
      }
    }

    swings.all.sort((a, b) => a.i - b.i);
    return swings;
  }

  detectBOS(data, swings) {
    const bos = [];
    const { highs, lows } = swings;
    const currentPrice = data[data.length - 1].close;

    // Bullish BOS
    for (let i = 1; i < highs.length; i++) {
      const prevHigh = highs[i - 1];
      for (let j = prevHigh.i + 1; j < highs[i].i && j < data.length; j++) {
        if (data[j].close > prevHigh.price) {
          bos.push({
            type: 'BULLISH_BOS',
            level: prevHigh.price,
            index: j,
            time: data[j].time,
            distance: currentPrice > prevHigh.price ? 0 : prevHigh.price - currentPrice,
            description: `Bullish BOS above ${prevHigh.price.toFixed(4)}`
          });
          break;
        }
      }
    }

    // Bearish BOS
    for (let i = 1; i < lows.length; i++) {
      const prevLow = lows[i - 1];
      for (let j = prevLow.i + 1; j < lows[i].i && j < data.length; j++) {
        if (data[j].close < prevLow.price) {
          bos.push({
            type: 'BEARISH_BOS',
            level: prevLow.price,
            index: j,
            time: data[j].time,
            distance: currentPrice < prevLow.price ? 0 : currentPrice - prevLow.price,
            description: `Bearish BOS below ${prevLow.price.toFixed(4)}`
          });
          break;
        }
      }
    }

    return bos.sort((a, b) => b.index - a.index);
  }

  detectCHoCH(data, swings, bos) {
    const choch = [];
    const allSwings = swings.all;

    // Pattern-based CHoCH
    for (let i = 3; i < allSwings.length; i++) {
      const [s1, s2, s3, s4] = [allSwings[i - 3], allSwings[i - 2], allSwings[i - 1], allSwings[i]];

      // Bullish CHoCH: LL → HL
      if (s1.type === 'LOW' && s3.type === 'LOW' && s2.type === 'HIGH' && s4.type === 'HIGH') {
        if (s3.price < s1.price && s4.price > s2.price) {
          choch.push({
            type: 'BULLISH_CHOCH',
            level: s2.price,
            index: s4.i,
            time: s4.time,
            description: 'Bullish CHoCH - Trend reversal',
            strength: this.calculateCHoChStrength(data, s4.i)
          });
        }
      }

      // Bearish CHoCH: HH → LH
      if (s1.type === 'HIGH' && s3.type === 'HIGH' && s2.type === 'LOW' && s4.type === 'LOW') {
        if (s3.price > s1.price && s4.price < s2.price) {
          choch.push({
            type: 'BEARISH_CHOCH',
            level: s2.price,
            index: s4.i,
            time: s4.time,
            description: 'Bearish CHoCH - Trend reversal',
            strength: this.calculateCHoChStrength(data, s4.i)
          });
        }
      }
    }

    return choch.sort((a, b) => b.index - a.index);
  }

  calculateCHoChStrength(data, index) {
    if (index < 5 || data.length < 6) return 'UNKNOWN';
    const recent = data.slice(Math.max(0, index - 5), index);
    const avgRange = recent.reduce((sum, c) => sum + (c.high - c.low), 0) / recent.length;
    const recentRange = data[index].high - data[index].low;
    
    if (recentRange > avgRange * 1.5) return 'STRONG';
    if (recentRange > avgRange) return 'MODERATE';
    return 'WEAK';
  }

  detectOrderBlocksAdvanced(data, swings, bos) {
    const obs = [];

    for (const bosEvent of bos) {
      const lookback = Math.min(bosEvent.index, this.config.obLookback);
      let candidates = [];

      for (let i = bosEvent.index - 1; i >= Math.max(0, bosEvent.index - lookback); i--) {
        const candle = data[i];
        const isOpposite = bosEvent.type === 'BULLISH_BOS' 
          ? candle.close < candle.open 
          : candle.close > candle.open;

        if (isOpposite) {
          const range = candle.high - candle.low;
          const moveAfter = bosEvent.type === 'BULLISH_BOS'
            ? Math.max(0, bosEvent.level - candle.low)
            : Math.max(0, candle.high - bosEvent.level);

          candidates.push({
            index: i,
            candle,
            range,
            moveAfter,
            strength: range > 0 ? moveAfter / range : 0
          });
        }
      }

      candidates.sort((a, b) => b.strength - a.strength);
      candidates.slice(0, 2).forEach(candidate => {
        obs.push({
          type: bosEvent.type === 'BULLISH_BOS' ? 'BULLISH_OB' : 'BEARISH_OB',
          high: candidate.candle.high,
          low: candidate.candle.low,
          midpoint: (candidate.candle.high + candidate.candle.low) / 2,
          index: candidate.index,
          time: candidate.candle.time,
          strength: Math.min(100, candidate.strength * 50),
          mitigated: false,
          description: `${bosEvent.type === 'BULLISH_BOS' ? 'Bullish' : 'Bearish'} OB`
        });
      });
    }

    // Check mitigation
    obs.forEach(ob => {
      for (let i = ob.index + 1; i < data.length; i++) {
        const candle = data[i];
        if (ob.type === 'BULLISH_OB') {
          if (candle.low <= ob.high && candle.low >= ob.low) {
            ob.mitigated = true;
            break;
          }
        } else {
          if (candle.high >= ob.low && candle.high <= ob.high) {
            ob.mitigated = true;
            break;
          }
        }
      }
    });

    return obs;
  }

  detectFVGAdvanced(data) {
    const fvgs = [];
    const avgRange = this.getAverageRange(data, 20);

    for (let i = 2; i < data.length; i++) {
      const [c1, c2, c3] = [data[i - 2], data[i - 1], data[i]];

      // Bullish FVG
      if (c3.low > c1.high) {
        const gapSize = c3.low - c1.high;
        if (gapSize > avgRange * this.config.fvgSignificance) {
          fvgs.push({
            type: 'BULLISH_FVG',
            high: c3.low,
            low: c1.high,
            midpoint: (c3.low + c1.high) / 2,
            size: gapSize,
            index: i - 1,
            time: c2.time,
            filled: false,
            fillPercent: 0,
            description: `Bullish FVG`
          });
        }
      }

      // Bearish FVG
      if (c3.high < c1.low) {
        const gapSize = c1.low - c3.high;
        if (gapSize > avgRange * this.config.fvgSignificance) {
          fvgs.push({
            type: 'BEARISH_FVG',
            high: c1.low,
            low: c3.high,
            midpoint: (c1.low + c3.high) / 2,
            size: gapSize,
            index: i - 1,
            time: c2.time,
            filled: false,
            fillPercent: 0,
            description: `Bearish FVG`
          });
        }
      }
    }

    // Check fill status
    fvgs.forEach(fvg => {
      for (let i = fvg.index + 2; i < data.length; i++) {
        if (fvg.type === 'BULLISH_FVG') {
          if (data[i].low <= fvg.midpoint) {
            fvg.fillPercent = Math.min(100, ((fvg.high - data[i].low) / fvg.size) * 100);
            if (data[i].low <= fvg.low) {
              fvg.filled = true;
              fvg.fillPercent = 100;
            }
          }
        } else {
          if (data[i].high >= fvg.midpoint) {
            fvg.fillPercent = Math.min(100, ((data[i].high - fvg.low) / fvg.size) * 100);
            if (data[i].high >= fvg.high) {
              fvg.filled = true;
              fvg.fillPercent = 100;
            }
          }
        }
      }
    });

    return fvgs;
  }

  detectLiquidityZonesAdvanced(data, swings) {
    const zones = [];
    const { highs, lows } = swings;
    const tolerance = this.calculateDynamicTolerance(data);

    // Cluster highs
    const highClusters = this.clusterPrices(
      highs.map(h => h.price),
      tolerance
    );

    highClusters.forEach(cluster => {
      zones.push({
        type: 'BSL', // Buy-side liquidity
        level: cluster.average,
        strength: Math.min(100, cluster.count * 25),
        count: cluster.count,
        description: `Buy-Side Liquidity @ ${cluster.average.toFixed(4)}`
      });
    });

    // Cluster lows
    const lowClusters = this.clusterPrices(
      lows.map(l => l.price),
      tolerance
    );

    lowClusters.forEach(cluster => {
      zones.push({
        type: 'SSL', // Sell-side liquidity
        level: cluster.average,
        strength: Math.min(100, cluster.count * 25),
        count: cluster.count,
        description: `Sell-Side Liquidity @ ${cluster.average.toFixed(4)}`
      });
    });

    return zones.sort((a, b) => b.strength - a.strength);
  }

  calculateDynamicTolerance(data) {
    const lastN = data.slice(-20);
    const avgRange = this.getAverageRange(lastN, 20);
    const avgPrice = lastN.reduce((sum, c) => sum + c.close, 0) / lastN.length;
    
    if (avgPrice === 0) return 0.001;
    // Tolerance: 0.05% - 0.15% depending on volatility
    return (avgRange / avgPrice) * 0.5;
  }

  clusterPrices(prices, tolerance) {
    if (prices.length === 0) return [];
    
    const clusters = [];

    prices.forEach(price => {
      const existingCluster = clusters.find(c =>
        price > 0 && Math.abs(c.average - price) / price < tolerance
      );

      if (existingCluster) {
        existingCluster.prices.push(price);
        existingCluster.average = existingCluster.prices.reduce((a, b) => a + b) / existingCluster.prices.length;
        existingCluster.count++;
      } else {
        clusters.push({
          prices: [price],
          average: price,
          count: 1
        });
      }
    });

    return clusters.sort((a, b) => b.count - a.count);
  }

  getAverageRange(data, periods = 20) {
    const count = Math.min(periods, data.length);
    if (count === 0) return 0;
    const range = data.slice(-count).reduce((sum, c) => sum + (c.high - c.low), 0);
    return range / count;
  }

  inferMarketStructure(swings) {
    const lastHighs = swings.highs.slice(-3).map(x => x.price);
    const lastLows = swings.lows.slice(-3).map(x => x.price);

    if (lastHighs.length < 2 || lastLows.length < 2) {
      return { type: 'RANGING', bos: false, choch: false };
    }

    const hh = lastHighs[lastHighs.length - 1] > lastHighs[lastHighs.length - 2];
    const hl = lastLows[lastLows.length - 1] > lastLows[lastLows.length - 2];
    const lh = lastHighs[lastHighs.length - 1] < lastHighs[lastHighs.length - 2];
    const ll = lastLows[lastLows.length - 1] < lastLows[lastLows.length - 2];

    let type = 'RANGING';
    if (hh && hl) type = 'BULLISH (HH/HL)';
    else if (lh && ll) type = 'BEARISH (LH/LL)';

    return { type, hh, hl, lh, ll };
  }

  determineMarketBias(bos, choch) {
    if (choch.length > 0) {
      const lastCHoCH = choch[choch.length - 1];
      return lastCHoCH.type === 'BULLISH_CHOCH' ? 'BULLISH' : 'BEARISH';
    }

    if (bos.length === 0) return 'NEUTRAL';

    const bullishBOS = bos.filter(b => b.type === 'BULLISH_BOS').length;
    const bearishBOS = bos.filter(b => b.type === 'BEARISH_BOS').length;

    if (bullishBOS > bearishBOS) return 'BULLISH';
    if (bearishBOS > bullishBOS) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * STEP 3: Confluence Scoring System
   */
  scoreConfluence(analysis) {
    try {
      const { indicators, smc } = analysis;
      const currentPrice = indicators.currentPrice;
      const scores = {};

      // 1. SMC Entry Zone (0-25 points)
      scores.smcEntryZone = this.scoreSmcEntryZone(smc, currentPrice);

      // 2. CHoCH Signal (0-20 points)
      scores.choch = this.scoreChoCH(smc, currentPrice);

      // 3. Order Block (0-20 points)
      scores.orderBlock = this.scoreOrderBlock(smc, currentPrice);

      // 4. Fair Value Gap (0-15 points)
      scores.fvg = this.scoreFVG(smc, currentPrice);

      // 5. BOS Continuation (0-10 points)
      scores.bos = this.scoreBOS(smc);

      // 6. Technical Indicators (0-15 points)
      scores.technicalIndicators = this.scoreTechnicalIndicators(indicators);

      // 7. Trend Alignment (-10 to +10 points)
      scores.trendAlignment = this.scoreTrendAlignment(smc, indicators);

      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
      const direction = totalScore > 5 ? 'BUY' : totalScore < -5 ? 'SELL' : 'WAIT';
      const confidence = Math.min(95, Math.max(30, 50 + Math.abs(totalScore) * 2));

      return {
        scores,
        totalScore: parseFloat(totalScore.toFixed(2)),
        direction,
        confidence: parseFloat(confidence.toFixed(2)),
        breakdown: this.generateScoreBreakdown(scores)
      };
    } catch (error) {
      console.error('scoreConfluence error:', error.message);
      return this.getEmptyConfluence();
    }
  }

  scoreSmcEntryZone(smc, price) {
    if (!smc.orderBlocks.active.length && !smc.fvgs.active.length) return 0;

    let score = 0;

    // Order block proximity (up to 15 points)
    for (const ob of smc.orderBlocks.active) {
      const distance = Math.abs(price - ob.midpoint) / price;
      if (distance < 0.01) { // Within 1%
        score += Math.max(10, 15 - distance * 1500);
        break;
      }
    }

    // FVG proximity (up to 10 points)
    for (const fvg of smc.fvgs.active) {
      const distance = Math.abs(price - fvg.midpoint) / price;
      if (distance < 0.008 && fvg.fillPercent < 60) {
        score += Math.max(5, 10 - distance * 1250);
        break;
      }
    }

    // Bias alignment bonus (+5 points)
    if (smc.marketBias === 'BULLISH' && smc.orderBlocks.bullish.length > 0) score += 5;
    if (smc.marketBias === 'BEARISH' && smc.orderBlocks.bearish.length > 0) score += 5;

    return Math.min(25, score);
  }

  scoreChoCH(smc, price) {
    if (!smc.choch.length) return 0;

    const lastCHoCH = smc.choch[smc.choch.length - 1];
    const age = (smc.summary && smc.summary.totalCandles ? smc.summary.totalCandles - lastCHoCH.index : 0) || 0;

    if (age > 20) return 0; // Too old

    let score = 15;
    score += (lastCHoCH.strength === 'STRONG' ? 5 : 0);
    score -= Math.max(0, age * 0.25); // Decay over time

    return Math.min(20, Math.max(0, score));
  }

  scoreOrderBlock(smc, price) {
    if (!smc.orderBlocks.active.length) return 0;

    let maxScore = 0;
    for (const ob of smc.orderBlocks.active) {
      const distance = Math.abs(price - ob.midpoint) / price;
      if (distance < 0.015) {
        const score = Math.max(10, 20 - distance * 1333);
        maxScore = Math.max(maxScore, score);
      }
    }

    return Math.min(20, maxScore);
  }

  scoreFVG(smc, price) {
    if (!smc.fvgs.active.length) return 0;

    let maxScore = 0;
    for (const fvg of smc.fvgs.active) {
      const distance = Math.abs(price - fvg.midpoint) / price;
      if (distance < 0.01 && fvg.fillPercent < 60) {
        const fillPenalty = fvg.fillPercent * 0.08;
        const score = Math.max(5, 15 - distance * 1500 - fillPenalty);
        maxScore = Math.max(maxScore, score);
      }
    }

    return Math.min(15, maxScore);
  }

  scoreBOS(smc) {
    if (!smc.bos.length) return 0;

    const lastBOS = smc.bos[smc.bos.length - 1];
    return lastBOS.type === 'BULLISH_BOS' ? 10 : -10;
  }

  scoreTechnicalIndicators(indicators) {
    let score = 0;

    // EMA alignment
    if (indicators.ema20 > indicators.ema50 && indicators.ema50 > indicators.ema200) {
      score += 8;
    } else if (indicators.ema20 < indicators.ema50 && indicators.ema50 < indicators.ema200) {
      score -= 8;
    }

    // RSI extremes
    if (indicators.rsi < 30) score += 5;
    if (indicators.rsi > 70) score -= 5;

    // MACD trending
    if (indicators.macd.trending === 'BULLISH') score += 4;
    if (indicators.macd.trending === 'BEARISH') score -= 4;

    // Trend strength bonus
    if (indicators.trend.strength === 'STRONG') score += 3;

    return Math.min(15, Math.max(-15, score));
  }

  scoreTrendAlignment(smc, indicators) {
    if (smc.marketBias === 'BULLISH' && indicators.trend.direction === 'BULLISH') return 8;
    if (smc.marketBias === 'BEARISH' && indicators.trend.direction === 'BEARISH') return -8;
    return 0;
  }

  generateScoreBreakdown(scores) {
    return Object.entries(scores)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .map(([key, score]) => ({
        factor: this.formatScoreKey(key),
        contribution: parseFloat(score.toFixed(2))
      }));
  }

  formatScoreKey(key) {
    return key.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
  }

  /**
   * STEP 4: Signal Generation
   */
  generateSignalFromConfluence(analysis) {
    try {
      const { confluence, indicators, smc } = analysis;
      const price = indicators.currentPrice;
      const atr = indicators.atr;
      const minRR = 2; // Default 1:2

      const signal = {
        direction: confluence.direction,
        confidence: confluence.confidence,
        entry: price,
        stopLoss: 0,
        tp1: 0,
        tp2: 0,
        tp3: 0,
        rr: 0,
        reason: this.generateSignalReason(analysis),
        setup: this.identifySetup(analysis)
      };

      if (signal.direction === 'WAIT') {
        return signal;
      }

      // Calculate SL and TP based on SMC zones
      if (signal.direction === 'BUY') {
        const nearestOB = smc.orderBlocks.active.find(ob => ob.type === 'BULLISH_OB');
        let slDist = atr * 1.2;

        if (nearestOB && nearestOB.low < price) {
          slDist = Math.max(slDist, price - nearestOB.low + atr * 0.2);
        }

        signal.stopLoss = price - slDist;
        signal.tp1 = price + slDist * minRR;
        signal.tp2 = price + slDist * (minRR + 0.5);
        signal.tp3 = price + slDist * (minRR + 1);
      } else if (signal.direction === 'SELL') {
        const nearestOB = smc.orderBlocks.active.find(ob => ob.type === 'BEARISH_OB');
        let slDist = atr * 1.2;

        if (nearestOB && nearestOB.high > price) {
          slDist = Math.max(slDist, nearestOB.high - price + atr * 0.2);
        }

        signal.stopLoss = price + slDist;
        signal.tp1 = price - slDist * minRR;
        signal.tp2 = price - slDist * (minRR + 0.5);
        signal.tp3 = price - slDist * (minRR + 1);
      }

      // Calculate R:R
      const risk = Math.abs(signal.entry - signal.stopLoss);
      const reward = Math.abs(signal.tp2 - signal.entry);
      signal.rr = risk > 0 ? (reward / risk).toFixed(2) : '0.00';

      return signal;
    } catch (error) {
      console.error('generateSignalFromConfluence error:', error.message);
      return this.getEmptySignal();
    }
  }

  generateSignalReason(analysis) {
    const { smc, confluence, indicators } = analysis;

    if (confluence.scores.smcEntryZone > 15) {
      return `${smc.marketBias} SMC Setup | Active OB/FVG`;
    }

    if (confluence.scores.choch > 10) {
      return `${confluence.direction === 'BUY' ? 'Bullish' : 'Bearish'} CHoCH Reversal`;
    }

    if (confluence.scores.orderBlock > 10) {
      return `${confluence.direction === 'BUY' ? 'Bullish' : 'Bearish'} Order Block Entry`;
    }

    if (confluence.scores.fvg > 8) {
      return `FVG Fill Opportunity`;
    }

    return `${indicators.trend.direction} Trend | ${confluence.scores.technicalIndicators > 0 ? 'Bullish' : 'Bearish'} Indicators`;
  }

  identifySetup(analysis) {
    const { smc, confluence } = analysis;
    const topFactor = Object.entries(confluence.scores).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];

    const setupMap = {
      smcEntryZone: 'SMC Confluence',
      choch: 'CHoCH Reversal',
      orderBlock: 'Order Block',
      fvg: 'FVG Fill',
      bos: 'BOS Continuation',
      technicalIndicators: 'Technical Setup',
      trendAlignment: 'Trend Alignment'
    };

    return setupMap[topFactor[0]] || 'Price Action';
  }

  /**
   * STEP 5: Position Sizing & Risk Management
   */
  calculatePositionSizing(analysis, accountSize = 10000) {
    try {
      const { signal } = analysis;
      const riskPercent = 2; // Default 2% risk per trade
      const riskAmount = accountSize * (riskPercent / 100);

      if (signal.direction === 'WAIT') {
        return {
          positionSize: 0,
          riskAmount: 0,
          accountRiskPercent: 0,
          recommendation: 'WAIT'
        };
      }

      const slDistance = Math.abs(signal.entry - signal.stopLoss);
      const positionSize = riskAmount / slDistance;

      // Validate
      const actualRisk = (positionSize * slDistance) / accountSize;
      const finalPositionSize = actualRisk > (riskPercent / 100)
        ? (riskAmount / slDistance) * 0.95
        : positionSize;

      return {
        positionSize: parseFloat(finalPositionSize.toFixed(8)),
        positionSizeUSD: parseFloat((finalPositionSize * signal.entry).toFixed(2)),
        riskAmount: parseFloat(riskAmount.toFixed(2)),
        accountRiskPercent: parseFloat((actualRisk * 100).toFixed(2)),
        slDistance: parseFloat(slDistance.toFixed(8)),
        expectancy: this.calculateExpectancy(signal),
        recommendation: this.getPositionRecommendation(signal, actualRisk * 100)
      };
    } catch (error) {
      console.error('calculatePositionSizing error:', error.message);
      return this.getEmptyPositionSizing();
    }
  }

  calculateExpectancy(signal) {
    // Assuming 60% win rate
    const winRate = 0.60;
    const lossRate = 1 - winRate;
    const rr = parseFloat(signal.rr);

    const expectancy = (winRate * rr) - lossRate;
    return parseFloat(expectancy.toFixed(4));
  }

  getPositionRecommendation(signal, accountRisk) {
    if (signal.confidence < 50) return 'HIGH RISK - Consider passing';
    if (signal.confidence < 60) return 'MODERATE RISK - Small position';
    if (signal.confidence < 75) return 'GOOD RISK - Normal position';
    return 'EXCELLENT SETUP - Full position';
  }

  /**
   * Utility Functions
   */
  validateInput(data) {
    if (!Array.isArray(data) || data.length < this.config.minCandlesRequired) {
      return false;
    }

    return data.every(candle =>
      typeof candle.open === 'number' &&
      typeof candle.high === 'number' &&
      typeof candle.low === 'number' &&
      typeof candle.close === 'number' &&
      candle.open > 0 &&
      candle.high > 0 &&
      candle.low > 0 &&
      candle.close > 0
    );
  }

  getEmptySMCAnalysis() {
    return {
      swings: [],
      bos: [],
      choch: [],
      orderBlocks: { all: [], active: [], bullish: [], bearish: [] },
      fvgs: { all: [], active: [], bullish: [], bearish: [] },
      liquidity: { all: [], bsl: [], ssl: [] },
      structure: { type: 'RANGING', hh: false, hl: false, lh: false, ll: false },
      marketBias: 'NEUTRAL',
      summary: { totalBOS: 0, totalCHoCH: 0, activeOrderBlocks: 0, activeFVGs: 0, liquidityZones: 0 }
    };
  }

  getEmptyConfluence() {
    return {
      scores: { smcEntryZone: 0, choch: 0, orderBlock: 0, fvg: 0, bos: 0, technicalIndicators: 0, trendAlignment: 0 },
      totalScore: 0,
      direction: 'WAIT',
      confidence: 30,
      breakdown: []
    };
  }

  getEmptySignal() {
    return {
      direction: 'WAIT',
      confidence: 30,
      entry: 0,
      stopLoss: 0,
      tp1: 0,
      tp2: 0,
      tp3: 0,
      rr: '0.00',
      reason: 'Insufficient data',
      setup: 'N/A'
    };
  }

  getEmptyPositionSizing() {
    return {
      positionSize: 0,
      positionSizeUSD: 0,
      riskAmount: 0,
      accountRiskPercent: 0,
      slDistance: 0,
      expectancy: 0,
      recommendation: 'WAIT'
    };
  }
}

// Export for Node.js
module.exports = EnhancedAnalysisEngine;
