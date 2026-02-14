import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signalService, subscriptionService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import MarketFeed from '../components/trading/MarketFeed';
import MarketWatch from '../components/trading/MarketWatch';
import SignalPanel from '../components/trading/SignalPanel';
import Tesseract from 'tesseract.js';
import Chart from 'chart.js/auto';
import {
  calculateEMA,
  calculateRSI,
  calculateATR,
  detectSwings,
  formatPrice,
  getDecimals,
  calculateSMA,
  calculateMACD
} from '../utils/trading/indicators-complete';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  LogOut,
  Zap,
  Lock,
  Eye,
  Upload,
  User,
  Search,
  X
} from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────
const SYMBOL_LIST = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'XAUUSD'];
const TIMEFRAME_LIST = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

const TF_TO_INTERVAL = {
  M1: '1m', M5: '5m', M15: '15m', M30: '30m',
  H1: '1h', H4: '4h', D1: '1d', W1: '1w'
};

function timeframeToInterval(tf) {
  return TF_TO_INTERVAL[tf] || '1h';
}

// ─── ALL MARKETS DATA (for market discovery) ──────────────────
const ALL_MARKETS = [
  // Forex
  { symbol: 'EURUSD', name: 'EUR/USD', category: 'Forex', price: 1.0850, change: 0.15 },
  { symbol: 'GBPUSD', name: 'GBP/USD', category: 'Forex', price: 1.2650, change: 0.10 },
  { symbol: 'USDJPY', name: 'USD/JPY', category: 'Forex', price: 148.50, change: -0.20 },
  { symbol: 'USDCHF', name: 'USD/CHF', category: 'Forex', price: 0.8850, change: 0.05 },
  { symbol: 'AUDUSD', name: 'AUD/USD', category: 'Forex', price: 0.6550, change: 0.08 },
  { symbol: 'NZDUSD', name: 'NZD/USD', category: 'Forex', price: 0.6050, change: 0.00 },
  { symbol: 'USDCAD', name: 'USD/CAD', category: 'Forex', price: 1.3650, change: -0.05 },
  { symbol: 'EURGBP', name: 'EUR/GBP', category: 'Forex', price: 0.8580, change: 0.03 },
  { symbol: 'EURJPY', name: 'EUR/JPY', category: 'Forex', price: 161.50, change: -0.08 },
  { symbol: 'GBPJPY', name: 'GBP/JPY', category: 'Forex', price: 193.80, change: 0.12 },
  // Crypto
  { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'Crypto', price: 45280, change: 2.30 },
  { symbol: 'ETHUSDT', name: 'Ethereum', category: 'Crypto', price: 2500, change: 1.80 },
  { symbol: 'BNBUSDT', name: 'Binance Coin', category: 'Crypto', price: 600, change: 0.50 },
  { symbol: 'SOLUSDT', name: 'Solana', category: 'Crypto', price: 180, change: 1.20 },
  { symbol: 'XRPUSDT', name: 'Ripple', category: 'Crypto', price: 2.50, change: 0.80 },
  { symbol: 'ADAUSDT', name: 'Cardano', category: 'Crypto', price: 1.20, change: -0.30 },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', category: 'Crypto', price: 0.40, change: 3.50 },
  { symbol: 'AVAXUSDT', name: 'Avalanche', category: 'Crypto', price: 150, change: 2.10 },
  { symbol: 'DOTUSDT', name: 'Polkadot', category: 'Crypto', price: 8.50, change: 0.70 },
  { symbol: 'LINKUSDT', name: 'Chainlink', category: 'Crypto', price: 28, change: 1.30 },
  // Metals
  { symbol: 'XAUUSD', name: 'Gold', category: 'Metals', price: 2050, change: 0.20 },
  { symbol: 'XAGUSD', name: 'Silver', category: 'Metals', price: 24, change: 0.15 }
];

// ─── SHARED DATA HELPERS (FIXED) ────────────────────────────
//
// Replace everything from "async function fetchMarketData"
// through "async function fullSignalPipeline" with this block.
// Keep all the constants, imports, OCR patterns, and components.

/**
 * Fetch OHLCV candles via /api/market/series
 * Returns array of { time, open, high, low, close, volume }
 */
