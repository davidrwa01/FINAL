import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Upload } from 'lucide-react';
import { formatPrice, getDecimals } from '../../utils/trading/indicators-complete';

/**
 * OCRScanner  –  drop-in component for the Chart Screenshot Analysis panel.
 *
 * Flow:
 *   1. User uploads a chart screenshot.
 *   2. Tesseract extracts text → we parse symbol + timeframe.
 *   3. We hit the same backend pipeline every other path uses:
 *        GET  /api/signals/klines/:symbol/:interval/:limit   → kline array
 *        POST /api/analysis/analyze-smc                      → SMC structure
 *        POST /api/analysis/generate-signal                  → trade signal
 *   4. We attach analysis sub-object + timestamp (same shape as fullSignalPipeline)
 *      and render a SignalDisplay card.
 *
 * Props:
 *   onSignalGeneration({ symbol, timeframe, signalType }) → Promise<boolean>
 *     Gate function called BEFORE processing.  Return false to block (e.g. trial limit hit).
 */

// ─── TIMEFRAME → Binance interval string ────────────────────
const TF_TO_INTERVAL = {
  M1: '1m', M5: '5m', M15: '15m', M30: '30m',
  H1: '1h', H4: '4h', D1: '1d', W1: '1w'
};

export default function OCRScanner({ onSignalGeneration }) {
  const [loading, setLoading]   = useState(false);
  const [signal, setSignal]     = useState(null);
  const [error,  setError]      = useState(null);
  const fileInputRef            = useRef(null);

  // ── MAIN HANDLER ──────────────────────────────────────────
  const handleFileSelect = async (file) => {
    if (!file) return;

    // 1. Permission gate
    const allowed = await onSignalGeneration({
      symbol: 'OCR_SCAN',
      timeframe: 'AUTO',
      signalType: 'OCR_ANALYSIS'
    });
    if (!allowed) return;

    setLoading(true);
    setSignal(null);
    setError(null);

    try {
      // 2. OCR
      const { data } = await Tesseract.recognize(file, 'eng');
      console.log('[OCRScanner] extracted text:', data.text);

      // 3. Parse symbol + timeframe
      const { symbol, timeframe } = parseOCRText(data.text);
      console.log('[OCRScanner] detected →', { symbol, timeframe });

      if (!symbol) {
        setError('Could not detect a trading pair in the screenshot. Try a clearer image.');
        return;
      }

      // 4. Fetch klines from backend
      const interval = TF_TO_INTERVAL[timeframe] || '1h';
      const klinesRes = await fetch(`/api/signals/klines/${symbol}/${interval}/120`);
      if (!klinesRes.ok) throw new Error(`Klines fetch failed: ${klinesRes.status}`);
      const klinesData = await klinesRes.json();
      const klines = klinesData.data || klinesData;   // handle both { data: [...] } and bare array

      if (!Array.isArray(klines) || klines.length < 5) {
        setError('Not enough market data returned for ' + symbol);
        return;
      }

      // 5. SMC analysis
      const smcRes = await fetch('/api/analysis/analyze-smc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klines })
      });
      if (!smcRes.ok) throw new Error('SMC analysis failed');
      const smcData  = await smcRes.json();
      const analysis = smcData.data || smcData;

      // 6. Generate signal
      const currentPrice = klines[klines.length - 1].close;
      const sigRes = await fetch('/api/analysis/generate-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, currentPrice, symbol, timeframe })
      });
      if (!sigRes.ok) throw new Error('Signal generation failed');
      const sigData  = await sigRes.json();
      const backend  = sigData.data || sigData;

      // 7. Normalise to unified internal shape (same as fullSignalPipeline)
      setSignal({
        direction:  backend.signal || 'WAIT',
        confidence: backend.confidence || 50,
        entry:      backend.entry || currentPrice,
        sl:         backend.sl != null ? backend.sl : 0,
        tp1:        backend.tp1 != null ? backend.tp1 : 0,
        tp2:        backend.tp2 != null ? backend.tp2 : 0,
        tp3:        backend.tp3 != null ? backend.tp3 : 0,
        rr:         String(backend.rr || '0.00'),
        reason:     backend.reason || 'OCR chart analysis via SMC',
        symbol,
        timeframe,
        analysis: {
          currentPrice: analysis.currentPrice || currentPrice,
          rsi:          analysis.rsi != null ? Math.round(analysis.rsi) : 50,
          ema20:        analysis.ema20 != null ? analysis.ema20 : 0,
          ema50:        analysis.ema50 != null ? analysis.ema50 : 0
        },
        timestamp: new Date().toLocaleTimeString()
      });

    } catch (err) {
      console.error('[OCRScanner] pipeline failed:', err);
      setError('Failed to process screenshot: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-wider text-white uppercase">Chart Analysis (OCR)</h2>
        <Upload className="w-4 h-4 text-gray-500" />
      </div>

      {/* Drop zone */}
      <div
        className="border border-gray-800 bg-black rounded-lg p-8 text-center cursor-pointer hover:border-yellow/50 transition"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={e => handleFileSelect(e.target.files?.[0])}
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center">
            <div className="spinner mb-4"></div>
            <p className="text-sm text-gray-400">Extracting text &amp; analysing market structure…</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-white font-mono mb-1">Upload Chart Screenshot</p>
            <p className="text-xs text-gray-500">TradingView · MT4/MT5 · Bloomberg</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Signal card — only when we have a valid entry */}
      {signal && signal.entry != null && <OCRSignalDisplay signal={signal} />}
    </div>
  );
}

