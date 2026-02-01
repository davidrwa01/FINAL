import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Zap, AlertCircle } from 'lucide-react';
import { marketService, analysisService } from '../../services/api';
import { signalService, subscriptionService } from '../../services/api';

/**
 * Market Feed Component - Real-time price updates with signal generation
 */
export default function MarketFeed({ onSignalGenerated }) {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(['BTCUSDT', 'ETHUSDT', 'EURUSD', 'XAUUSD', 'GBPUSD']);
  const [generatingSignal, setGeneratingSignal] = useState(null);
  const [signals, setSignals] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMarkets();
    const interval = setInterval(loadMarkets, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadMarkets = async () => {
    try {
      const allPrices = {};
      
      // Fetch crypto
      const cryptoRes = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'PAXGUSDT'])}`
      );
      const cryptoData = await cryptoRes.json();
      
      if (Array.isArray(cryptoData)) {
        cryptoData.forEach(ticker => {
          allPrices[ticker.symbol] = {
            price: parseFloat(ticker.lastPrice),
            change: parseFloat(ticker.priceChangePercent)
          };
        });
        
        // Map PAXGUSDT to XAUUSD
        if (allPrices.PAXGUSDT) {
          allPrices.XAUUSD = allPrices.PAXGUSDT;
        }
      }

      // Fetch forex
      const forexRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const forexData = await forexRes.json();
      
      if (forexData.rates) {
        allPrices.EURUSD = {
          price: parseFloat((1 / forexData.rates.EUR).toFixed(5)),
          change: 0
        };
        allPrices.GBPUSD = {
          price: parseFloat((1 / forexData.rates.GBP).toFixed(5)),
          change: 0
        };
      }

      // Update favorites
      const favMarkets = favorites
        .map(symbol => ({
          symbol,
          data: allPrices[symbol]
        }))
        .filter(m => m.data);

      setMarkets(favMarkets);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load markets:', error);
      setLoading(false);
    }
  };

  const removeFavorite = (symbol) => {
    setFavorites(favorites.filter(s => s !== symbol));
  };

  const addFavorite = (symbol) => {
    if (!favorites.includes(symbol)) {
      setFavorites([...favorites, symbol]);
    }
  };

  const handleGenerateSignal = async (symbol) => {
    setGeneratingSignal(symbol);
    setError(null);

    try {
      // Check access first
      const accessCheck = await signalService.checkAccess();
      if (!accessCheck.success || !accessCheck.data.canGenerate) {
        setError('Cannot generate signal - trial limit or subscription required');
        setGeneratingSignal(null);
        return;
      }

      // Get market data
      const marketResponse = await marketService.getMarketSeries(symbol, '1h', 120);
      if (!marketResponse.success) {
        throw new Error('Failed to fetch market data');
      }

      const klines = marketResponse.data.candles;
      
      // Analyze with SMC
      const analysisResponse = await analysisService.analyzeSMC(klines);
      if (!analysisResponse.success) {
        throw new Error('Analysis failed');
      }

      const analysis = analysisResponse.data;

      // Generate signal
      const signalResponse = await analysisService.generateSignal(
        analysis,
        analysis.currentPrice,
        symbol,
        'H1'
      );

      if (!signalResponse.success) {
        throw new Error('Signal generation failed');
      }

      const generatedSignal = {
        direction: signalResponse.data.signal,
        confidence: signalResponse.data.confidence,
        entry: signalResponse.data.entry,
        sl: signalResponse.data.stopLoss,
        tp1: signalResponse.data.takeProfit,
        rr: signalResponse.data.riskReward,
        timestamp: new Date().toISOString()
      };

      setSignals(prev => ({ ...prev, [symbol]: generatedSignal }));
      
      if (onSignalGenerated) {
        onSignalGenerated(symbol, generatedSignal);
      }

      console.log(`✓ Signal generated for ${symbol}:`, generatedSignal);
    } catch (err) {
      console.error(`✗ Signal generation error for ${symbol}:`, err);
      setError(err.message || 'Failed to generate signal');
      setSignals(prev => ({ ...prev, [symbol]: { error: err.message } }));
    } finally {
      setGeneratingSignal(null);
    }
  };

  return (
    <div className="bg-black-light rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Live Market Data
        </h2>
        <button
          onClick={() => setFavorites([...favorites, 'NEW'])}
          className="text-xs bg-yellow text-black px-2 py-1 rounded hover:bg-yellow-light transition"
        >
          + Add Pair
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="spinner"></div>
          <span className="text-xs text-gray-400 ml-2">Loading markets...</span>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 bg-red/10 border border-red/50 text-red px-3 py-2 rounded-lg flex gap-2 items-start text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-2 scrollbar-custom max-h-96 overflow-y-auto">
            {markets.map(market => {
              const signal = signals[market.symbol];
              const isPositive = market.data.change >= 0;
              
              return (
                <div
                  key={market.symbol}
                  className="group bg-black rounded-lg p-4 border border-gray-800 hover:border-yellow/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-yellow/20"
                  onClick={() => handleGenerateSignal(market.symbol)}
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Symbol & Price */}
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow/10 rounded-lg flex items-center justify-center text-yellow text-lg font-bold group-hover:bg-yellow/20 transition">
                        {getSymbolIcon(market.symbol)}
                      </div>
                      <div>
                        <p className="font-bold text-white">{market.symbol.replace('USDT', '').replace('USD', '')}</p>
                        <p className="text-xs text-gray-400">{market.symbol}</p>
                      </div>
                    </div>

                    {/* Center: Price & Change */}
                    <div className="flex-1 text-center">
                      <p className="text-lg font-mono font-bold text-yellow">${formatPrice(market.data.price)}</p>
                      <p className={`text-sm font-semibold flex items-center justify-center gap-1 ${isPositive ? 'text-green' : 'text-red'}`}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {isPositive ? '+' : ''}{market.data.change.toFixed(2)}%
                      </p>
                    </div>

                    {/* Right: Signal & Controls */}
                    <div className="flex-1 flex flex-col items-end gap-2">
                      {generatingSignal === market.symbol ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-yellow/30 border-t-yellow rounded-full animate-spin"></div>
                          <span className="text-xs text-gray-400">Analyzing...</span>
                        </div>
                      ) : signal && !signal.error ? (
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                            signal.direction === 'BUY' ? 'bg-green/20 text-green' :
                            signal.direction === 'SELL' ? 'bg-red/20 text-red' :
                            'bg-gray/20 text-gray'
                          }`}>
                            <Zap size={12} />
                            {signal.direction}
                          </div>
                          <span className="text-xs text-gray-500">{signal.confidence}%</span>
                        </div>
                      ) : null}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavorite(market.symbol);
                        }}
                        className="text-gray-400 hover:text-red transition text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Signal Details Expanded */}
                  {signal && !signal.error && (
                    <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center">
                        <p className="text-gray-500">Entry</p>
                        <p className="font-mono font-bold text-green">${formatPrice(signal.entry)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">S/L</p>
                        <p className="font-mono font-bold text-red">${formatPrice(signal.sl)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">T/P</p>
                        <p className="font-mono font-bold text-green">${formatPrice(signal.tp1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">R:R</p>
                        <p className="font-mono font-bold text-yellow">{signal.rr?.toFixed(2) || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function getSymbolIcon(symbol) {
  const icons = {
    'BTCUSDT': '₿',
    'ETHUSDT': 'Ξ',
    'BNBUSDT': 'B',
    'SOLUSDT': '◎',
    'EURUSD': '€',
    'GBPUSD': '£',
    'USDJPY': '¥',
    'AUDUSD': 'A',
    'XAUUSD': '🥇',
    'XAGUSD': '🥈',
  };
  return icons[symbol] || '○';
}

function formatPrice(price) {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}
