import React, { useState, useEffect } from 'react';
import { signalService, subscriptionService } from '../../services/api';

/**
 * Market Feed Component - Real-time price updates
 */
export default function MarketFeed() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(['BTCUSDT', 'ETHUSDT', 'EURUSD', 'XAUUSD', 'GBPUSD']);

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
        <div className="space-y-2 scrollbar-custom max-h-96 overflow-y-auto">
          {markets.map(market => (
            <div
              key={market.symbol}
              className="stat-card rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-opacity-80 transition"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 bg-yellow bg-opacity-20 rounded flex items-center justify-center text-yellow text-sm">
                  {getSymbolIcon(market.symbol)}
                </div>
                <div>
                  <p className="text-sm font-medium">{market.symbol.replace('USDT', '')}</p>
                  <p className="text-xs text-gray">{market.symbol}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="text-sm font-bold mono">${formatPrice(market.data.price)}</p>
                  <p className={`text-xs ${market.data.change >= 0 ? 'text-green' : 'text-red'}`}>
                    {market.data.change >= 0 ? '↑' : '↓'} {Math.abs(market.data.change).toFixed(2)}%
                  </p>
                </div>
                <button
                  onClick={() => removeFavorite(market.symbol)}
                  className="text-gray hover:text-red text-lg"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
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
