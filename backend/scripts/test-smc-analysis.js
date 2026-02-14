/**
 * backend/scripts/test-smc-analysis.js
 * 
 * Demonstration script showing SMC analysis engine output
 * Run with: node scripts/test-smc-analysis.js
 */

const smcEngine = require('../services/smcAnalysisEngine');

// Sample candle data (50 candles for Bitcoin 1h)
const sampleKlines = [
  { time: 1, open: 42000, high: 42500, low: 41800, close: 42200, volume: 1000 },
  { time: 2, open: 42200, high: 42800, low: 42100, close: 42600, volume: 1200 },
  { time: 3, open: 42600, high: 43100, low: 42400, close: 42900, volume: 1500 },
  { time: 4, open: 42900, high: 43200, low: 42700, close: 43100, volume: 1300 },
  { time: 5, open: 43100, high: 43500, low: 42900, close: 43400, volume: 1400 },
  { time: 6, open: 43400, high: 43800, low: 43200, close: 43600, volume: 1100 },
  { time: 7, open: 43600, high: 43700, low: 43200, close: 43300, volume: 900 },
  { time: 8, open: 43300, high: 43400, low: 42800, close: 42900, volume: 1600 },
  { time: 9, open: 42900, high: 43100, low: 42600, close: 42800, volume: 1200 },
  { time: 10, open: 42800, high: 43000, low: 42500, close: 42700, volume: 1100 },
  { time: 11, open: 42700, high: 43200, low: 42600, close: 43100, volume: 1300 },
  { time: 12, open: 43100, high: 43600, low: 43000, close: 43500, volume: 1500 },
  { time: 13, open: 43500, high: 43800, low: 43400, close: 43700, volume: 1200 },
  { time: 14, open: 43700, high: 44000, low: 43600, close: 43900, volume: 1400 },
  { time: 15, open: 43900, high: 44200, low: 43800, close: 44100, volume: 1600 },
  { time: 16, open: 44100, high: 44300, low: 44000, close: 44200, volume: 1100 },
  { time: 17, open: 44200, high: 44400, low: 44100, close: 44300, volume: 1300 },
  { time: 18, open: 44300, high: 44500, low: 44200, close: 44400, volume: 1500 },
  { time: 19, open: 44400, high: 44600, low: 44300, close: 44500, volume: 1200 },
  { time: 20, open: 44500, high: 44700, low: 44400, close: 44600, volume: 1400 },
  { time: 21, open: 44600, high: 44800, low: 44500, close: 44700, volume: 1600 },
  { time: 22, open: 44700, high: 44900, low: 44600, close: 44800, volume: 1100 },
  { time: 23, open: 44800, high: 45000, low: 44700, close: 44900, volume: 1300 },
  { time: 24, open: 44900, high: 45100, low: 44800, close: 45000, volume: 1500 },
  { time: 25, open: 45000, high: 45200, low: 44900, close: 45100, volume: 1200 },
  // Bullish rejection
  { time: 26, open: 45100, high: 45150, low: 44700, close: 44800, volume: 1800 },
  { time: 27, open: 44800, high: 45000, low: 44600, close: 44900, volume: 1600 },
  { time: 28, open: 44900, high: 45100, low: 44700, close: 45000, volume: 1700 },
  { time: 29, open: 45000, high: 45200, low: 44900, close: 45100, volume: 1400 },
  { time: 30, open: 45100, high: 45300, low: 45000, close: 45200, volume: 1500 },
  { time: 31, open: 45200, high: 45400, low: 45100, close: 45300, volume: 1600 },
  { time: 32, open: 45300, high: 45500, low: 45200, close: 45400, volume: 1200 },
  { time: 33, open: 45400, high: 45600, low: 45300, close: 45500, volume: 1400 },
  { time: 34, open: 45500, high: 45700, low: 45400, close: 45600, volume: 1500 },
  { time: 35, open: 45600, high: 45800, low: 45500, close: 45700, volume: 1100 },
  { time: 36, open: 45700, high: 45900, low: 45600, close: 45800, volume: 1300 },
  // Consolidation and pullback
  { time: 37, open: 45800, high: 45900, low: 45400, close: 45500, volume: 1800 },
  { time: 38, open: 45500, high: 45700, low: 45300, close: 45600, volume: 1600 },
  { time: 39, open: 45600, high: 45800, low: 45400, close: 45700, volume: 1700 },
  { time: 40, open: 45700, high: 45900, low: 45600, close: 45800, volume: 1400 },
  { time: 41, open: 45800, high: 46000, low: 45700, close: 45900, volume: 1500 },
  { time: 42, open: 45900, high: 46100, low: 45800, close: 46000, volume: 1600 },
  { time: 43, open: 46000, high: 46200, low: 45900, close: 46100, volume: 1200 },
  { time: 44, open: 46100, high: 46300, low: 46000, close: 46200, volume: 1400 },
  { time: 45, open: 46200, high: 46400, low: 46100, close: 46300, volume: 1500 },
  { time: 46, open: 46300, high: 46500, low: 46200, close: 46400, volume: 1100 },
  { time: 47, open: 46400, high: 46600, low: 46300, close: 46500, volume: 1300 },
  { time: 48, open: 46500, high: 46700, low: 46400, close: 46600, volume: 1500 },
  { time: 49, open: 46600, high: 46800, low: 46500, close: 46700, volume: 1200 },
  { time: 50, open: 46700, high: 46900, low: 46600, close: 46800, volume: 1400 }
];

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           SMC ANALYSIS ENGINE - DEMONSTRATION             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Analyze market structure
console.log('📊 MARKET STRUCTURE ANALYSIS');
console.log('─'.repeat(60));
const structure = smcEngine.analyzeMarketStructure(sampleKlines);
console.log(`Structure: ${structure.structure}`);
console.log(`Confidence: ${(structure.confidence * 100).toFixed(1)}%`);
console.log(`Bullish Signals: ${structure.bullishSignals}`);
console.log(`Bearish Signals: ${structure.bearishSignals}\n`);

