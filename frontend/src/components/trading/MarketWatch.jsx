import React, { useState } from 'react';
import { Star, Plus, X, TrendingUp, TrendingDown } from 'lucide-react';
import { useMarket } from '../../contexts/MarketContext';
import marketDataService from '../../services/marketDataService';
import analysisService from '../../services/analysisService';

export default function MarketWatch({ onSelectPair }) {
  const { favorites, isFavorite, toggleFavorite, getMarketInfo, connectionStatus } = useMarket();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [generateingSignal, setGeneratingSignal] = useState(null);
  const [signals, setSignals] = useState({});

  const defaultPairs = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'XAUUSD', 'GBPUSD'];
  const displayPairs = favorites.length > 0 ? favorites : defaultPairs;

  const handleAddPair = () => {
    const normalized = marketDataService.normalizeSymbolKey(newSymbol);
    if (normalized) {
      toggleFavorite(normalized);
      setNewSymbol('');
      setShowAddModal(false);
    }
  };

  const handleGenerateSignal = async (symbol) => {
    setGeneratingSignal(symbol);
    const signal = await analysisService.generateLiveSignal(symbol);
    setSignals(prev => ({ ...prev, [symbol]: signal }));
    setGeneratingSignal(null);
    if (onSelectPair) {
      onSelectPair(symbol, signal);
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Market Watch</h2>
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-400'
                  : connectionStatus === 'error'
                  ? 'bg-red-400'
                  : 'bg-yellow-400'
              }`}
            />
            <span className="text-xs text-gray-400">
              {connectionStatus === 'connected' ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Pair
        </button>
      </div>

      <div className="space-y-3">
        {displayPairs.map(symbol => {
          const info = getMarketInfo(symbol);
          const isPositive = (info?.change || 0) >= 0;
          const displaySymbol = marketDataService.prettySymbol(symbol);
          const signal = signals[symbol];

          return (
            <div
              key={symbol}
              className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/50 transition-all cursor-pointer"
              onClick={() => handleGenerateSignal(symbol)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleFavorite(symbol);
                      }}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          isFavorite(symbol)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-400'
                        }`}
                      />
                    </button>
                    <div>
                      <h3 className="font-bold text-white">{displaySymbol}</h3>
                      <p className="text-xs text-gray-400">
                        {info?.price ? marketDataService.formatPrice(info.price) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium flex items-center gap-1 ${
                        isPositive ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {info?.change?.toFixed(2)}%
                    </p>
                  </div>

                  {/* Signal Badge */}
                  {signal && !signal.error && (
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        signal.signal === 'BUY'
                          ? 'bg-green-500/20 text-green-400'
                          : signal.signal === 'SELL'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {signal.signal}
                    </div>
                  )}

                  {generateingSignal === symbol && (
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>

              {/* Signal Details */}
              {signal && !signal.error && (
                <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span className="text-white font-medium">{signal.confidence}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entry:</span>
                    <span className="text-white font-mono">{signal.entry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R:R:</span>
                    <span className="text-white font-mono">{signal.riskReward}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Pair Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Add Trading Pair</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewSymbol('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Symbol (e.g., BTC/USDT, EUR/USD, XAU/USD)
                </label>
                <input
                  type="text"
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                  onKeyPress={e => {
                    if (e.key === 'Enter') handleAddPair();
                  }}
                  placeholder="Enter symbol"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewSymbol('');
                  }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPair}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
