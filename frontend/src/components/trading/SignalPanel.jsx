import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, AlertCircle, X, Copy, Check
} from 'lucide-react';
import { formatPrice, getDecimals } from '../../utils/trading/indicators-complete.js';

/**
 * Normalize signal data — handles BOTH shapes:
 * 
 * FLAT (from fullSignalPipeline):
 *   { direction, confidence, entry, sl, tp1, tp2, tp3, rr, reason, symbol, timeframe, analysis }
 * 
 * NESTED (from getFullAnalysis / MarketWatch):
 *   { signal: { direction, confidence, entry, stopLoss, tp1, tp2, tp3, rr, reason }, 
 *     confluence: { confidence }, indicators: { rsi, ema20 }, smc: {...}, symbol, timeframe }
 */
function normalizeSignal(raw) {
  if (!raw) return null;

  // ── NESTED shape: raw.signal is an object with direction ──
  if (raw.signal && typeof raw.signal === 'object' && raw.signal.direction) {
    const s = raw.signal;
    return {
      direction:  s.direction || 'WAIT',
      confidence: s.confidence || raw.confluence?.confidence || 0,
      entry:      s.entry || raw.currentPrice || 0,
      sl:         s.stopLoss || s.sl || 0,
      tp1:        s.tp1 || 0,
      tp2:        s.tp2 || 0,
      tp3:        s.tp3 || 0,
      rr:         String(s.rr || '0.00'),
      reason:     typeof s.reason === 'string' ? s.reason : '',
      symbol:     raw.symbol || '',
      timeframe:  raw.timeframe || '',
      analysis: {
        currentPrice: raw.currentPrice || raw.indicators?.currentPrice || s.entry || 0,
        rsi:   raw.indicators?.rsi != null ? Math.round(raw.indicators.rsi) : null,
        ema20: raw.indicators?.ema20 || null,
        ema50: raw.indicators?.ema50 || null,
        support:    raw.supportResistance?.support || raw.indicators?.support || null,
        resistance: raw.supportResistance?.resistance || raw.indicators?.resistance || null
      },
      smc:        raw.smc || null,
      confluence: raw.confluence || null,
      timestamp:  raw.timestamp || new Date().toLocaleTimeString()
    };
  }

  // ── FLAT shape: direction is directly on the object ──
  return {
    direction:  raw.direction || 'WAIT',
    confidence: raw.confidence || 0,
    entry:      raw.entry || 0,
    sl:         raw.sl || raw.stopLoss || 0,
    tp1:        raw.tp1 || 0,
    tp2:        raw.tp2 || 0,
    tp3:        raw.tp3 || 0,
    rr:         String(raw.rr || '0.00'),
    reason:     typeof raw.reason === 'string' ? raw.reason : '',
    symbol:     raw.symbol || '',
    timeframe:  raw.timeframe || '',
    analysis:   raw.analysis || null,
    smc:        raw.smc || null,
    confluence: raw.confluence || null,
    timestamp:  raw.timestamp || new Date().toLocaleTimeString()
  };
}

/**
 * SignalPanel — full-screen modal showing a generated trade signal.
 */