// Detect BOS/CHoCH
console.log('🔄 BOS / CHoCH DETECTION');
console.log('─'.repeat(60));
const bosChoCh = smcEngine.detectBosChoCh(sampleKlines);
if (bosChoCh.length > 0) {
  bosChoCh.forEach((event, i) => {
    console.log(`Event ${i + 1}: ${event.type} (${event.direction})`);
    console.log(`  Level: ${event.level?.toFixed(2) || event.price?.toFixed(2)}`);
    console.log(`  Strength: ${event.strength}`);
  });
} else {
  console.log('No BOS/CHoCH events detected\n');
}
console.log();

// Detect Order Blocks
console.log('🛑 ORDER BLOCK DETECTION');
console.log('─'.repeat(60));
const orderBlocks = smcEngine.detectOrderBlocks(sampleKlines);
if (orderBlocks.length > 0) {
  orderBlocks.forEach((ob, i) => {
    console.log(`Block ${i + 1}: ${ob.type} Order Block`);
    console.log(`  Range: ${ob.low.toFixed(2)} - ${ob.high.toFixed(2)}`);
    console.log(`  Strength: ${ob.strength}`);
  });
} else {
  console.log('No Order Blocks detected\n');
}
console.log();

// Detect Fair Value Gaps
console.log('📍 FAIR VALUE GAP DETECTION');
console.log('─'.repeat(60));
const fvgs = smcEngine.detectFairValueGaps(sampleKlines);
if (fvgs.length > 0) {
  fvgs.forEach((fvg, i) => {
    console.log(`Gap ${i + 1}: ${fvg.type} FVG (${fvg.filled ? 'FILLED' : 'UNFILLED'})`);
    console.log(`  Range: ${fvg.low.toFixed(2)} - ${fvg.high.toFixed(2)}`);
    console.log(`  Size: ${fvg.size.toFixed(2)} pips`);
  });
} else {
  console.log('No Fair Value Gaps detected\n');
}
console.log();

// Analyze Liquidity
console.log('💧 LIQUIDITY ANALYSIS');
console.log('─'.repeat(60));
const liquidity = smcEngine.analyzeLiquidity(sampleKlines);
console.log(`Session High: ${liquidity.sessionHigh?.toFixed(2)}`);
console.log(`Session Low: ${liquidity.sessionLow?.toFixed(2)}`);
console.log(`Mid Point: ${liquidity.midPoint?.toFixed(2)}`);
console.log(`Current Zone: ${liquidity.currentZone}`);
console.log(`Liquidity Sweep: ${liquidity.liquiditySweep ? 'YES' : 'NO'}`);
console.log(`Swing Highs: ${liquidity.swingHighs?.map(s => s.toFixed(2)).join(', ')}`);
console.log(`Swing Lows: ${liquidity.swingLows?.map(s => s.toFixed(2)).join(', ')}\n`);

// Generate Signal
console.log('🎯 SIGNAL GENERATION');
console.log('═'.repeat(60));
const signal = smcEngine.generateSignal(sampleKlines, 'BTCUSDT');
console.log(`Signal: ${signal.signal}`);
console.log(`Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
console.log(`Entry: ${signal.entry.toFixed(2)}`);
console.log(`Stop Loss: ${signal.stopLoss.toFixed(2)}`);
console.log(`Take Profit: ${signal.takeProfit.toFixed(2)}`);
console.log(`Risk:Reward: 1:${signal.riskReward.toFixed(2)}`);
console.log('\n📝 Reasoning:');
signal.reasoning.forEach((reason, i) => {
  console.log(`  ${i + 1}. ${reason}`);
});

console.log('\n' + '═'.repeat(60));
console.log('✅ SMC Analysis Complete!');
console.log('═'.repeat(60) + '\n');