async function fetchMarketData(symbol, timeframe, limit = 120) {
  try {
    const interval = timeframeToInterval(timeframe);
    const params = new URLSearchParams({
      symbol: String(symbol).toUpperCase(),
      timeframe: interval,
      limit: String(limit)
    });

    const res = await fetch(`/api/market/series?${params}`);
    const result = await res.json();

    // Backend returns { success, data: { candles: [...], source, count } }
    if (!result.success || !result.data?.candles) {
      console.warn('fetchMarketData: no candles in response', result.message || '');
      return [];
    }

    return result.data.candles.map(k => ({
      time:   k.time,
      open:   parseFloat(k.open),
      high:   parseFloat(k.high),
      low:    parseFloat(k.low),
      close:  parseFloat(k.close),
      volume: parseFloat(k.volume || 0)
    }));
  } catch (err) {
    console.error('fetchMarketData failed:', err);
    return [];
  }
}

/**
 * Run SMC analysis on klines via backend
 * POST /api/analysis/analyze-smc { klines }
 */
async function analyzeSMCBackend(klines) {
  try {
    const res = await fetch('/api/analysis/analyze-smc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klines })
    });
    const data = await res.json();
    if (data.success && data.data) return data.data;
    console.warn('analyzeSMCBackend unsuccessful:', data.message || '');
    return null;
  } catch (err) {
    console.error('analyzeSMCBackend failed:', err);
    return null;
  }
}

/**
 * Generate signal from analysis result via backend
 * POST /api/analysis/generate-signal
 */
async function generateSignalBackend(analysis, currentPrice, symbol, timeframe) {
  try {
    const res = await fetch('/api/analysis/generate-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis, currentPrice, symbol, timeframe })
    });
    const data = await res.json();
    if (data.success && data.data) return data.data;
    console.warn('generateSignalBackend unsuccessful:', data.message || '');
    return null;
  } catch (err) {
    console.error('generateSignalBackend failed:', err);
    return null;
  }
}

// ─── LOCAL TA FALLBACK ──────────────────────────────────────

function analyzeMarketDataLocally(klines) {
  if (!klines || klines.length === 0) {
    return {
      currentPrice: 0, trend: 'NEUTRAL', bullishCandles: 0, bearishCandles: 0,
      ema20: 0, ema50: 0, rsi: 50, support: 0, resistance: 0
    };
  }

  let bullishCandles = 0, bearishCandles = 0;
  const closes = klines.map(k => k.close);
  const highs  = klines.map(k => k.high);
  const lows   = klines.map(k => k.low);

  klines.forEach(k => { k.close > k.open ? bullishCandles++ : bearishCandles++; });

  const ema20     = calculateEMA(closes, 20);
  const ema50     = calculateEMA(closes, 50);
  const rsi       = calculateRSI(closes);
  const support   = Math.min(...lows.slice(-20));
  const resistance = Math.max(...highs.slice(-20));

  return {
    currentPrice: closes[closes.length - 1],
    bullishCandles, bearishCandles,
    ema20, ema50, rsi, support, resistance,
    trend: ema20 > ema50 ? 'BULLISH' : 'BEARISH'
  };
}

function buildSignalLocally(analysis, symbol, timeframe) {
  const { currentPrice, bullishCandles, bearishCandles, rsi, support, resistance, trend } = analysis;
  const minRR = 2;
  const atr   = (resistance - support) * 0.4 || currentPrice * 0.02;

  let direction = 'WAIT';
  if (trend === 'BULLISH' && bullishCandles > bearishCandles && rsi < 70) direction = 'BUY';
  else if (trend === 'BEARISH' && bearishCandles > bullishCandles && rsi > 30) direction = 'SELL';

  const sig = {
    direction,
    confidence: Math.min(95, 50 + Math.abs(bullishCandles - bearishCandles) * 2),
    entry: currentPrice,
    sl: 0, tp1: 0, tp2: 0, tp3: 0,
    rr: '0.00',
    symbol,
    timeframe
  };

  if (direction === 'BUY') {
    sig.sl  = currentPrice - atr;
    sig.tp1 = currentPrice + atr * minRR;
    sig.tp2 = currentPrice + atr * (minRR + 0.5);
    sig.tp3 = currentPrice + atr * (minRR + 1);
  } else if (direction === 'SELL') {
    sig.sl  = currentPrice + atr;
    sig.tp1 = currentPrice - atr * minRR;
    sig.tp2 = currentPrice - atr * (minRR + 0.5);
    sig.tp3 = currentPrice - atr * (minRR + 1);
  }

  if (direction !== 'WAIT') {
    const risk   = Math.abs(sig.entry - sig.sl);
    const reward = Math.abs(sig.tp2 - sig.entry);
    sig.rr = risk > 0 ? (reward / risk).toFixed(2) : '0.00';
  }

  return sig;
}

