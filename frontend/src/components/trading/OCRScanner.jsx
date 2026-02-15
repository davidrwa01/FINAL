import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, Image, AlertCircle, Check, ChevronDown } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getDecimals } from '../../utils/trading/indicators-complete';
import { analyzeChartImage } from '../../utils/trading/chartVisionAnalyzer';

// ─── AVAILABLE SYMBOLS ──────────────────────────────────────
const SYMBOL_OPTIONS = [
  { group: 'Forex', pairs: [
    { value: 'EURUSD', label: 'EUR/USD' },
    { value: 'GBPUSD', label: 'GBP/USD' },
    { value: 'USDJPY', label: 'USD/JPY' },
    { value: 'USDCHF', label: 'USD/CHF' },
    { value: 'AUDUSD', label: 'AUD/USD' },
    { value: 'NZDUSD', label: 'NZD/USD' },
    { value: 'USDCAD', label: 'USD/CAD' },
    { value: 'EURGBP', label: 'EUR/GBP' },
    { value: 'EURJPY', label: 'EUR/JPY' },
    { value: 'GBPJPY', label: 'GBP/JPY' }
  ]},
  { group: 'Crypto', pairs: [
    { value: 'BTCUSDT', label: 'BTC/USDT' },
    { value: 'ETHUSDT', label: 'ETH/USDT' },
    { value: 'BNBUSDT', label: 'BNB/USDT' },
    { value: 'SOLUSDT', label: 'SOL/USDT' },
    { value: 'XRPUSDT', label: 'XRP/USDT' }
  ]},
  { group: 'Metals', pairs: [
    { value: 'XAUUSD', label: 'XAU/USD (Gold)' },
    { value: 'XAGUSD', label: 'XAG/USD (Silver)' }
  ]}
];

const TIMEFRAMES = [
  { value: 'M5', label: '5 Min' },
  { value: 'M15', label: '15 Min' },
  { value: 'M30', label: '30 Min' },
  { value: 'H1', label: '1 Hour' },
  { value: 'H4', label: '4 Hour' },
  { value: 'D1', label: 'Daily' }
];

const TF_TO_INTERVAL = {
  M5: '5m', M15: '15m', M30: '30m',
  H1: '1h', H4: '4h', D1: '1d'
};

/**
 * OCR Scanner with proper SMC Vision Architecture:
 * 
 * 1. Image → Canvas pixel analysis (structure ONLY, no price guessing)
 * 2. OCR → Attempts to detect symbol/timeframe text (optional)
 * 3. User CONFIRMS or SELECTS symbol + timeframe
 * 4. Backend fetches REAL market data
 * 5. SMC engine runs on REAL data
 * 6. Vision hints MERGED with real analysis
 * 7. Signal generated from REAL data only
 */
