import React, { useState } from 'react';
import analysisService from '../../services/analysisService';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

// ─── FOREX + CRYPTO PAIRS ───────────────────────────────────
const PAIRS = [
  { symbol: 'EURUSD', label: 'EUR/USD', category: 'forex' },
  { symbol: 'GBPUSD', label: 'GBP/USD', category: 'forex' },
  { symbol: 'USDJPY', label: 'USD/JPY', category: 'forex' },
  { symbol: 'USDCHF', label: 'USD/CHF', category: 'forex' },
  { symbol: 'AUDUSD', label: 'AUD/USD', category: 'forex' },
  { symbol: 'NZDUSD', label: 'NZD/USD', category: 'forex' },
  { symbol: 'USDCAD', label: 'USD/CAD', category: 'forex' },
  { symbol: 'XAUUSD', label: 'XAU/USD', category: 'gold' },
  { symbol: 'BTCUSDT', label: 'BTC/USDT', category: 'crypto' },
  { symbol: 'ETHUSDT', label: 'ETH/USDT', category: 'crypto' },
];

const TIMEFRAMES = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

/**
 * Safely flatten the nested analysisService response into primitives.
 * 
 * analysisService.generateLiveSignal() returns:
 * {
 *   signal: { direction, confidence, entry, stopLoss, tp1, tp2, tp3, rr, reason },
 *   confluence: { confidence, breakdown },
 *   indicators: { currentPrice, rsi, ema20, ema50 },
 *   smc: { marketBias, structure },
 *   direction: 'BUY',       // convenience string
 *   confidence: 80,
 *   entry: 1.0850,
 *   ...
 * }
 */
function flattenSignal(result, pairSymbol, timeframe) {
  if (!result) return null;

  const sig = (result.signal && typeof result.signal === 'object')
    ? result.signal
    : null;

  const direction  = (typeof result.direction === 'string') ? result.direction : sig?.direction || 'WAIT';
  const confidence = Number(result.confidence || sig?.confidence || result.confluence?.confidence || 0);
  const entry      = Number(result.entry || sig?.entry || result.indicators?.currentPrice || 0);
  const sl         = Number(result.stopLoss || result.sl || sig?.stopLoss || sig?.sl || 0);
  const tp1        = Number(result.tp1 || sig?.tp1 || 0);
  const tp2        = Number(result.tp2 || sig?.tp2 || 0);
  const tp3        = Number(result.tp3 || sig?.tp3 || 0);
  const rr         = String(result.rr || sig?.rr || '0.00');
  const reason     = String(sig?.reason || result.reason || '');

  return {
    direction,
    confidence,
    entry,
    sl,
    tp1,
    tp2,
    tp3,
    rr,
    reason,
    symbol: pairSymbol,
    timeframe,
    analysis: {
      currentPrice: Number(result.indicators?.currentPrice || entry),
      rsi:   result.indicators?.rsi != null ? Math.round(Number(result.indicators.rsi)) : 50,
      ema20: Number(result.indicators?.ema20 || 0),
      ema50: Number(result.indicators?.ema50 || 0),
      support:    Number(result.indicators?.support || 0),
      resistance: Number(result.indicators?.resistance || 0)
    },
    smc:        result.smc || null,
    confluence: result.confluence || null,
    timestamp:  new Date().toLocaleTimeString()
  };
}