// ─── MAIN SIGNAL PIPELINE ───────────────────────────────────
/**
 * Full signal pipeline — used by SignalGenerator, OCRScanner, and MarketSearch.
 * 
 * Strategy:
 *   1. Try all-in-one GET /api/analysis/analyze/:symbol/:timeframe  (1 call)
 *   2. Fallback: fetch klines → POST analyze-smc → POST generate-signal (3 calls)
 *   3. Final fallback: local TA calculation
 */
async function fullSignalPipeline(symbol, timeframe) {
  const normalizedTF = timeframeToInterval(timeframe);

  // ── STRATEGY 1: All-in-one endpoint ──
  try {
    const res = await fetch(`/api/analysis/analyze/${symbol}/${normalizedTF}?limit=120`);
    const result = await res.json();

    if (result.success && result.data?.signal) {
      const d   = result.data;
      const sig = d.signal;

      return {
        direction:  sig.direction || 'WAIT',
        confidence: sig.confidence || d.confluence?.confidence || 0,
        entry:      sig.entry || d.currentPrice,
        sl:         sig.stopLoss || 0,
        tp1:        sig.tp1 || 0,
        tp2:        sig.tp2 || 0,
        tp3:        sig.tp3 || 0,
        rr:         String(sig.rr || '0.00'),
        reason:     sig.reason || '',
        symbol,
        timeframe,
        analysis: {
          currentPrice: d.currentPrice,
          rsi:   d.indicators?.rsi != null ? Math.round(d.indicators.rsi) : 50,
          ema20: d.indicators?.ema20 || 0,
          ema50: d.indicators?.ema50 || 0,
          support:    d.supportResistance?.support || d.indicators?.support || 0,
          resistance: d.supportResistance?.resistance || d.indicators?.resistance || 0
        },
        smc:        d.smc || null,
        confluence: d.confluence || null,
        timestamp:  new Date().toLocaleTimeString()
      };
    }
    console.warn('All-in-one analysis: no signal in response');
  } catch (err) {
    console.warn('All-in-one analysis failed:', err.message);
  }

  // ── STRATEGY 2: Three-step pipeline ──
  const klines = await fetchMarketData(symbol, timeframe, 120);

  if (!klines || klines.length < 5) {
    console.warn('Insufficient kline data — returning empty signal');
    return {
      direction: 'WAIT', confidence: 0,
      entry: 0, sl: 0, tp1: 0, tp2: 0, tp3: 0,
      rr: '0.00', symbol, timeframe,
      reason: 'No market data available'
    };
  }

  const smcAnalysis = await analyzeSMCBackend(klines);

  if (smcAnalysis) {
    const currentPrice = klines[klines.length - 1].close;
    const backendSignal = await generateSignalBackend(smcAnalysis, currentPrice, symbol, timeframe);

    if (backendSignal) {
      return {
        direction:  backendSignal.signal || backendSignal.direction || 'WAIT',
        confidence: backendSignal.confidence || 50,
        entry:      backendSignal.entry || currentPrice,
        sl:         backendSignal.sl ?? backendSignal.stopLoss ?? 0,
        tp1:        backendSignal.tp1 ?? 0,
        tp2:        backendSignal.tp2 ?? 0,
        tp3:        backendSignal.tp3 ?? 0,
        rr:         String(backendSignal.rr || backendSignal.riskReward || '0.00'),
        reason:     backendSignal.reason || '',
        symbol,
        timeframe,
        analysis: {
          currentPrice: smcAnalysis.currentPrice || currentPrice,
          rsi:   smcAnalysis.rsi != null ? Math.round(smcAnalysis.rsi) : (smcAnalysis.indicators?.rsi != null ? Math.round(smcAnalysis.indicators.rsi) : 50),
          ema20: smcAnalysis.ema20 ?? smcAnalysis.indicators?.ema20 ?? 0,
          ema50: smcAnalysis.ema50 ?? smcAnalysis.indicators?.ema50 ?? 0,
          support:    smcAnalysis.supportResistance?.support ?? 0,
          resistance: smcAnalysis.supportResistance?.resistance ?? 0
        },
        smc:        smcAnalysis.smc || null,
        confluence: backendSignal.confluence || null,
        timestamp:  new Date().toLocaleTimeString()
      };
    }
  }

  // ── STRATEGY 3: Local TA fallback ──
  console.warn('Backend analysis unavailable — falling back to local TA');
  const localAnalysis = analyzeMarketDataLocally(klines);
  const localSignal   = buildSignalLocally(localAnalysis, symbol, timeframe);
  localSignal.analysis = {
    currentPrice: localAnalysis.currentPrice,
    rsi:          Math.round(localAnalysis.rsi),
    ema20:        localAnalysis.ema20,
    ema50:        localAnalysis.ema50,
    support:      localAnalysis.support,
    resistance:   localAnalysis.resistance
  };
  localSignal.timestamp = new Date().toLocaleTimeString();
  return localSignal;
}

