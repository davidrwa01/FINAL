/**
 * backend/tests/enhancedAnalysisEngine.test.js
 * 
 * Test suite for EnhancedAnalysisEngine
 * Run with: node tests/enhancedAnalysisEngine.test.js
 */

const EnhancedAnalysisEngine = require('../services/enhancedAnalysisEngine');

// ─── TEST DATA ──────────────────────────────────────────────
// Generate synthetic candles for testing
function generateTestCandles(basePrice = 100, count = 100) {
  const candles = [];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const drift = (Math.random() - 0.5) * basePrice * 0.02;
    const open = price;
    price += drift;
    
    const high = Math.max(open, price) + Math.random() * basePrice * 0.01;
    const low = Math.min(open, price) - Math.random() * basePrice * 0.01;
    const close = price;

    candles.push({
      time: new Date(Date.now() - (count - i) * 60000),
      open: parseFloat(open.toFixed(8)),
      high: parseFloat(high.toFixed(8)),
      low: parseFloat(low.toFixed(8)),
      close: parseFloat(close.toFixed(8)),
      volume: Math.floor(Math.random() * 1000000)
    });
  }

  return candles;
}

// ─── TEST FUNCTIONS ────────────────────────────────────────

async function testBasicAnalysis() {
  console.log('\n=== Test 1: Basic Analysis ===');
  try {
    const engine = new EnhancedAnalysisEngine();
    const candles = generateTestCandles(100, 100);
    
    const analysis = await engine.analyze(candles, {
      symbol: 'TEST',
      timeframe: '1h'
    });

    // Validate structure
    assert(analysis.timestamp, 'timestamp missing');
    assert(analysis.symbol === 'TEST', 'symbol mismatch');
    assert(analysis.indicators, 'indicators missing');
    assert(analysis.smc, 'smc missing');
    assert(analysis.confluence, 'confluence missing');
    assert(analysis.signal, 'signal missing');
    assert(analysis.risk, 'risk missing');

    console.log('✅ PASS: Analysis structure complete');
    console.log(`   Signal: ${analysis.signal.direction} (Confidence: ${analysis.confluence.confidence}%)`);
    console.log(`   Entry: ${analysis.signal.entry}, SL: ${analysis.signal.stopLoss}, RR: ${analysis.signal.rr}`);
  } catch (error) {
    console.error('❌ FAIL:', error.message);
  }
}

async function testIndicatorCalculations() {
  console.log('\n=== Test 2: Indicator Calculations ===');
  try {
    const engine = new EnhancedAnalysisEngine();
    const candles = generateTestCandles(50, 100);
    
    const analysis = await engine.analyze(candles, {
      symbol: 'TEST',
      timeframe: '1h'
    });

    const { indicators } = analysis;

    // Validate indicator ranges
    assert(typeof indicators.currentPrice === 'number', 'currentPrice not a number');
    assert(indicators.rsi >= 0 && indicators.rsi <= 100, 'RSI out of range');
    assert(typeof indicators.atr === 'number', 'ATR not a number');
    assert(indicators.ema20 > 0, 'EMA20 invalid');
    assert(['BULLISH', 'BEARISH', 'NEUTRAL'].includes(indicators.trend.direction), 'Invalid trend');
    assert(['HIGH', 'NORMAL', 'LOW'].includes(indicators.volatilityLevel), 'Invalid volatility');

    console.log('✅ PASS: All indicators valid');
    console.log(`   Current Price: ${indicators.currentPrice}`);
    console.log(`   EMA20: ${indicators.ema20.toFixed(8)}`);
    console.log(`   RSI: ${indicators.rsi.toFixed(2)}`);
    console.log(`   ATR: ${indicators.atr.toFixed(8)}`);
    console.log(`   Trend: ${indicators.trend.direction} (${indicators.trend.strength})`);
  } catch (error) {
    console.error('❌ FAIL:', error.message);
  }
}

