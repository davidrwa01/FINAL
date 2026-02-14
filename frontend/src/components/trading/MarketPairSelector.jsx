import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Heart, Search, Loader2, AlertCircle } from 'lucide-react';
import { useMarket } from '../contexts/MarketContext';
import analysisService from '../services/analysisService';

/**
 * Market Pair Selector with Live Signals
 * Browse/favorite pairs and generate SMC signals with one click
 */
export default function MarketPairSelector({ onSelectPair }) {
  const { favorites, toggleFavorite, isFavorite, loading: marketLoading } = useMarket();
  const [activeTab, setActiveTab] = useState('favorites'); // favorites | all
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('H1');
  const [generatingSignal, setGeneratingSignal] = useState(null);
  const [signals, setSignals] = useState({});
  const [error, setError] = useState(null);

  const timeframes = ['M5', 'M15', 'H1', 'H4', 'D1'];
  const allPairs = [
    // Forex
    { symbol: 'EURUSD', name: 'EUR/USD', category: 'Forex' },
    { symbol: 'GBPUSD', name: 'GBP/USD', category: 'Forex' },
    { symbol: 'USDJPY', name: 'USD/JPY', category: 'Forex' },
    { symbol: 'USDCHF', name: 'USD/CHF', category: 'Forex' },
    { symbol: 'AUDUSD', name: 'AUD/USD', category: 'Forex' },
    // Crypto
    { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'Crypto' },
    { symbol: 'ETHUSDT', name: 'Ethereum', category: 'Crypto' },
    { symbol: 'BNBUSDT', name: 'Binance Coin', category: 'Crypto' },
    { symbol: 'SOLUSDT', name: 'Solana', category: 'Crypto' },
    // Metals
    { symbol: 'XAUUSD', name: 'Gold', category: 'Metals' },
    { symbol: 'XAGUSD', name: 'Silver', category: 'Metals' },
  ];

  // Filter pairs
  const filteredPairs = allPairs.filter(p => {
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'favorites') {
      return matchesSearch && favorites.includes(p.symbol);
    }
    return matchesSearch;
  });

  // Generate signal for a pair
  const generateSignal = async (symbol) => {
    setGeneratingSignal(symbol);
    setError(null);

    try {
      const result = await analysisService.generateLiveSignal(symbol, selectedTimeframe);

      if (result.error) {
        setError(`${symbol}: ${result.error}`);
      } else {
        // Store signal in state
        setSignals(prev => ({
          ...prev,
          [symbol]: {
            direction: result.signal || 'WAIT',
            confidence: result.confidence || 0,
            entry: result.entry || 0,
            sl: result.sl || 0,
            tp1: result.tp1 || 0,
            tp2: result.tp2 || 0,
            tp3: result.tp3 || 0,
            rr: result.rr || '0.00',
            reason: result.reason || '',
            symbol,
            timeframe: selectedTimeframe,
            analysis: {
              currentPrice: result.entry || 0,
              rsi: result.rsi || 50,
              ema20: result.ema20 || 0,
              ema50: result.ema50 || 0
            },
            timestamp: new Date().toLocaleTimeString()
          }
        }));

        // Callback to parent
        if (onSelectPair) {
          onSelectPair(signals[symbol]);
        }
      }
    } catch (err) {
      console.error(`Signal generation failed for ${symbol}:`, err);
      setError(`Failed to analyze ${symbol}`);
    } finally {
      setGeneratingSignal(null);
    }
  };

  return (
    <div className="bg-black-light rounded-lg border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white mb-4">Market Pairs</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-600" />
          <input
            type="text"
            placeholder="Search pairs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-gray-800 text-white pl-9 pr-3 py-2 text-sm rounded focus:border-yellow outline-none transition"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 text-xs font-semibold rounded transition ${
              activeTab === 'favorites'
                ? 'bg-yellow text-black'
                : 'border border-gray-800 text-gray-400 hover:border-gray-600'
            }`}
          >
            ★ Favorites ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs font-semibold rounded transition ${
              activeTab === 'all'
                ? 'bg-yellow text-black'
                : 'border border-gray-800 text-gray-400 hover:border-gray-600'
            }`}
          >
            All Pairs ({allPairs.length})
          </button>
        </div>

        {/* Timeframe */}
        <div className="flex gap-2">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1 text-xs font-mono rounded transition ${
                selectedTimeframe === tf
                  ? 'bg-gray-700 text-white border border-gray-600'
                  : 'border border-gray-800 text-gray-500 hover:border-gray-600'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red/10 border border-red/50 rounded flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 text-red flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red">{error}</p>
        </div>
      )}

      {/* Pairs List */}
      <div className="max-h-[600px] overflow-y-auto">
        {marketLoading && filteredPairs.length === 0 ? (
          <div className="p-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-yellow" />
            <p className="text-sm text-gray-400">Loading pairs...</p>
          </div>
        ) : filteredPairs.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500">No pairs found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredPairs.map(pair => (
              <PairRow
                key={pair.symbol}
                pair={pair}
                signal={signals[pair.symbol]}
                onGenerateSignal={generateSignal}
                onToggleFavorite={() => toggleFavorite(pair.symbol)}
                isFavorite={isFavorite(pair.symbol)}
                isGenerating={generatingSignal === pair.symbol}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Pair Row Component
function PairRow({
  pair,
  signal,
  onGenerateSignal,
  onToggleFavorite,
  isFavorite: isFav,
  isGenerating
}) {
  const [livePrice, setLivePrice] = React.useState(null);

  // Fetch live price on mount
  React.useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`/api/market/snapshot/${pair.symbol}`);
        const data = await response.json();
        if (data.success) {
          setLivePrice(data.data.price);
        }
      } catch (err) {
        console.error('Price fetch error:', err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [pair.symbol]);

  const changeColor = signal?.entry > livePrice ? 'text-red' : 'text-green';

  return (
    <div className="bg-black rounded px-3 py-3 border border-gray-900 hover:border-gray-800 transition flex items-center gap-3 group">
      {/* Favorite Button */}
      <button
        onClick={onToggleFavorite}
        className="text-gray-600 hover:text-yellow transition flex-shrink-0"
      >
        <Heart
          className="w-4 h-4"
          fill={isFav ? 'currentColor' : 'none'}
          color={isFav ? '#FFD700' : 'currentColor'}
        />
      </button>

      {/* Pair Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white">{pair.name}</div>
        <div className="text-xs text-gray-500">{pair.symbol} • {pair.category}</div>
      </div>

      {/* Price */}
      {livePrice && (
        <div className="text-right min-w-[70px]">
          <div className="text-sm font-bold text-yellow font-mono">{formatPrice(livePrice)}</div>
        </div>
      )}

      {/* Signal Status or Generate Button */}
      {signal && signal.direction !== 'WAIT' ? (
        <div className={`text-right min-w-[60px] ${
          signal.direction === 'BUY' ? 'text-green' : signal.direction === 'SELL' ? 'text-red' : 'text-gray-400'
        }`}>
          <div className="text-xs font-bold">{signal.direction}</div>
          <div className="text-xs text-gray-500">{signal.confidence}%</div>
        </div>
      ) : (
        <button
          onClick={() => onGenerateSignal(pair.symbol)}
          disabled={isGenerating}
          className="px-3 py-1.5 text-xs font-semibold bg-yellow text-black rounded hover:bg-yellow/90 transition disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing
            </>
          ) : (
            'Signal'
          )}
        </button>
      )}
    </div>
  );
}

function formatPrice(price) {
  if (!price) return '—';
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}