// ─── OCR TEXT PARSER ────────────────────────────────────────
function parseOCRText(text) {
  const upper = (text || '').toUpperCase();
  let symbol = null;
  let timeframe = 'H1'; // default

  // ── Symbol detection ──
  // Direct 6-char forex pairs
  const forexPattern = /\b(EURUSD|GBPUSD|USDJPY|USDCHF|AUDUSD|NZDUSD|USDCAD|EURGBP|EURJPY|GBPJPY|XAUUSD|XAGUSD)\b/;
  const forexMatch   = upper.match(forexPattern);
  if (forexMatch) {
    symbol = forexMatch[1];
  }

  // Slash-separated pairs  EUR/USD
  if (!symbol) {
    const slashPattern = /\b(EUR|GBP|USD|JPY|CHF|AUD|NZD|CAD|XAU|XAG)\s*[\/\-]\s*(EUR|GBP|USD|JPY|CHF|AUD|NZD|CAD)\b/;
    const slashMatch   = upper.match(slashPattern);
    if (slashMatch) {
      symbol = slashMatch[1] + slashMatch[2];
    }
  }

  // GOLD keyword
  if (!symbol && /\bGOLD\b/.test(upper)) {
    symbol = 'XAUUSD';
  }

  // Crypto pairs  BTC/USDT  or  BTCUSDT
  if (!symbol) {
    const cryptoPattern = /\b(BTC|ETH|BNB|SOL|ADA|XRP|DOGE|MATIC)\s*[\/\-]?\s*(USDT|BUSD|BTC)\b/;
    const cryptoMatch   = upper.match(cryptoPattern);
    if (cryptoMatch) {
      symbol = cryptoMatch[1] + cryptoMatch[2];
    }
  }

  // ── Timeframe detection ──
  const tfPattern = /\b(M1|M5|M15|M30|H1|H4|D1|W1|MN)\b/;
  const tfMatch   = upper.match(tfPattern);
  if (tfMatch) {
    timeframe = tfMatch[1];
  } else {
    // Loose patterns like "1H", "4H", "1D"
    const loosePattern = /\b(1|5|15|30)\s*M\b|\b(1|4)\s*H\b|\b1\s*D\b|\b1\s*W\b/;
    const looseMatch   = upper.match(loosePattern);
    if (looseMatch) {
      const raw = looseMatch[0].replace(/\s/g, '');
      if (raw.endsWith('M'))      timeframe = 'M' + raw.replace('M','');
      else if (raw.endsWith('H')) timeframe = 'H' + raw.replace('H','');
      else if (raw.endsWith('D')) timeframe = 'D1';
      else if (raw.endsWith('W')) timeframe = 'W1';
    }
  }

  return { symbol, timeframe };
}

// ─── INLINE SIGNAL CARD ─────────────────────────────────────
function OCRSignalDisplay({ signal }) {
  const isBuy  = signal.direction === 'BUY';
  const isSell = signal.direction === 'SELL';

  const dec = getDecimals(signal.entry);
  const fmt = (v) => (v != null && !isNaN(v)) ? Number(v).toFixed(dec) : '—';

  const dirColor = isBuy ? 'text-green' : isSell ? 'text-red' : 'text-gray-400';
  const borderClass = isBuy  ? 'border-green bg-green/5'
                    : isSell ? 'border-red bg-red/5'
                    : 'border-gray-600';

  return (
    <div className={`mt-6 rounded-xl p-6 border ${borderClass}`}>
      {/* Header row */}
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-2xl font-bold ${dirColor}`}>
          {signal.direction} SIGNAL
        </h3>
        <div className="text-3xl font-bold text-yellow">
          {signal.confidence || 0}%
        </div>
      </div>

      {/* Levels grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <LevelBox label="Entry Price"   value={fmt(signal.entry)}  color="text-yellow" />
        <LevelBox label="Stop Loss"     value={fmt(signal.sl)}     color="text-red"    />
        <LevelBox label="Take Profit 1" value={fmt(signal.tp1)}    color="text-green"  />
      </div>

      {/* TP2 / TP3 if distinct */}
      {signal.tp2 != null && signal.tp2 !== 0 && signal.tp2 !== signal.tp1 && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <LevelBox label="Take Profit 2" value={fmt(signal.tp2)} color="text-green" />
          {signal.tp3 != null && signal.tp3 !== 0 && signal.tp3 !== signal.tp2 && (
            <LevelBox label="Take Profit 3" value={fmt(signal.tp3)} color="text-green" />
          )}
        </div>
      )}

      {/* Footer details */}
      <div className="border-t border-gray-700 pt-4 text-sm text-gray-400 space-y-1">
        <p><span className="text-white">Source:</span> OCR Chart Analysis</p>
        {signal.reason && <p><span className="text-white">Reason:</span> {signal.reason}</p>}
        <p><span className="text-white">Risk / Reward:</span> 1:{signal.rr}</p>
        {signal.timestamp && <p><span className="text-white">Generated:</span> {signal.timestamp}</p>}
      </div>
    </div>
  );
}

function LevelBox({ label, value, color }) {
  return (
    <div className="bg-black rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}