export default function SignalPanel({ signal: rawSignal, symbol, onClose }) {
  const [copied, setCopied] = useState(null);

  // Normalize whatever shape we received
  const signal = normalizeSignal(rawSignal);

  // ── ERROR / EMPTY STATE ─────────────────────────────────
  if (!signal || rawSignal?.error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Signal Error</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-300">{rawSignal?.error || 'Failed to generate signal'}</p>
          <button
            onClick={onClose}
            className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // ── DERIVE DISPLAY VALUES ───────────────────────────────
  const direction = signal.direction;
  const isBuy     = direction === 'BUY';
  const isSell    = direction === 'SELL';

  const dec = getDecimals(signal.entry);
  const fmt = (v) => (v != null && !isNaN(Number(v))) ? Number(v).toFixed(dec) : '—';

  const rrDisplay = signal.rr && signal.rr !== '0.00' ? signal.rr : '—';

  // Colours
  const borderColor = isBuy ? 'border-green-500' : isSell ? 'border-red-500'  : 'border-gray-500';
  const bgColor     = isBuy ? 'bg-green-500/10'  : isSell ? 'bg-red-500/10'   : 'bg-gray-500/10';
  const textColor   = isBuy ? 'text-green-400'   : isSell ? 'text-red-400'    : 'text-gray-400';

  // Copy helper
  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(String(text));
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ value, field, color = 'text-gray-400' }) => (
    <button
      onClick={() => handleCopy(value, field)}
      className={`${color} hover:text-white transition-colors`}
    >
      {copied === field ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );

  // Safe analysis values
  const currentPrice = signal.analysis?.currentPrice ?? signal.entry;
  const rsiValue     = signal.analysis?.rsi;
  const ema20Value   = signal.analysis?.ema20;
  const ema50Value   = signal.analysis?.ema50;

  // SMC summary (safely extract strings, never render objects)
  const smcBias      = signal.smc?.marketBias || null;
  const smcStructure = signal.smc?.structure || null;
  const obCount      = signal.smc?.summary?.activeOrderBlocks ?? signal.smc?.activeOrderBlocks?.length ?? null;
  const fvgCount     = signal.smc?.summary?.activeFVGs ?? signal.smc?.activeFVGs?.length ?? null;

  // Confluence
  const confluenceScore = signal.confluence?.confidence ?? signal.confidence;

  // ── RENDER ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-900 border-2 ${borderColor} ${bgColor} rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {isBuy  && <TrendingUp   className="w-8 h-8 text-green-400" />}
            {isSell && <TrendingDown className="w-8 h-8 text-red-400"   />}
            {!isBuy && !isSell && <AlertCircle className="w-8 h-8 text-gray-400" />}
            <div>
              <h2 className={`text-2xl font-bold ${textColor}`}>
                {String(direction)} SIGNAL
              </h2>
              <p className="text-gray-400 text-sm">
                {String(signal.symbol || symbol || '—')} &bull; {String(signal.timeframe || '—')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Confidence">
            <span className="text-2xl font-bold text-white">{Number(confluenceScore) || 0}%</span>
          </StatCard>
          <StatCard label="Current Price">
            <span className="text-xl font-bold text-white font-mono">
              {fmt(currentPrice)}
            </span>
          </StatCard>
          <StatCard label="RSI">
            <span className="text-2xl font-bold text-white">
              {rsiValue != null ? Math.round(Number(rsiValue)) : '—'}
            </span>
          </StatCard>
          <StatCard label="Risk : Reward">
            <span className="text-2xl font-bold text-yellow-400">
              {rrDisplay !== '—' ? `1:${rrDisplay}` : '—'}
            </span>
          </StatCard>
        </div>

        {/* SMC Summary (if available) */}
        {(smcBias || smcStructure) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {smcBias && (
              <StatCard label="Market Bias">
                <span className={`text-lg font-bold ${
                  smcBias.includes('BULLISH') ? 'text-green-400' :
                  smcBias.includes('BEARISH') ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {String(smcBias)}
                </span>
              </StatCard>
            )}
            {smcStructure && (
              <StatCard label="Structure">
                <span className="text-lg font-bold text-white">{String(smcStructure)}</span>
              </StatCard>
            )}
            {obCount != null && (
              <StatCard label="Order Blocks">
                <span className="text-lg font-bold text-yellow-400">{Number(obCount)}</span>
              </StatCard>
            )}
            {fvgCount != null && (
              <StatCard label="FVGs">
                <span className="text-lg font-bold text-yellow-400">{Number(fvgCount)}</span>
              </StatCard>
            )}
          </div>
        )}

        {/* Trade Levels */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-white mb-4">Trade Levels</h3>
          <div className="space-y-3">
            <LevelRow label="Entry" value={fmt(signal.entry)} labelColor="text-gray-300" valueColor="text-white">
              <CopyBtn value={signal.entry} field="entry" />
            </LevelRow>

            <LevelRow label="Stop Loss" value={fmt(signal.sl)} labelColor="text-red-300" valueColor="text-red-400"
              bg="bg-red-900/20 border border-red-700/50">
              <CopyBtn value={signal.sl} field="sl" color="text-red-400" />
            </LevelRow>

            <LevelRow label="Take Profit 1" value={fmt(signal.tp1)} labelColor="text-green-300" valueColor="text-green-400"
              bg="bg-green-900/20 border border-green-700/50">
              <CopyBtn value={signal.tp1} field="tp1" color="text-green-400" />
            </LevelRow>

            {signal.tp2 != null && signal.tp2 !== 0 && signal.tp2 !== signal.tp1 && (
              <LevelRow label="Take Profit 2" value={fmt(signal.tp2)} labelColor="text-green-300" valueColor="text-green-400"
                bg="bg-green-900/20 border border-green-700/50">
                <CopyBtn value={signal.tp2} field="tp2" color="text-green-400" />
              </LevelRow>
            )}

            {signal.tp3 != null && signal.tp3 !== 0 && signal.tp3 !== signal.tp2 && (
              <LevelRow label="Take Profit 3" value={fmt(signal.tp3)} labelColor="text-green-300" valueColor="text-green-400"
                bg="bg-green-900/20 border border-green-700/50">
                <CopyBtn value={signal.tp3} field="tp3" color="text-green-400" />
              </LevelRow>
            )}
          </div>
        </div>

        {/* Analysis Details */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-white mb-3">Analysis Details</h3>

          {signal.reason && (
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {String(signal.reason)}
            </p>
          )}

          {/* Confluence Breakdown */}
          {signal.confluence?.breakdown && Array.isArray(signal.confluence.breakdown) && (
            <div className="mb-4">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Confluence Factors</p>
              <div className="space-y-1">
                {signal.confluence.breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className={`${
                      String(item.direction || '').includes('BULLISH') ? 'text-green-400' :
                      String(item.direction || '').includes('BEARISH') ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {String(item.factor || '')}
                    </span>
                    <span className="text-gray-500">{String(item.detail || '')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">EMA 20</p>
              <p className="text-white font-mono">
                {ema20Value != null ? fmt(ema20Value) : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-400">EMA 50</p>
              <p className="text-white font-mono">
                {ema50Value != null ? fmt(ema50Value) : '—'}
              </p>
            </div>
            {signal.analysis?.support != null && (
              <div>
                <p className="text-gray-400">Support</p>
                <p className="text-green-400 font-mono">{fmt(signal.analysis.support)}</p>
              </div>
            )}
            {signal.analysis?.resistance != null && (
              <div>
                <p className="text-gray-400">Resistance</p>
                <p className="text-red-400 font-mono">{fmt(signal.analysis.resistance)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        {signal.timestamp && (
          <div className="text-xs text-gray-500 text-center mb-4">
            Generated: {String(signal.timestamp)}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
          {direction !== 'WAIT' && (
            <button
              className={`flex-1 ${
                isBuy  ? 'bg-green-600 hover:bg-green-700' :
                isSell ? 'bg-red-600   hover:bg-red-700'   :
                         'bg-gray-600  hover:bg-gray-700'
              } text-white px-4 py-3 rounded-lg font-medium transition-colors`}
            >
              Place Order ({String(direction)})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ──────────────────────────────────────────

function StatCard({ label, children }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <p className="text-gray-400 text-xs uppercase tracking-wider">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function LevelRow({ label, value, labelColor, valueColor, bg, children }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${bg || 'bg-gray-900/50'}`}>
      <span className={labelColor}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-mono font-bold ${valueColor}`}>{value}</span>
        {children}
      </div>
    </div>
  );
}