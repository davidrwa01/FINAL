import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, AlertCircle, X, Copy, Check
} from 'lucide-react';

export default function SignalPanel({ signal, symbol, onClose }) {
  const [copied, setCopied] = useState(null);

  if (!signal || signal.error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Signal Error</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-300">{signal?.error || 'Failed to generate signal'}</p>
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

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const signalColor =
    signal.signal === 'BUY'
      ? 'border-green-500'
      : signal.signal === 'SELL'
      ? 'border-red-500'
      : 'border-gray-500';

  const signalBgColor =
    signal.signal === 'BUY'
      ? 'bg-green-500/10'
      : signal.signal === 'SELL'
      ? 'bg-red-500/10'
      : 'bg-gray-500/10';

  const signalTextColor =
    signal.signal === 'BUY'
      ? 'text-green-400'
      : signal.signal === 'SELL'
      ? 'text-red-400'
      : 'text-gray-400';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-900 border-2 ${signalColor} ${signalBgColor} rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {signal.signal === 'BUY' && (
              <TrendingUp className="w-8 h-8 text-green-400" />
            )}
            {signal.signal === 'SELL' && (
              <TrendingDown className="w-8 h-8 text-red-400" />
            )}
            {signal.signal === 'WAIT' && (
              <AlertCircle className="w-8 h-8 text-gray-400" />
            )}
            <div>
              <h2 className={`text-2xl font-bold ${signalTextColor}`}>
                {signal.signal} SIGNAL
              </h2>
              <p className="text-gray-400 text-sm">
                {signal.symbol} • {signal.timeframe}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Confidence</p>
            <p className="text-2xl font-bold text-white mt-2">{signal.confidence}%</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Current Price</p>
            <p className="text-xl font-bold text-white mt-2">{signal.analysis?.currentPrice}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider">RSI</p>
            <p className="text-2xl font-bold text-white mt-2">{signal.analysis?.rsi}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Risk:Reward</p>
            <p className="text-2xl font-bold text-yellow-400 mt-2">{signal.riskReward}:1</p>
          </div>
        </div>

        {/* Trade Levels */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-white mb-4">Trade Levels</h3>
          <div className="space-y-3">
            {/* Entry */}
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-300">Entry</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">{signal.entry}</span>
                <button
                  onClick={() => handleCopy(signal.entry, 'entry')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {copied === 'entry' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Stop Loss */}
            <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
              <span className="text-red-300">Stop Loss</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-red-400">{signal.stopLoss}</span>
                <button
                  onClick={() => handleCopy(signal.stopLoss, 'sl')}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  {copied === 'sl' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Take Profit */}
            <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
              <span className="text-green-300">Take Profit</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-green-400">{signal.takeProfit}</span>
                <button
                  onClick={() => handleCopy(signal.takeProfit, 'tp')}
                  className="text-green-400 hover:text-green-300 transition-colors"
                >
                  {copied === 'tp' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Details */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-white mb-3">Analysis Details</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{signal.reason}</p>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">EMA20</p>
                <p className="text-white font-mono">{signal.analysis?.ema20}</p>
              </div>
              <div>
                <p className="text-gray-400">EMA50</p>
                <p className="text-white font-mono">{signal.analysis?.ema50}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-500 text-center">
          Generated: {signal.timestamp}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
          <button
            className={`flex-1 ${
              signal.signal === 'BUY'
                ? 'bg-green-600 hover:bg-green-700'
                : signal.signal === 'SELL'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-600 hover:bg-gray-700'
            } text-white px-4 py-3 rounded-lg font-medium transition-colors`}
          >
            Place Order ({signal.signal})
          </button>
        </div>
      </div>
    </div>
  );
}