async function testSMCAnalysis() {
  console.log('\n=== Test 3: SMC Analysis ===');
  try {
    const engine = new EnhancedAnalysisEngine();
    const candles = generateTestCandles(100, 150);
    
    const analysis = await engine.analyze(candles, {
      symbol: 'TEST',
      timeframe: '4h'
    });

    const { smc } = analysis;

    // Validate SMC structure
    assert(Array.isArray(smc.swings), 'swings not array');
    assert(Array.isArray(smc.bos), 'bos not array');
    assert(Array.isArray(smc.choch), 'choch not array');
    assert(smc.orderBlocks, 'orderBlocks missing');
    assert(smc.fvgs, 'fvgs missing');
    assert(smc.liquidity, 'liquidity missing');
    assert(smc.structure, 'structure missing');
    assert(['BULLISH', 'BEARISH', 'NEUTRAL'].includes(smc.marketBias), 'Invalid market bias');

    console.log('✅ PASS: SMC analysis complete');
    console.log(`   Swings: ${smc.swings.length}`);
    console.log(`   BOS Events: ${smc.bos.length}`);
    console.log(`   CHoCH Events: ${smc.choch.length}`);
    console.log(`   Order Blocks: ${smc.orderBlocks.all.length}`);
    console.log(`   FVGs: ${smc.fvgs.all.length}`);
    console.log(`   Liquidity Zones: ${smc.liquidity.all.length}`);
    console.log(`   Market Structure: ${smc.structure.type}`);
    console.log(`   Market Bias: ${smc.marketBias}`);
  } catch (error) {
    console.error('❌ FAIL:', error.message);
  }
}

async function testConfluenceScoring() {
  console.log('\n=== Test 4: Confluence Scoring ===');
  try {
    const engine = new EnhancedAnalysisEngine();
    const candles = generateTestCandles(100, 120);
    
    const analysis = await engine.analyze(candles, {
      symbol: 'TEST',
      timeframe: '1h'
    });

    const { confluence } = analysis;

    // Validate confluence
    assert(typeof confluence.totalScore === 'number', 'totalScore not a number');
    assert(['BUY', 'SELL', 'WAIT'].includes(confluence.direction), 'Invalid direction');
    assert(confluence.confidence >= 30 && confluence.confidence <= 95, 'Confidence out of range');
    assert(Array.isArray(confluence.breakdown), 'breakdown not array');

    // Validate score consistency
    const sumScores = Object.values(confluence.scores).reduce((a, b) => a + b, 0);
    assert(Math.abs(sumScores - confluence.totalScore) < 0.01, 'Score sum mismatch');

    console.log('✅ PASS: Confluence scoring valid');
    console.log(`   Total Score: ${confluence.totalScore.toFixed(2)}`);
    console.log(`   Direction: ${confluence.direction}`);
    console.log(`   Confidence: ${confluence.confidence.toFixed(2)}%`);
    console.log('   Score Breakdown:');
    confluence.breakdown.slice(0, 5).forEach(item => {
      console.log(`     - ${item.factor}: ${item.contribution}`);
    });
  } catch (error) {
    console.error('❌ FAIL:', error.message);
  }
}

async function testSignalGeneration() {
  console.log('\n=== Test 5: Signal Generation ===');
  try {
    const engine = new EnhancedAnalysisEngine();
    const candles = generateTestCandles(100, 100);
    
    const analysis = await engine.analyze(candles, {
      symbol: 'TEST',
      timeframe: '1h'
    });

    const { signal } = analysis;

    // Validate signal
    assert(['BUY', 'SELL', 'WAIT'].includes(signal.direction), 'Invalid signal direction');
    assert(typeof signal.confidence === 'number', 'confidence not a number');
    assert(typeof signal.entry === 'number', 'entry not a number');
    assert(signal.direction === 'WAIT' || typeof signal.stopLoss === 'number', 'SL invalid');
    
    if (signal.direction !== 'WAIT') {
      assert(signal.tp1 > 0 && signal.tp2 > 0 && signal.tp3 > 0, 'TPs invalid');
      assert(parseFloat(signal.rr) > 0, 'RR invalid');
      assert(signal.reason, 'reason missing');
      assert(signal.setup, 'setup missing');
    }

    console.log('✅ PASS: Signal generation valid');
    console.log(`   Direction: ${signal.direction}`);
    console.log(`   Confidence: ${signal.confidence.toFixed(2)}%`);
    console.log(`   Entry: ${signal.entry}`);
    console.log(`   Stop Loss: ${signal.stopLoss.toFixed(8)}`);
    console.log(`   TP1/TP2/TP3: ${signal.tp1.toFixed(8)} / ${signal.tp2.toFixed(8)} / ${signal.tp3.toFixed(8)}`);
    console.log(`   R:R: ${signal.rr}`);
    console.log(`   Setup: ${signal.setup}`);
    console.log(`   Reason: ${signal.reason}`);
  } catch (error) {
    console.error('❌ FAIL:', error.message);
  }
}