// ─── COMPONENT ──────────────────────────────────────────────
export default function MarketWatch({ onSelectPair }) {
  const [selectedPair, setSelectedPair]     = useState(null);
  const [selectedTimeframe, setTimeframe]   = useState('H1');
  const [loading, setLoading]               = useState(false);
  const [signal, setSignal]                 = useState(null);
  const [error, setError]                   = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const handlePairClick = async (pair) => {
    setSelectedPair(pair.symbol);
    setLoading(true);
    setSignal(null);
    setError(null);

    try {
      const result = await analysisService.generateLiveSignal(pair.symbol, selectedTimeframe);

      if (result.error && !result.entry) {
        setError(typeof result.error === 'string' ? result.error : 'Analysis failed');
        setLoading(false);
        return;
      }

      const mapped = flattenSignal(result, pair.symbol, selectedTimeframe);

      if (!mapped || mapped.entry === 0) {
        setError('No data available for ' + pair.symbol);
        setLoading(false);
        return;
      }

      setSignal(mapped);

      if (onSelectPair && mapped.entry > 0) {
        onSelectPair(mapped);
      }
    } catch (err) {
      console.error('MarketWatch signal generation failed:', err);
      setError('Failed to analyse ' + pair.symbol + '. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPairs = activeCategory === 'all'
    ? PAIRS
    : PAIRS.filter(p => p.category === activeCategory);

  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-wider text-white uppercase">Market Watch</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-3">
        {['all', 'forex', 'gold', 'crypto'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 text-xs font-mono rounded border transition ${
              activeCategory === cat
                ? 'bg-yellow text-black border-yellow'
                : 'border-gray-800 text-gray-400 hover:border-yellow/50'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Timeframe selector */}
      <div className="flex gap-2 mb-4">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-2 py-0.5 text-xs font-mono rounded border transition ${
              selectedTimeframe === tf
                ? 'bg-gray-700 text-white border-gray-600'
                : 'border-gray-800 text-gray-500 hover:border-gray-600'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Pairs grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {filteredPairs.map(pair => (
          <button
            key={pair.symbol}
            onClick={() => handlePairClick(pair)}
            disabled={loading && selectedPair === pair.symbol}
            className={`text-left px-3 py-2.5 rounded border transition cursor-pointer ${
              selectedPair === pair.symbol
                ? 'border-yellow bg-yellow/5'
                : 'border-gray-800 hover:border-gray-600 bg-black'
            } ${loading && selectedPair === pair.symbol ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-white font-mono font-semibold">{pair.label}</span>
              {loading && selectedPair === pair.symbol && (
                <Loader2 className="w-3 h-3 text-yellow animate-spin" />
              )}
            </div>
            <div className="text-xs text-gray-600 mt-0.5 capitalize">{pair.category}</div>
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg p-3 border border-red/30 bg-red/5 mb-3">
          <p className="text-xs text-red">{String(error)}</p>
        </div>
      )}

      {/* Signal result — BUY or SELL */}
      {signal && signal.entry != null && signal.entry !== 0 && signal.direction !== 'WAIT' && (
        <div className={`rounded-lg p-4 border-l-4 ${
          signal.direction === 'BUY'  ? 'border-green bg-green/5'
          : signal.direction === 'SELL' ? 'border-red bg-red/5'
          : 'border-gray-600 bg-black'
        }`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              {signal.direction === 'BUY'
                ? <TrendingUp className="w-4 h-4 text-green" />
                : <TrendingDown className="w-4 h-4 text-red" />
              }
              <span className={`text-sm font-bold font-mono ${
                signal.direction === 'BUY' ? 'text-green' : 'text-red'
              }`}>
                {String(signal.direction)}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {String(signal.symbol)} · {String(signal.timeframe)}
              </span>
            </div>
            <span className="text-sm font-bold text-yellow font-mono">
              {Number(signal.confidence)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-500 uppercase tracking-wider">Entry</div>
              <div className="text-white font-mono font-semibold">{formatNum(signal.entry)}</div>
            </div>
            <div>
              <div className="text-gray-500 uppercase tracking-wider">Stop Loss</div>
              <div className="text-red font-mono font-semibold">{formatNum(signal.sl)}</div>
            </div>
            <div>
              <div className="text-gray-500 uppercase tracking-wider">Take Profit</div>
              <div className="text-green font-mono font-semibold">{formatNum(signal.tp1)}</div>
            </div>
            <div>
              <div className="text-gray-500 uppercase tracking-wider">Risk:Reward</div>
              <div className="text-yellow font-mono font-semibold">1:{String(signal.rr)}</div>
            </div>
          </div>

          {(signal.analysis?.rsi || signal.analysis?.ema20) && (
            <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-2 border-t border-gray-800">
              {signal.analysis.rsi != null && (
                <div>
                  <div className="text-gray-500 uppercase tracking-wider">RSI</div>
                  <div className="text-white font-mono font-semibold">{Number(signal.analysis.rsi)}</div>
                </div>
              )}
              {signal.analysis.ema20 != null && signal.analysis.ema20 !== 0 && (
                <div>
                  <div className="text-gray-500 uppercase tracking-wider">EMA20</div>
                  <div className="text-white font-mono font-semibold">{formatNum(signal.analysis.ema20)}</div>
                </div>
              )}
              {signal.analysis.ema50 != null && signal.analysis.ema50 !== 0 && (
                <div>
                  <div className="text-gray-500 uppercase tracking-wider">EMA50</div>
                  <div className="text-white font-mono font-semibold">{formatNum(signal.analysis.ema50)}</div>
                </div>
              )}
            </div>
          )}

          {signal.reason && (
            <div className="mt-3 pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-400">{String(signal.reason)}</p>
            </div>
          )}
        </div>
      )}

      {/* WAIT signal */}
      {signal && signal.direction === 'WAIT' && (
        <div className="rounded-lg p-4 border border-gray-700 bg-black text-center">
          <p className="text-sm text-gray-400 mb-1">⏸ No Clear Setup</p>
          <p className="text-xs text-gray-600">
            {signal.reason ? String(signal.reason) : 'Wait for better confluence.'}
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && !signal && (
        <div className="text-center py-6">
          <Loader2 className="w-5 h-5 text-yellow animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Fetching live data & running SMC analysis…</p>
        </div>
      )}

      {/* Idle */}
      {!loading && !signal && !error && (
        <p className="text-xs text-gray-600 text-center py-3">
          Click a pair above to generate a live SMC signal
        </p>
      )}
    </div>
  );
}

function formatNum(val) {
  if (val == null || isNaN(Number(val))) return '—';
  const n = Number(val);
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)    return n.toFixed(4);
  return n.toFixed(6);
}