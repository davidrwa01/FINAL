import React, { useState, useRef, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import analysisService from '../../services/analysisService';
import marketDataService from '../../services/marketDataService';
import SignalPanel from './SignalPanel';

/**
 * Live Market Analysis
 * Search any market pair, fetch live data, run SMC analysis, generate signals
 * Supports Forex, Crypto, Metals, Indices, Volatility
 */
export default function LiveMarketAnalysis() {
  const [searchQuery, setSearchQuery] = useState('BTCUSDT');
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('H1');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [signal, setSignal] = useState(null);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef(null);

  const timeframes = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

  // Search for market pairs
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // Select a symbol from search results
  const selectSymbol = (symbol) => {
    setSelectedSymbol(symbol);
    setSearchQuery(symbol);
    setShowSearch(false);
    setSearchResults([]);
    setSignal(null);
    setError(null);
  };

  // Fetch live price
  const fetchPrice = async (symbol) => {
    try {
      const response = await fetch(`/api/market/snapshot/${symbol}`);
      const data = await response.json();
      if (data.success) {
        setCurrentPrice(data.data.price);
        return data.data.price;
      }
    } catch (err) {
      console.error('Price fetch error:', err);
    }
    return null;
  };

  // Generate signal with SMC analysis
  const handleAnalyze = async () => {
    if (!selectedSymbol) {
      setError('Please select a market pair');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setSignal(null);

    try {
      // Fetch live data and run analysis
      const result = await analysisService.generateLiveSignal(selectedSymbol, selectedTimeframe);

      if (result.error) {
        setError(result.error);
        setAnalyzing(false);
        return;
      }

      // Normalize to internal format
      const normalizedSignal = {
        direction: result.signal || 'WAIT',
        confidence: result.confidence || 0,
        entry: result.entry || currentPrice,
        sl: result.sl || 0,
        tp1: result.tp1 || 0,
        tp2: result.tp2 || 0,
        tp3: result.tp3 || 0,
        rr: String(result.rr || '0.00'),
        reason: result.reason || 'SMC Analysis Complete',
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        analysis: {
          currentPrice: result.entry || currentPrice,
          rsi: result.rsi != null ? Math.round(result.rsi) : 50,
          ema20: result.ema20 != null ? result.ema20 : 0,
          ema50: result.ema50 != null ? result.ema50 : 0
        },
        timestamp: new Date().toLocaleTimeString()
      };

      setSignal(normalizedSignal);

    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze market: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Refresh price
  const handleRefreshPrice = async () => {
    setLoading(true);
    try {
      await fetchPrice(selectedSymbol);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load price when symbol changes
  useEffect(() => {
    handleRefreshPrice();
  }, [selectedSymbol]);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="bg-black-light rounded-lg p-6 border border-gray-800">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-1">Live Market Analysis</h2>
          <p className="text-xs text-gray-500">Search any pair and generate SMC-based signals</p>
        </div>

        {/* Search & Symbol Selection */}
        <div className="mb-6 relative" ref={searchInputRef}>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="Search pair (BTC, EUR/USD, Gold, VIX...)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="w-full bg-black border border-gray-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:border-yellow outline-none transition text-sm"
            />
          </div>

          {/* Search Results Dropdown */}
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-700 rounded-lg z-50 max-h-60 overflow-y-auto">
              {searchResults.map(result => (
                <button
                  key={result.symbol}
                  onClick={() => selectSymbol(result.symbol)}
                  className="w-full text-left px-4 py-2.5 border-b border-gray-800 hover:bg-gray-900/50 transition flex justify-between items-center"
                >
                  <div>
                    <div className="text-white font-semibold text-sm">{result.name}</div>
                    <div className="text-xs text-gray-500">{result.symbol}</div>
                  </div>
                  <div className="text-xs text-gray-400">{result.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current Price Display */}
        {currentPrice != null && (
          <div className="mb-6 bg-black rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Live Price</p>
                <p className="text-2xl font-bold text-yellow font-mono mt-1">
                  {formatPrice(currentPrice, selectedSymbol)}
                </p>
              </div>
              <button
                onClick={handleRefreshPrice}
                disabled={loading}
                className="text-gray-400 hover:text-yellow transition disabled:opacity-50"
                title="Refresh price"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Timeframe Selection */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Timeframe</p>
          <div className="grid grid-cols-4 gap-2">
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`py-2 px-3 rounded text-xs font-semibold transition border ${
                  selectedTimeframe === tf
                    ? 'bg-yellow text-black border-yellow'
                    : 'border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red/10 border border-red/50 rounded-lg flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 text-red flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red">{error}</p>
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !selectedSymbol}
          className="w-full bg-yellow text-black font-semibold py-3 rounded-lg hover:bg-yellow/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing with SMC...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Generate Signal
            </>
          )}
        </button>

        {/* Analysis Info */}
        {analyzing && (
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
            <p className="text-xs text-gray-400 text-center">
              Fetching live data • Running SMC analysis • Generating signal...
            </p>
          </div>
        )}

        {/* Signal Result */}
        {signal && signal.direction !== 'WAIT' && !analyzing && (
          <div className={`mt-6 pt-6 border-t border-gray-800 rounded-lg p-4 ${
            signal.direction === 'BUY' ? 'bg-green/5 border-l-4 border-l-green' :
            signal.direction === 'SELL' ? 'bg-red/5 border-l-4 border-l-red' :
            'bg-gray-900/50'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {signal.direction === 'BUY' && <TrendingUp className="w-5 h-5 text-green" />}
              {signal.direction === 'SELL' && <TrendingDown className="w-5 h-5 text-red" />}
              <span className={`text-lg font-bold ${
                signal.direction === 'BUY' ? 'text-green' : signal.direction === 'SELL' ? 'text-red' : 'text-gray-400'
              }`}>
                {signal.direction} Signal • {signal.confidence}% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div className="bg-black/50 rounded p-2">
                <p className="text-gray-500">Entry</p>
                <p className="text-white font-mono font-bold">{formatPrice(signal.entry, selectedSymbol)}</p>
              </div>
              <div className="bg-black/50 rounded p-2">
                <p className="text-gray-500">Stop Loss</p>
                <p className="text-red font-mono font-bold">{formatPrice(signal.sl, selectedSymbol)}</p>
              </div>
              <div className="bg-black/50 rounded p-2">
                <p className="text-gray-500">Take Profit</p>
                <p className="text-green font-mono font-bold">{formatPrice(signal.tp1, selectedSymbol)}</p>
              </div>
              <div className="bg-black/50 rounded p-2">
                <p className="text-gray-500">Risk:Reward</p>
                <p className="text-yellow font-mono font-bold">1:{signal.rr}</p>
              </div>
            </div>

            {signal.reason && (
              <p className="text-xs text-gray-400 mb-3">{signal.reason}</p>
            )}

            <button className="w-full bg-yellow text-black text-sm font-semibold py-2 rounded hover:bg-yellow/90 transition">
              View Full Analysis
            </button>
          </div>
        )}

        {/* No Signal State */}
        {signal && signal.direction === 'WAIT' && !analyzing && (
          <div className="mt-6 pt-6 border-t border-gray-800 text-center py-4">
            <p className="text-gray-400 text-sm">
              🕐 No clear signal at this time. Wait for better market structure confirmation.
            </p>
          </div>
        )}
      </div>

      {/* Full Signal Panel Modal */}
      {signal && signal.direction !== 'WAIT' && (
        <SignalPanel signal={signal} onClose={() => setSignal(null)} />
      )}
    </>
  );
}

// Helper: Format price with correct decimals
function formatPrice(price, symbol = '') {
  if (price == null || isNaN(price)) return '—';
  
  let decimals = 2;
  const s = String(symbol).toUpperCase();
  
  if (s.includes('JPY')) decimals = 0;
  else if (s.includes('USD') && !s.includes('USDT')) decimals = 4;
  else if (s.includes('BTC') || s.includes('ETH')) decimals = 2;
  else if (price >= 1000) decimals = 2;
  else if (price >= 1) decimals = 4;
  else decimals = 6;
  
  return Number(price).toFixed(decimals);
}