async function testPositionSizing() {
  console.log('\n=== Test 6: Position Sizing ===');
  try {
    const engine = new EnhancedAnalysisEngine();
    const candles = generateTestCandles(100, 100);
    
    const analysis = await engine.analyze(candles, {
      symbol: 'TEST',
      timeframe: '1h'
    });

    const risk = engine.calculatePositionSizing(analysis, 10000);

    // Validate position sizing
    assert(typeof risk.positionSize === 'number', 'positionSize not a number');
    assert(typeof risk.riskAmount === 'number', 'riskAmount not a number');
    assert(risk.accountRiskPercent <= 2.5, 'Account risk too high');
    assert(typeof risk.expectancy === 'number', 'expectancy not a number');
    assert(risk.recommendation, 'recommendation missing');

    console.log('✅ PASS: Position sizing valid');
    console.log(`   Position Size: ${risk.positionSize.toFixed(8)}`);
    console.log(`   Position Size (USD): $${risk.positionSizeUSD.toFixed(2)}`);
    console.log(`   Risk Amount: $${risk.riskAmount.toFixed(2)}`);
    console.log(`   Account Risk %: ${risk.accountRiskPercent.toFixed(2)}%`);
    console.log(`   SL Distance: ${risk.slDistance.toFixed(8)}`);
    console.log(`   Expectancy: ${risk.expectancy.toFixed(4)}`);
    console.log(`   Recommendation: ${risk.recommendation}`);
  } catch (error) {
    console.error('❌ FAIL:', error.message);
  }
}

async function testEdgeCases() {
  console.log('\n=== Test 7: Edge Cases ===');
  try {
    const engine = new EnhancedAnalysisEngine();

    // Test 1: Insufficient data
    try {
      const smallCandles = generateTestCandles(100, 20);
      await engine.analyze(smallCandles, { symbol: 'TEST', timeframe: '1h' });
      console.log('❌ FAIL: Should reject insufficient data');
    } catch {
      console.log('✅ PASS: Rejects insufficient data');
    }

    // Test 2: Invalid data
    try {
      const invalidCandles = [{ time: new Date(), open: 'bad' }];
      await engine.analyze(invalidCandles, { symbol: 'TEST', timeframe: '1h' });
      console.log('❌ FAIL: Should reject invalid data');
    } catch {
      console.log('✅ PASS: Rejects invalid data');
    }

    // Test 3: Trending market
    const upTrendCandles = [];
    let price = 100;
    for (let i = 0; i < 100; i++) {
      price += 1 + Math.random() * 0.5; // Strong uptrend
      upTrendCandles.push({
        time: new Date(Date.now() - (100 - i) * 60000),
        open: price - 1,
        high: price + Math.random(),
        low: price - Math.random(),
        close: price,
        volume: 1000
      });
    }

    const upTrendAnalysis = await engine.analyze(upTrendCandles, { symbol: 'TEST', timeframe: '1h' });
    console.log(`✅ PASS: Uptrend detected - Signal: ${upTrendAnalysis.signal.direction}`);

  } catch (error) {
    console.error('❌ FAIL:', error.message);
  }
}

// ─── HELPER FUNCTIONS ───────────────────────────────────────

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// ─── MAIN TEST RUNNER ───────────────────────────────────────

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   EnhancedAnalysisEngine Test Suite                    ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  await testBasicAnalysis();
  await testIndicatorCalculations();
  await testSMCAnalysis();
  await testConfluenceScoring();
  await testSignalGeneration();
  await testPositionSizing();
  await testEdgeCases();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  Test Suite Complete                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { 
  runAllTests, 
  generateTestCandles 
};