export default function OCRScanner({ onSignalGeneration }) {
  const [loading, setLoading]               = useState(false);
  const [stage, setStage]                   = useState('upload'); // upload | confirm | analyzing | result
  const [preview, setPreview]               = useState(null);
  const [visionResult, setVisionResult]     = useState(null);
  const [ocrDetected, setOcrDetected]       = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedTF, setSelectedTF]         = useState('H1');
  const [signal, setSignal]                 = useState(null);
  const [error, setError]                   = useState(null);
  const [progress, setProgress]             = useState('');
  const fileInputRef                        = useRef(null);

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Handle file upload → Run vision + OCR
  // ═══════════════════════════════════════════════════════════
  const handleFileSelect = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG)');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Image too large (max 15MB)');
      return;
    }

    // Reset state
    setError(null);
    setSignal(null);
    setVisionResult(null);
    setOcrDetected(null);
    setLoading(true);
    setStage('upload');

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    try {
      // ── Vision Analysis (pixel-based structure detection) ──
      setProgress('Analyzing chart structure...');
      const vision = await analyzeChartImage(file);
      setVisionResult(vision);
      console.log('[Vision] Structure analysis:', vision);

      // ── OCR (attempt to detect symbol/timeframe from text) ──
      setProgress('Reading chart text...');
      let detectedSymbol = null;
      let detectedTF = 'H1';

      try {
        const { data } = await Tesseract.recognize(file, 'eng', {
          logger: (info) => {
            if (info.status === 'recognizing text') {
              setProgress(`Reading text... ${Math.round(info.progress * 100)}%`);
            }
          }
        });

        const parsed = parseChartText(data.text);
        detectedSymbol = parsed.symbol;
        detectedTF = parsed.timeframe;
        setOcrDetected(parsed);
        console.log('[OCR] Detected:', parsed);
      } catch (ocrErr) {
        console.warn('[OCR] Failed:', ocrErr.message);
      }

      // Pre-fill selectors if OCR found something
      if (detectedSymbol) setSelectedSymbol(detectedSymbol);
      if (detectedTF) setSelectedTF(detectedTF);

      // Move to confirmation stage
      setStage('confirm');

    } catch (err) {
      console.error('[Vision] Failed:', err);
      setError('Image analysis failed: ' + err.message);
      setStage('upload');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // STEP 2: User confirms symbol → Run real analysis
  // ═══════════════════════════════════════════════════════════
  const handleConfirmAndAnalyze = async () => {
    if (!selectedSymbol) {
      setError('Please select a trading pair');
      return;
    }

    // Permission gate
    if (onSignalGeneration) {
      const allowed = await onSignalGeneration({
        symbol: selectedSymbol,
        timeframe: selectedTF,
        signalType: 'OCR_ANALYSIS'
      });
      if (!allowed) return;
    }

    setLoading(true);
    setError(null);
    setSignal(null);
    setStage('analyzing');

    try {
      // ── Fetch REAL data + Run SMC analysis via backend ──
      setProgress('Fetching real market data...');
      const interval = TF_TO_INTERVAL[selectedTF] || '1h';

      const res = await fetch(`/api/analysis/analyze/${selectedSymbol}/${interval}?limit=120`);
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);

      const result = await res.json();
      if (!result.success || !result.data) {
        throw new Error(result.message || 'No analysis data');
      }

      setProgress('Merging vision with real data...');
      const d = result.data;
      const sig = d.signal;

      if (!sig) throw new Error('No signal generated');

      // ── Merge vision analysis with real data signal ──
      const mergedSignal = mergeVisionWithReal(visionResult, sig, d);

      console.log('[Merged] Final signal:', mergedSignal);
      setSignal(mergedSignal);
      setStage('result');

    } catch (err) {
      console.error('[Analysis] Failed:', err);
      setError('Analysis failed: ' + err.message);
      setStage('confirm');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // MERGE: Vision structure hints + Real data signal
  // ═══════════════════════════════════════════════════════════
  function mergeVisionWithReal(vision, realSignal, fullData) {
    let direction = realSignal.direction || 'WAIT';
    let confidence = realSignal.confidence || fullData.confluence?.confidence || 0;
    let reason = String(realSignal.reason || '');

    // Boost/reduce confidence based on vision agreement
    if (vision && vision.success) {
      const visionBias = vision.trend_bias;
      const realBias = direction === 'BUY' ? 'bullish' : direction === 'SELL' ? 'bearish' : 'unclear';

      if (visionBias === realBias) {
        // Vision agrees with real data — boost confidence
        confidence = Math.min(95, confidence + 10);
        reason += ' | Visual structure confirms';
      } else if (visionBias !== 'unclear' && visionBias !== 'ranging' && realBias !== 'unclear') {
        // Vision disagrees — reduce confidence
        confidence = Math.max(20, confidence - 10);
        reason += ` | ⚠️ Visual structure suggests ${visionBias}`;
      }

      // Add SMC visual elements to reason
      const elements = [];
      if (vision.structure.bos) elements.push('BOS');
      if (vision.structure.choch) elements.push('CHoCH');
      if (vision.order_block.bullish_order_block_visible) elements.push('Bullish OB');
      if (vision.order_block.bearish_order_block_visible) elements.push('Bearish OB');
      if (vision.fvg.fvg_visible) elements.push('FVG');
      if (vision.liquidity.equal_highs_visible) elements.push('Equal Highs');
      if (vision.liquidity.equal_lows_visible) elements.push('Equal Lows');

      if (elements.length > 0) {
        reason += ` | Visual: ${elements.join(', ')}`;
      }

      // If vision says CHoCH and real says WAIT, give a warning signal
      if (vision.structure.choch && direction === 'WAIT') {
        reason += ' | CHoCH detected visually — watch for reversal';
      }
    }

    return {
      direction,
      confidence,
      entry:     realSignal.entry || fullData.currentPrice || 0,
      sl:        realSignal.stopLoss || 0,
      tp1:       realSignal.tp1 || 0,
      tp2:       realSignal.tp2 || 0,
      tp3:       realSignal.tp3 || 0,
      rr:        String(realSignal.rr || '0.00'),
      reason,
      symbol:    selectedSymbol,
      timeframe: selectedTF,
      analysis: {
        currentPrice: fullData.currentPrice || realSignal.entry || 0,
        rsi:   fullData.indicators?.rsi != null ? Math.round(fullData.indicators.rsi) : null,
        ema20: fullData.indicators?.ema20 || null,
        ema50: fullData.indicators?.ema50 || null,
        support:    fullData.supportResistance?.support || null,
        resistance: fullData.supportResistance?.resistance || null
      },
      smc:        fullData.smc || null,
      confluence: fullData.confluence || null,
      vision:     vision || null,
      dataSource: fullData.dataSource || 'REAL',
      timestamp:  new Date().toLocaleTimeString()
    };
  }

  // ═══════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════
  const handleReset = () => {
    setStage('upload');
    setSignal(null);
    setError(null);
    setPreview(null);
    setVisionResult(null);
    setOcrDetected(null);
    setSelectedSymbol('');
    setSelectedTF('H1');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-wider text-white uppercase">
          SMC Chart Analysis
        </h2>
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-gray-500" />
          {stage !== 'upload' && (
            <button onClick={handleReset} className="text-xs text-gray-500 hover:text-yellow transition underline">
              New Analysis
            </button>
          )}
        </div>
      </div>

      {/* ── STAGE: UPLOAD ── */}
      {stage === 'upload' && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
            loading ? 'border-yellow/50 bg-yellow/5' : 'border-gray-800 bg-black hover:border-yellow/50'
          }`}
          onClick={() => !loading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={e => handleFileSelect(e.target.files?.[0])}
            className="hidden"
          />

          {loading ? (
            <div className="flex flex-col items-center py-4">
              <div className="spinner mb-3"></div>
              <p className="text-sm text-gray-400">{progress || 'Processing image...'}</p>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-white font-mono mb-1">Upload Trading Chart</p>
              <p className="text-xs text-gray-500 mb-3">
                AI will analyze structure visually, then validate with real market data
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-600">
                <span className="px-2 py-0.5 bg-gray-900 rounded">TradingView</span>
                <span className="px-2 py-0.5 bg-gray-900 rounded">MT4/MT5</span>
                <span className="px-2 py-0.5 bg-gray-900 rounded">Bloomberg</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STAGE: CONFIRM SYMBOL ── */}
      {stage === 'confirm' && (
        <div className="space-y-4">
          {/* Preview */}
          {preview && (
            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <img src={preview} alt="Chart" className="w-full max-h-40 object-contain bg-black" />
            </div>
          )}

          {/* Vision Results Summary */}
          {visionResult && visionResult.success && (
            <VisionSummary vision={visionResult} />
          )}

          {/* OCR Detection */}
          {ocrDetected?.symbol && (
            <div className="p-2 bg-green-900/20 border border-green-700/50 rounded flex items-center justify-between text-xs">
              <span className="text-green-400">
                ✓ Detected from chart: <span className="font-mono font-bold">{ocrDetected.symbol}</span>
                {ocrDetected.timeframe && <span className="text-gray-500 ml-2">{ocrDetected.timeframe}</span>}
              </span>
            </div>
          )}

          {/* Symbol Selection (REQUIRED — never guessed) */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
              Confirm Trading Pair *
            </label>
            <select
              value={selectedSymbol}
              onChange={e => setSelectedSymbol(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-800 text-white text-sm rounded font-mono focus:border-yellow outline-none"
            >
              <option value="">-- Select Pair --</option>
              {SYMBOL_OPTIONS.map(group => (
                <optgroup key={group.group} label={group.group}>
                  {group.pairs.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Timeframe Selection */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
              Timeframe *
            </label>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setSelectedTF(tf.value)}
                  className={`px-3 py-1.5 text-xs font-mono rounded border transition ${
                    selectedTF === tf.value
                      ? 'bg-yellow text-black border-yellow'
                      : 'border-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleConfirmAndAnalyze}
            disabled={!selectedSymbol || loading}
            className="w-full py-3 bg-yellow text-black text-sm font-bold rounded hover:bg-yellow/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : `Analyze ${selectedSymbol || 'Pair'} with Real Data`}
          </button>

          <p className="text-xs text-gray-600 text-center">
            Signal will be generated from real market data, not from the image
          </p>
        </div>
      )}

      {/* ── STAGE: ANALYZING ── */}
      {stage === 'analyzing' && (
        <div className="text-center py-8">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-sm text-white mb-1">{progress || 'Running SMC analysis...'}</p>
          <p className="text-xs text-gray-500">
            Fetching real {selectedSymbol} data and running analysis
          </p>
        </div>
      )}

      {/* ── STAGE: RESULT ── */}
      {stage === 'result' && signal && (
        <div className="space-y-4">
          {/* Data source badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green" />
              <span className="text-xs text-green">Signal from REAL market data</span>
            </div>
            <span className="text-xs text-gray-600">
              Source: {String(signal.dataSource || 'API')}
            </span>
          </div>

          {/* Vision summary */}
          {visionResult && visionResult.success && (
            <VisionSummary vision={visionResult} compact />
          )}

          {/* Signal card */}
          <SignalCard signal={signal} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300">{String(error)}</p>
            <button onClick={handleReset} className="text-xs text-red-400 hover:text-red-300 underline mt-1">
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VISION SUMMARY — Shows what was detected from the image
// ═══════════════════════════════════════════════════════════
function VisionSummary({ vision, compact = false }) {
  if (!vision || !vision.success) return null;

  const badges = [];

  // Structure
  if (vision.structure.bos) badges.push({ label: 'BOS', color: 'bg-green-900/30 text-green-400' });
  if (vision.structure.choch) badges.push({ label: 'CHoCH', color: 'bg-yellow-900/30 text-yellow-400' });
  if (vision.structure.higher_high) badges.push({ label: 'HH', color: 'bg-green-900/20 text-green-500' });
  if (vision.structure.higher_low) badges.push({ label: 'HL', color: 'bg-green-900/20 text-green-500' });
  if (vision.structure.lower_high) badges.push({ label: 'LH', color: 'bg-red-900/20 text-red-500' });
  if (vision.structure.lower_low) badges.push({ label: 'LL', color: 'bg-red-900/20 text-red-500' });

  // Order blocks
  if (vision.order_block.bullish_order_block_visible) badges.push({ label: 'Bullish OB', color: 'bg-green-900/20 text-green-400' });
  if (vision.order_block.bearish_order_block_visible) badges.push({ label: 'Bearish OB', color: 'bg-red-900/20 text-red-400' });

  // FVG
  if (vision.fvg.fvg_visible) badges.push({ label: 'FVG', color: 'bg-purple-900/20 text-purple-400' });

  // Liquidity
  if (vision.liquidity.equal_highs_visible) badges.push({ label: 'Equal Highs', color: 'bg-orange-900/20 text-orange-400' });
  if (vision.liquidity.equal_lows_visible) badges.push({ label: 'Equal Lows', color: 'bg-orange-900/20 text-orange-400' });

  const biasColor = vision.trend_bias === 'bullish' ? 'text-green'
    : vision.trend_bias === 'bearish' ? 'text-red'
    : 'text-gray-400';

  return (
    <div className={`p-3 bg-gray-900/50 border border-gray-800 rounded-lg ${compact ? 'text-xs' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Visual Structure</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${biasColor}`}>
            {String(vision.trend_bias).toUpperCase()}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            vision.confidence === 'high' ? 'bg-green-900/30 text-green-400' :
            vision.confidence === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
            'bg-gray-800 text-gray-500'
          }`}>
            {String(vision.confidence)}
          </span>
        </div>
      </div>

      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b, i) => (
            <span key={i} className={`px-2 py-0.5 rounded text-xs font-semibold ${b.color}`}>
              {b.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-600">No clear SMC patterns detected visually</p>
      )}

      {!compact && vision.raw && (
        <div className="mt-2 pt-2 border-t border-gray-800 grid grid-cols-2 gap-2 text-xs text-gray-500">
          <span>Bullish candles: {vision.raw.bullishCandles || 0}%</span>
          <span>Bearish candles: {vision.raw.bearishCandles || 0}%</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIGNAL CARD
// ═══════════════════════════════════════════════════════════
function SignalCard({ signal }) {
  const isBuy = signal.direction === 'BUY';
  const isSell = signal.direction === 'SELL';
  const isWait = signal.direction === 'WAIT';

  if (isWait) {
    return (
      <div className="rounded-lg p-4 border border-gray-700 bg-black text-center">
        <p className="text-sm text-gray-400 mb-1">⏸ No Clear Setup</p>
        <p className="text-xs text-gray-600">
          {signal.reason ? String(signal.reason) : 'Low confluence — wait for better entry'}
        </p>
      </div>
    );
  }

  const dec = getDecimals(signal.entry);
  const fmt = (v) => (v != null && !isNaN(Number(v))) ? Number(v).toFixed(dec) : '—';

  return (
    <div className={`rounded-xl p-5 border-l-4 ${
      isBuy ? 'border-green bg-green/5' : 'border-red bg-red/5'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          {isBuy ? <TrendingUp className="w-5 h-5 text-green" /> : <TrendingDown className="w-5 h-5 text-red" />}
          <div>
            <span className={`text-lg font-bold font-mono ${isBuy ? 'text-green' : 'text-red'}`}>
              {String(signal.direction)}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {String(signal.symbol)} · {String(signal.timeframe)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow font-mono">{Number(signal.confidence)}%</div>
          <div className="text-xs text-gray-500">Confidence</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <LevelBox label="Entry" value={fmt(signal.entry)} color="text-white" />
        <LevelBox label="Stop Loss" value={fmt(signal.sl)} color="text-red" />
        <LevelBox label="Take Profit 1" value={fmt(signal.tp1)} color="text-green" />
        <LevelBox label="Risk:Reward" value={`1:${String(signal.rr)}`} color="text-yellow" />
      </div>

      {signal.reason && (
        <div className="border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-400">{String(signal.reason)}</p>
        </div>
      )}

      {signal.timestamp && (
        <p className="text-xs text-gray-600 mt-2">Generated: {String(signal.timestamp)}</p>
      )}
    </div>
  );
}

function LevelBox({ label, value, color }) {
  return (
    <div className="bg-black rounded-lg p-3 border border-gray-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OCR TEXT PARSER (symbol/timeframe detection from text)
// ═══════════════════════════════════════════════════════════
function parseChartText(rawText) {
  const text = (rawText || '').toUpperCase();

  let symbol = null;
  let timeframe = null;

  // Direct pair matches
  const pairs = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
    'EURGBP', 'EURJPY', 'GBPJPY', 'EURAUD', 'EURCHF',
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT',
    'XAUUSD', 'XAGUSD'
  ];

  for (const p of pairs) {
    if (text.includes(p)) { symbol = p; break; }
  }

  // Slash pairs
  if (!symbol) {
    const m = text.match(/([A-Z]{3,5})\s*[\/\-]\s*([A-Z]{3,5})/);
    if (m) {
      const candidate = m[1] + m[2];
      if (pairs.includes(candidate)) symbol = candidate;
    }
  }

  // Keywords
  if (!symbol) {
    if (/\bGOLD\b/.test(text)) symbol = 'XAUUSD';
    else if (/\bSILVER\b/.test(text)) symbol = 'XAGUSD';
    else if (/\bBITCOIN\b/.test(text) || /\bBTC\b/.test(text)) symbol = 'BTCUSDT';
    else if (/\bETHEREUM\b/.test(text) || /\bETH\b/.test(text)) symbol = 'ETHUSDT';
  }

  // Timeframes
  const tfPatterns = {
    'M1': /\bM1\b|\b1\s*MIN/,    'M5': /\bM5\b|\b5\s*MIN/,
    'M15': /\bM15\b|\b15\s*MIN/, 'M30': /\bM30\b|\b30\s*MIN/,
    'H1': /\bH1\b|\b1\s*H/,      'H4': /\bH4\b|\b4\s*H/,
    'D1': /\bD1\b|\bDAILY\b|\b1\s*D/, 'W1': /\bW1\b|\bWEEKLY\b/
  };

  for (const [tf, pattern] of Object.entries(tfPatterns)) {
    if (pattern.test(text)) { timeframe = tf; break; }
  }

  return { symbol, timeframe: timeframe || 'H1' };
}