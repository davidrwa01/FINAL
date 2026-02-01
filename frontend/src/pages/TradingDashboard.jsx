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
  User
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

// ─── SHARED DATA HELPERS ────────────────────────────────────

/**
 * Fetch klines through YOUR backend proxy at /api/signals/klines/:symbol/:interval/:limit
 * The backend already validates & forwards to Binance, and returns raw Binance arrays.
 * We parse those arrays into { time, open, high, low, close, volume } objects.
 */
async function fetchMarketData(symbol, timeframe, limit = 120) {
  try {
    const interval = timeframeToInterval(timeframe);
    const res = await fetch(`/api/signals/klines/${symbol}/${interval}/${limit}`);
    const result = await res.json();

    // Backend wraps in { success, data } – data is the raw Binance array
    const raw = result.success && Array.isArray(result.data) ? result.data : [];

    return raw.map(k => ({
      time:   k[0],
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (err) {
    console.error('fetchMarketData failed:', err);
    return [];
  }
}

/**
 * Run full SMC analysis on the backend.
 * POST /api/analysis/analyze-smc  expects { klines: [...] }
 */
async function analyzeSMCBackend(klines) {
  try {
    const res = await fetch('/api/analysis/analyze-smc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klines })
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (err) {
    console.error('analyzeSMCBackend failed:', err);
    return null;
  }
}

/**
 * Generate a signal on the backend.
 * POST /api/analysis/generate-signal  expects { analysis, currentPrice, symbol, timeframe }
 */
async function generateSignalBackend(analysis, currentPrice, symbol, timeframe) {
  try {
    const res = await fetch('/api/analysis/generate-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis, currentPrice, symbol, timeframe })
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (err) {
    console.error('generateSignalBackend failed:', err);
    return null;
  }
}

// ─── LOCAL TA FALLBACK (when backend is unavailable) ────────
function analyzeMarketDataLocally(klines) {
  if (!klines || klines.length === 0) {
    return { currentPrice: 0, trend: 'NEUTRAL', bullishCandles: 0, bearishCandles: 0,
             ema20: 0, ema50: 0, rsi: 50, support: 0, resistance: 0 };
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

/**
 * Full pipeline: fetch → backend SMC → backend signal → fallback if needed
 */
async function fullSignalPipeline(symbol, timeframe) {
  const klines = await fetchMarketData(symbol, timeframe, 120);
  if (!klines || klines.length < 5) {
    console.warn('Insufficient kline data, using empty signal');
    return { direction: 'WAIT', confidence: 0, entry: 0, sl: 0, tp1: 0, tp2: 0, tp3: 0, rr: '0.00', symbol, timeframe };
  }

  // Try backend SMC + signal
  const smcAnalysis = await analyzeSMCBackend(klines);
  if (smcAnalysis) {
    const currentPrice = klines[klines.length - 1].close;
    const backendSignal = await generateSignalBackend(smcAnalysis, currentPrice, symbol, timeframe);
    if (backendSignal) {
      // Normalise backend response shape to match what SignalDisplay expects
      return {
        direction:  backendSignal.signal || 'WAIT',
        confidence: backendSignal.confidence || 50,
        entry:      backendSignal.entry || currentPrice,
        sl:         backendSignal.stopLoss || 0,
        tp1:        backendSignal.takeProfit || 0,
        tp2:        backendSignal.takeProfit || 0,
        tp3:        backendSignal.takeProfit || 0,
        rr:         String(backendSignal.riskReward || '0.00'),
        reason:     backendSignal.reason || '',
        symbol,
        timeframe
      };
    }
  }

  // Fallback: local analysis
  console.warn('Backend analysis unavailable – falling back to local TA');
  const localAnalysis = analyzeMarketDataLocally(klines);
  return buildSignalLocally(localAnalysis, symbol, timeframe);
}

// ─── OCR SYMBOL DETECTION ───────────────────────────────────
const SYMBOL_PATTERNS = {
  crypto: /\b(BTC|ETH|BNB|SOL|XRP|DOGE|ADA|DOT|MATIC|LINK|AVAX|SHIB|UNI|ATOM|LTC)(\/|USD|USDT|BUSD)?\b/gi,
  forex:  /\b(EUR|GBP|USD|JPY|CHF|AUD|NZD|CAD)(\/|-|)(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD)\b/gi,
  gold:   /\b(XAU|GOLD|XAUUSD)\b/gi,
  timeframes: /\b(M1|M5|M15|M30|H1|H4|D1|W1|MN|1m|5m|15m|30m|1h|4h|1d|1w)\b/gi
};

function parseOCRText(text) {
  const upper = (text || '').toUpperCase();
  let symbol = null, timeframe = 'H1';

  // Detect symbol
  for (const [type, pattern] of Object.entries(SYMBOL_PATTERNS)) {
    if (type === 'timeframes') continue;
    const m = upper.match(pattern);
    if (m && m.length > 0) {
      let s = m[0].replace(/[\/\-]/g, '');
      if (type === 'crypto' && !s.includes('USDT') && !s.includes('USD')) s += 'USDT';
      if (type === 'gold') s = 'XAUUSD';
      if (type === 'forex' && s.length === 6) s = s.slice(0,3) + s.slice(3); // keep normalised
      symbol = s;
      break;
    }
  }

  // Detect timeframe
  const tfMatch = upper.match(SYMBOL_PATTERNS.timeframes);
  if (tfMatch) {
    let tf = tfMatch[0].toUpperCase();
    const tfMap = { '1M':'M1','5M':'M5','15M':'M15','30M':'M30','1H':'H1','4H':'H4','1D':'D1','1W':'W1' };
    timeframe = tfMap[tf] || tf;
  }

  return { symbol: symbol || 'BTCUSDT', timeframe };
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════
export default function TradingDashboard() {
  const [canGenerate, setCanGenerate]           = useState(false);
  const [subscriptionStatus, setSubStatus]      = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const [selectedSignal, setSelectedSignal]     = useState(null);
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

  // ── Main render ──
  return (
    <div className="min-h-screen bg-black">
      {/* ─ HEADER ─ */}
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

      {/* ─ MAIN CONTENT ─ */}
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIGNAL GENERATOR
// ═══════════════════════════════════════════════════════════
function SignalGenerator({ onSignalGeneration }) {
  const [symbol, setSymbol]       = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('H1');
  const [loading, setLoading]     = useState(false);
  const [signal, setSignal]       = useState(null);

  const handleGenerate = async () => {
    // 1. Gate: check trial / subscription
    const allowed = await onSignalGeneration({ symbol, timeframe, signalType: 'LIVE_ANALYSIS' });
    if (!allowed) return;

    setLoading(true);
    setSignal(null); // clear stale signal before fetch
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

      {/* Only render SignalDisplay when we actually have a signal with an entry price */}
      {signal && signal.entry != null && <SignalDisplay signal={signal} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OCR SCANNER
// ═══════════════════════════════════════════════════════════
function OCRScanner({ onSignalGeneration }) {
  const [loading, setLoading]   = useState(false);
  const [signal, setSignal]     = useState(null);
  const fileInputRef            = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // 1. Gate
    const allowed = await onSignalGeneration({ symbol: 'OCR_SCAN', timeframe: 'AUTO', signalType: 'OCR_ANALYSIS' });
    if (!allowed) return;

    setLoading(true);
    setSignal(null);
    try {
      // 2. OCR
      const { data } = await Tesseract.recognize(file, 'eng');
      console.log('OCR text:', data.text);

      // 3. Parse symbol + timeframe from OCR output
      const { symbol, timeframe } = parseOCRText(data.text);
      console.log('Detected symbol:', symbol, 'timeframe:', timeframe);

      // 4. Run the full pipeline with the detected symbol
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
            <p className="text-sm text-gray-400">Extracting text & analysing market structure…</p>
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
// LIVE CHART  –  re-fetches real klines when symbol changes
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
      // Update existing chart
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = closes;
      chartRef.current.data.datasets[0].label = sym;
      chartRef.current.update();
    } else {
      // Create new chart
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

  // Initial load + reload when symbol changes
  useEffect(() => { loadChart(symbol); }, [symbol, loadChart]);

  // Cleanup on unmount
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
    { label: 'XAU',  sym: 'XAUUSD' }   // Note: XAUUSD won't have Binance klines – backend will 404; chart stays as-is
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
// RISK SETTINGS
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
// SYSTEM STATUS
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
// SIGNAL DISPLAY  –  guarded: only renders when signal.entry is a number
// ═══════════════════════════════════════════════════════════
function SignalDisplay({ signal }) {
  // ── Guard: bail early if signal shape is incomplete ──
  if (!signal || signal.entry == null || isNaN(Number(signal.entry))) {
    return (
      <div className="mt-6 rounded-lg p-4 border border-gray-800 bg-black text-center">
        <p className="text-gray-500 text-sm">No signal data available yet.</p>
      </div>
    );
  }

  const isBuy  = signal.direction === 'BUY';
  const isSell = signal.direction === 'SELL';
  const decimals = getDecimals(signal.entry); // safe now – guarded above

  return (
    <div className={`mt-6 rounded-lg p-6 border-l-4 ${
      isBuy  ? 'bg-black border-green'
      : isSell ? 'bg-black border-red'
      : 'bg-black border-gray-800'
    }`}>
      {/* Header row */}
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

      {/* Price grid */}
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

/** Small reusable price box */
function PriceBox({ label, value, decimals, color }) {
  const safe = (value != null && !isNaN(Number(value))) ? Number(value).toFixed(decimals) : '—';
  return (
    <div className="bg-black-light rounded p-3 border border-gray-800">
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-mono font-bold ${color}`}>{safe}</div>
    </div>
  );
}