// ─── OCR SYMBOL DETECTION ───────────────────────────────────
const SYMBOL_PATTERNS = {
  crypto:     new RegExp('\b(BTC|ETH|BNB|SOL|XRP|DOGE|ADA|DOT|MATIC|LINK|AVAX|SHIB|UNI|ATOM|LTC)(/|USD|USDT|BUSD)?\b', 'gi'),
  forex:      new RegExp('\b(EUR|GBP|USD|JPY|CHF|AUD|NZD|CAD)(/|-|)(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD)\b', 'gi'),
  gold:       new RegExp('\b(XAU|GOLD|XAUUSD)\b', 'gi'),
  timeframes: new RegExp('\b(M1|M5|M15|M30|H1|H4|D1|W1|MN|1m|5m|15m|30m|1h|4h|1d|1w)\b', 'gi')
};

function parseOCRText(text) {
  const upper = (text || '').toUpperCase();
  let symbol = null, timeframe = 'H1';

  for (const [type, pattern] of Object.entries(SYMBOL_PATTERNS)) {
    if (type === 'timeframes') continue;
    const m = upper.match(pattern);
    if (m && m.length > 0) {
      let s = m[0].replace(/[/\-]/g, '');
      if (type === 'crypto' && !s.includes('USDT') && !s.includes('USD')) s += 'USDT';
      if (type === 'gold') s = 'XAUUSD';
      if (type === 'forex' && s.length === 6) s = s.slice(0,3) + s.slice(3);
      symbol = s;
      break;
    }
  }

  const tfMatch = upper.match(SYMBOL_PATTERNS.timeframes);
  if (tfMatch) {
    let tf = tfMatch[0].toUpperCase();
    const tfMap = { '1M':'M1','5M':'M5','15M':'M15','30M':'M30','1H':'H1','4H':'H4','1D':'D1','1W':'W1' };
    timeframe = tfMap[tf] || tf;
  }

  return { symbol: symbol || 'BTCUSDT', timeframe };
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT (EXISTING STRUCTURE PRESERVED)
// ═══════════════════════════════════════════════════════════
export default function TradingDashboard() {
  const [canGenerate, setCanGenerate]           = useState(false);
  const [subscriptionStatus, setSubStatus]      = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const [selectedSignal, setSelectedSignal]     = useState(null);
  const [showMarketSearch, setShowMarketSearch] = useState(false);
  const navigate                                = useNavigate();
  const { user, logout }                        = useAuth();
  const { connectionStatus }                    = useMarket();

  useEffect(() => { checkAccess(); }, []);

  const checkAccess = async () => {
    try {
      const accessResponse = await signalService.checkAccess();
      if (!accessResponse.data || !accessResponse.data.canGenerate) {
        navigate('/subscribe');
        return;
      }
      setCanGenerate(true);
      const statusResponse = await subscriptionService.getStatus();
      setSubStatus(statusResponse.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load trading dashboard.');
      if (err.response?.status === 403) navigate('/subscribe');
    } finally {
      setLoading(false);
    }
  };

  const handleSignalGeneration = async (signalData) => {
    try {
      const response = await signalService.generate(signalData);
      if (!response.success && response.error === 'TRIAL_LIMIT_EXCEEDED') {
        alert(response.message);
        navigate('/subscribe');
        return false;
      }
      if (response.data?.remainingSignals !== undefined) {
        setSubStatus(prev => ({
          ...prev,
          trial: { ...prev?.trial, remaining: response.data.remainingSignals }
        }));
      }
      return true;
    } catch (err) {
      if (err.response?.data?.error === 'TRIAL_LIMIT_EXCEEDED') {
        alert('Trial limit exceeded. Please upgrade.');
        navigate('/subscribe');
        return false;
      }
      console.error('Signal generation failed:', err);
      return false;
    }
  };

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-400">Loading trading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="bg-black-light rounded-xl p-8 max-w-md text-center">
          <p className="text-red text-lg mb-4">⚠️ Error Loading Dashboard</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button onClick={() => navigate('/login')}
            className="bg-yellow text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-dark transition">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Main render (EXISTING STRUCTURE) ──
  return (
    <div className="min-h-screen bg-black">
      {/* ─ HEADER (ENHANCED WITH MARKET SEARCH) ─ */}
      <div className="fixed top-0 w-full bg-black-light border-b border-gray-800 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="text-sm font-bold tracking-wider text-white">SMART-KORAFX</div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-green rounded-full animate-pulse"></div>
              <span className="text-gray-400">LIVE</span>
            </div>
          </div>

          {subscriptionStatus && (
            <div className="flex items-center space-x-4 text-xs">
              {subscriptionStatus.hasActiveSubscription ? (
                <div className="flex items-center space-x-2 bg-green/10 border border-green px-3 py-2 rounded">
                  <Lock className="w-3 h-3 text-green" />
                  <span className="text-green font-mono">
                    {subscriptionStatus.activeSubscription?.plan || 'PRO'} · Active
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-yellow/10 border border-yellow px-3 py-2 rounded">
                  <Zap className="w-3 h-3 text-yellow" />
                  <span className="text-yellow font-mono">
                    Trial: {subscriptionStatus.trial?.remaining ?? 2}/{subscriptionStatus.trial?.dailyLimit ?? 2}
                  </span>
                </div>
              )}

              {/* NEW: Quick Market Search Button */}
              <button
                onClick={() => setShowMarketSearch(true)}
                className="text-gray-400 hover:text-yellow transition p-1.5 rounded border border-gray-800 hover:border-yellow"
                title="Quick market search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <div className="text-right text-xs">
              <div className="text-white font-mono">{user?.fullName || 'Trader'}</div>
              <div className="text-gray-500">User</div>
            </div>
            {subscriptionStatus && !subscriptionStatus.hasActiveSubscription && (
              <button onClick={() => navigate('/subscribe')}
                className="text-xs font-semibold px-3 py-2 bg-yellow text-black rounded hover:bg-yellow/90 transition">
                Upgrade
              </button>
            )}
            <button onClick={() => navigate('/profile')} className="text-gray-400 hover:text-yellow transition p-1" title="Profile">
              <User className="w-4 h-4" />
            </button>
            <button onClick={logout} className="text-gray-400 hover:text-yellow transition p-1" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─ MAIN CONTENT (EXISTING STRUCTURE) ─ */}
      <main className="pt-16 max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            <MarketWatch onSelectPair={setSelectedSignal} />
            <SignalGenerator onSignalGeneration={handleSignalGeneration} />
            <OCRScanner onSignalGeneration={handleSignalGeneration} />
            <LiveChart />
          </div>

          {/* Right 1/3 */}
          <div className="space-y-6">
            <MarketFeed />
            <RiskSettings />
            <SystemStatus />
          </div>
        </div>
      </main>

      {/* Signal Panel Modal */}
      {selectedSignal && (
        <SignalPanel
          signal={selectedSignal}
          symbol={selectedSignal.symbol}
          onClose={() => setSelectedSignal(null)}
        />
      )}

      {/* Market Search Modal (NEW - INTEGRATED INTERNALLY) */}
      {showMarketSearch && (
        <QuickMarketSearch
          onClose={() => setShowMarketSearch(false)}
          onSelectMarket={(market) => {
            setShowMarketSearch(false);
            // Generate signal for selected market
            handleGenerateSignalForMarket(market);
          }}
        />
      )}
    </div>
  );

  // ── Internal function to generate signal for market ──
  async function handleGenerateSignalForMarket(market) {
    const allowed = await handleSignalGeneration({ 
      symbol: market.symbol, 
      timeframe: 'H1', 
      signalType: 'MARKET_SEARCH' 
    });
    if (!allowed) return;

    try {
      const signal = await fullSignalPipeline(market.symbol, 'H1');
      setSelectedSignal(signal);
    } catch (err) {
      console.error('Failed to generate signal:', err);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// QUICK MARKET SEARCH MODAL (NEW - LIGHT OVERLAY)
// ═══════════════════════════════════════════════════════════
function QuickMarketSearch({ onClose, onSelectMarket }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [generatingSignal, setGeneratingSignal] = useState(null);

  const categories = [
    { key: 'ALL', label: 'All', icon: '🌍' },
    { key: 'Forex', label: 'Forex', icon: '💱' },
    { key: 'Crypto', label: 'Crypto', icon: '₿' },
    { key: 'Metals', label: 'Metals', icon: '🥇' }
  ];

  const filtered = ALL_MARKETS
    .filter(m => (selectedCategory === 'ALL' || m.category === selectedCategory) &&
                  (m.name.toUpperCase().includes(searchQuery.toUpperCase()) || 
                   m.symbol.toUpperCase().includes(searchQuery.toUpperCase())))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20 p-4">
      <div className="bg-black-light rounded-lg border border-gray-800 w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-800 p-4 flex justify-between items-center bg-black">
          <h3 className="text-sm font-bold text-white">Quick Market Search</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="border-b border-gray-800 p-4 bg-black space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="Search pairs (BTC, EUR/USD, Gold...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-gray-900 border border-gray-800 text-white pl-9 pr-3 py-2 rounded text-sm focus:border-yellow outline-none transition"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1 text-xs font-semibold rounded border transition ${
                  selectedCategory === cat.key
                    ? 'bg-yellow text-black border-yellow'
                    : 'border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Markets List */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No markets found
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filtered.map(market => (
                <div
                  key={market.symbol}
                  className="bg-black hover:bg-gray-900 transition p-4 flex items-center justify-between cursor-pointer group"
                  onClick={() => onSelectMarket(market)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{market.name}</div>
                    <div className="text-xs text-gray-500">{market.symbol} • {market.category}</div>
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-sm font-bold text-yellow font-mono">${formatPrice(market.price)}</div>
                    <div className={`text-xs font-semibold ${market.change >= 0 ? 'text-green' : 'text-red'}`}>
                      {market.change >= 0 ? '↑' : '↓'} {Math.abs(market.change).toFixed(2)}%
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMarket(market);
                    }}
                    className="ml-4 px-3 py-1.5 text-xs font-semibold bg-yellow text-black rounded hover:bg-yellow/90 transition whitespace-nowrap opacity-0 group-hover:opacity-100"
                  >
                    Signal
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIGNAL GENERATOR (EXISTING)
// ═══════════════════════════════════════════════════════════
function SignalGenerator({ onSignalGeneration }) {
  const [symbol, setSymbol]       = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('H1');
  const [loading, setLoading]     = useState(false);
  const [signal, setSignal]       = useState(null);

  const handleGenerate = async () => {
    const allowed = await onSignalGeneration({ symbol, timeframe, signalType: 'LIVE_ANALYSIS' });
    if (!allowed) return;

    setLoading(true);
    setSignal(null);
    try {
      const result = await fullSignalPipeline(symbol, timeframe);
      setSignal(result);
    } catch (err) {
      console.error('Signal generation failed:', err);
      alert('Failed to generate signal – please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-wider text-white uppercase">Signal Generator</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Symbol</label>
          <select value={symbol} onChange={e => setSymbol(e.target.value)}
            className="w-full px-3 py-2 bg-black border border-gray-800 text-white text-sm rounded font-mono focus:border-yellow outline-none transition">
            {SYMBOL_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Timeframe</label>
          <select value={timeframe} onChange={e => setTimeframe(e.target.value)}
            className="w-full px-3 py-2 bg-black border border-gray-800 text-white text-sm rounded font-mono focus:border-yellow outline-none transition">
            {TIMEFRAME_LIST.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>
      </div>

      <button onClick={handleGenerate} disabled={loading}
        className="w-full py-2 bg-yellow text-black text-sm font-semibold rounded hover:bg-yellow/90 transition disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? 'Analyzing…' : 'Generate Signal'}
      </button>

      {signal && signal.entry != null && <SignalDisplay signal={signal} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OCR SCANNER (EXISTING)
// ═══════════════════════════════════════════════════════════
function OCRScanner({ onSignalGeneration }) {
  const [loading, setLoading]   = useState(false);
  const [signal, setSignal]     = useState(null);
  const fileInputRef            = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    const allowed = await onSignalGeneration({ symbol: 'OCR_SCAN', timeframe: 'AUTO', signalType: 'OCR_ANALYSIS' });
    if (!allowed) return;

    setLoading(true);
    setSignal(null);
    try {
      const { data } = await Tesseract.recognize(file, 'eng');
      const { symbol, timeframe } = parseOCRText(data.text);
      const result = await fullSignalPipeline(symbol, timeframe);
      setSignal(result);
    } catch (err) {
      console.error('OCR analysis failed:', err);
      alert('Failed to process screenshot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-wider text-white uppercase">Chart Analysis (OCR)</h2>
        <Upload className="w-4 h-4 text-gray-500" />
      </div>

      <div
        className="border border-gray-800 bg-black rounded-lg p-8 text-center cursor-pointer hover:border-yellow/50 transition"
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept="image/*"
          onChange={e => handleFileSelect(e.target.files?.[0])} className="hidden" />

        {loading ? (
          <div className="flex flex-col items-center">
            <div className="spinner mb-4"></div>
            <p className="text-sm text-gray-400">Extracting text & analysing…</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-white font-mono mb-1">Upload Chart Screenshot</p>
            <p className="text-xs text-gray-500">TradingView · MT4/MT5 · Bloomberg</p>
          </>
        )}
      </div>

      {signal && signal.entry != null && <SignalDisplay signal={signal} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LIVE CHART (EXISTING)
// ═══════════════════════════════════════════════════════════
function LiveChart() {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const [symbol, setSymbol] = useState('BTCUSDT');

  const loadChart = useCallback(async (sym) => {
    const klines = await fetchMarketData(sym, 'H1', 80);
    if (!klines.length || !canvasRef.current) return;

    const closes = klines.map(k => k.close);
    const labels = klines.map(k => new Date(k.time).toLocaleTimeString());

    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = closes;
      chartRef.current.data.datasets[0].label = sym;
      chartRef.current.update();
    } else {
      const ctx = canvasRef.current.getContext('2d');
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: sym,
            data: closes,
            borderColor: '#FFD700',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: {
              position: 'right',
              grid: { color: 'rgba(255, 215, 0, 0.1)' },
              ticks: { color: '#888' }
            }
          }
        }
      });
    }
  }, []);

  useEffect(() => { loadChart(symbol); }, [symbol, loadChart]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  const TICKERS = [
    { label: 'BTC',  sym: 'BTCUSDT' },
    { label: 'ETH',  sym: 'ETHUSDT' },
    { label: 'XAU',  sym: 'XAUUSD' }
  ];

  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold tracking-wider text-white uppercase">Live Market</h2>
        <div className="flex gap-2">
          {TICKERS.map(t => (
            <button key={t.sym}
              className={`px-2 py-1 text-xs font-mono rounded border transition ${
                symbol === t.sym
                  ? 'bg-yellow text-black border-yellow'
                  : 'border-gray-800 text-gray-400 hover:border-yellow/50'
              }`}
              onClick={() => setSymbol(t.sym)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', height: '300px' }}>
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RISK SETTINGS (EXISTING)
// ═══════════════════════════════════════════════════════════
function RiskSettings() {
  const [risk, setRisk]   = useState(2);
  const [minRR, setMinRR] = useState(2);

  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      <h2 className="text-sm font-bold tracking-wider text-white mb-4 uppercase">Risk Parameters</h2>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Risk Per Trade</label>
            <span className="text-sm text-yellow font-mono">{risk}%</span>
          </div>
          <input type="range" min="0.5" max="5" step="0.5" value={risk}
            onChange={e => setRisk(parseFloat(e.target.value))} className="w-full accent-yellow" />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Min Risk:Reward</label>
          <select value={minRR} onChange={e => setMinRR(parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-sm text-white font-mono focus:border-yellow outline-none transition">
            <option value={1.5}>1:1.5</option>
            <option value={2}>1:2.0</option>
            <option value={2.5}>1:2.5</option>
            <option value={3}>1:3.0</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SYSTEM STATUS (EXISTING)
// ═══════════════════════════════════════════════════════════
function SystemStatus() {
  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      <h2 className="text-sm font-bold tracking-wider text-white mb-4 uppercase">System Status</h2>
      <div className="space-y-3 text-xs">
        {[
          ['Binance API',      'Online'],
          ['Market Data',      'Streaming'],
          ['Analysis Engine',  'Ready']
        ].map(([label, status], i) => (
          <div key={i} className={`flex justify-between items-center ${i < 2 ? 'pb-2 border-b border-gray-800' : ''}`}>
            <span className="text-gray-400">{label}</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green rounded-full"></div>
              <span className="text-green font-mono">{status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIGNAL DISPLAY (EXISTING)
// ═══════════════════════════════════════════════════════════
function SignalDisplay({ signal }) {
  if (!signal || signal.entry == null || isNaN(Number(signal.entry))) {
    return (
      <div className="mt-6 rounded-lg p-4 border border-gray-800 bg-black text-center">
        <p className="text-gray-500 text-sm">No signal data available yet.</p>
      </div>
    );
  }

  const isBuy  = signal.direction === 'BUY';
  const isSell = signal.direction === 'SELL';
  const decimals = getDecimals(signal.entry);

  return (
    <div className={`mt-6 rounded-lg p-6 border-l-4 ${
      isBuy  ? 'bg-black border-green'
      : isSell ? 'bg-black border-red'
      : 'bg-black border-gray-800'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          {isBuy
            ? <TrendingUp  className="w-5 h-5 text-green" />
            : <TrendingDown className="w-5 h-5 text-red" />
          }
          <div>
            <div className={`text-lg font-bold font-mono ${isBuy ? 'text-green' : isSell ? 'text-red' : 'text-gray-400'}`}>
              {signal.direction}
            </div>
            <div className="text-xs text-gray-500">
              {signal.symbol || ''} {signal.timeframe || ''}
              {signal.reason ? ` · ${signal.reason}` : ''}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow font-mono">{signal.confidence}%</div>
          <div className="text-xs text-gray-500">Confidence</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <PriceBox label="Entry"       value={signal.entry}  decimals={decimals} color="text-white" />
        <PriceBox label="Stop Loss"   value={signal.sl}     decimals={decimals} color="text-red"   />
        <PriceBox label="Take Profit" value={signal.tp1}    decimals={decimals} color="text-green" />
        <div className="bg-black-light rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Risk:Reward</div>
          <div className="text-sm font-mono font-bold text-yellow">1:{signal.rr}</div>
        </div>
      </div>
    </div>
  );
}

function PriceBox({ label, value, decimals, color }) {
  const safe = (value != null && !isNaN(Number(value))) ? Number(value).toFixed(decimals) : '—';
  return (
    <div className="bg-black-light rounded p-3 border border-gray-800">
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-mono font-bold ${color}`}>{safe}</div>
    </div>
  );
}