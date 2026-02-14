import React, { useState, useEffect } from 'react';
import { Search, Heart, TrendingUp, TrendingDown, Grid, List, Loader2 } from 'lucide-react';
import { useMarket } from '../contexts/MarketContext';

/**
 * Market Discovery Page
 * Browse markets by category, search, and manage favorites
 * Professional dark theme with live prices
 */
export default function MarketDiscovery() {
  const { marketData, favorites, toggleFavorite, isFavorite, loading, connectionStatus } = useMarket();
  
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [sortBy, setSortBy] = useState('name'); // name | change | price
  
  // Market categories from your catalog
  const categories = [
    { key: 'ALL', label: 'All Markets', icon: '🌍', color: 'text-gray-400' },
    { key: 'FOREX', label: 'Forex', icon: '💱', color: 'text-blue-400' },
    { key: 'CRYPTO', label: 'Crypto', icon: '₿', color: 'text-yellow-400' },
    { key: 'METALS', label: 'Metals', icon: '🥇', color: 'text-yellow-500' },
    { key: 'INDICES', label: 'Indices', icon: '📈', color: 'text-green-400' },
    { key: 'VOLATILITY', label: 'Volatility', icon: '📊', color: 'text-red-400' }
  ];

  // Flatten all markets from API response
  const getAllMarkets = () => {
    const markets = [];
    const catalogMap = {
      'EURUSD': 'FOREX', 'GBPUSD': 'FOREX', 'USDJPY': 'FOREX', 'USDCHF': 'FOREX',
      'AUDUSD': 'FOREX', 'NZDUSD': 'FOREX', 'USDCAD': 'FOREX', 'EURGBP': 'FOREX',
      'EURJPY': 'FOREX', 'GBPJPY': 'FOREX',
      'BTCUSDT': 'CRYPTO', 'ETHUSDT': 'CRYPTO', 'BNBUSDT': 'CRYPTO', 'SOLUSDT': 'CRYPTO',
      'XRPUSDT': 'CRYPTO', 'ADAUSDT': 'CRYPTO', 'DOGEUSDT': 'CRYPTO', 'AVAXUSDT': 'CRYPTO',
      'DOTUSDT': 'CRYPTO', 'LINKUSDT': 'CRYPTO',
      'XAUUSD': 'METALS', 'XAGUSD': 'METALS',
      'US30': 'INDICES', 'NAS100': 'INDICES', 'SPX500': 'INDICES', 'GER40': 'INDICES', 'UK100': 'INDICES',
      'VIX': 'VOLATILITY'
    };

    // Combine crypto and forex data from market context
    const allData = { ...marketData.crypto, ...marketData.forex };
    
    for (const [symbol, data] of Object.entries(allData)) {
      if (data && data.price != null) {
        markets.push({
          symbol,
          name: data.symbol || symbol,
          price: data.price,
          change: data.change || 0,
          category: catalogMap[symbol] || 'OTHER'
        });
      }
    }

    return markets;
  };

  // Filter and sort markets
  const filteredMarkets = getAllMarkets()
    .filter(m => {
      const matchCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
      const matchSearch = searchQuery === '' || 
        m.name.toUpperCase().includes(searchQuery.toUpperCase()) ||
        m.symbol.toUpperCase().includes(searchQuery.toUpperCase());
      return matchCategory && matchSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'change':
          return Math.abs(b.change) - Math.abs(a.change);
        case 'price':
          return b.price - a.price;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 w-full bg-black-light border-b border-gray-800 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Market Discovery</h1>
            <p className="text-xs text-gray-500 mt-1">
              {connectionStatus === 'connected' ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green rounded-full"></span>
                  Live pricing
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow rounded-full animate-pulse"></span>
                  Connecting...
                </span>
              )}
            </p>
          </div>
          
          {/* View controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded border transition ${
                viewMode === 'grid' 
                  ? 'bg-yellow text-black border-yellow' 
                  : 'border-gray-800 text-gray-400 hover:border-gray-600'
              }`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded border transition ${
                viewMode === 'list' 
                  ? 'bg-yellow text-black border-yellow' 
                  : 'border-gray-800 text-gray-400 hover:border-gray-600'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="pt-24 max-w-7xl mx-auto px-6 pb-6">
        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-600" />
            <input
              type="text"
              placeholder="Search pairs... (e.g., BTC, EUR/USD, Gold)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black-light border border-gray-800 text-white pl-12 pr-4 py-3 rounded-lg focus:border-yellow outline-none transition"
            />
          </div>

          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-4 py-2 rounded-lg border font-mono text-sm transition flex items-center gap-2 ${
                  selectedCategory === cat.key
                    ? 'bg-yellow text-black border-yellow'
                    : 'border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
                <span className="text-xs opacity-75">
                  ({filteredMarkets.filter(m => m.category === cat.key).length})
                </span>
              </button>
            ))}
          </div>

          {/* Sort controls */}
          <div className="flex gap-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black border border-gray-800 text-white text-sm px-3 py-1.5 rounded focus:border-yellow outline-none transition"
            >
              <option value="name">Name</option>
              <option value="change">Volatility</option>
              <option value="price">Price</option>
            </select>
          </div>
        </div>

        {/* Results info */}
        <div className="mb-4 text-sm text-gray-500">
          Showing {filteredMarkets.length} market{filteredMarkets.length !== 1 ? 's' : ''}
        </div>

        {/* Loading state */}
        {loading && filteredMarkets.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-yellow animate-spin mr-2" />
            <p className="text-gray-400">Loading market data...</p>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMarkets.map(market => (
              <MarketCard key={market.symbol} market={market} />
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {filteredMarkets.map(market => (
              <MarketListRow key={market.symbol} market={market} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredMarkets.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-600 text-4xl mb-4">🔍</div>
            <p className="text-gray-400">No markets found matching your search</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Market Card Component (Grid View)
function MarketCard({ market }) {
  const { isFavorite, toggleFavorite } = useMarket();
  const isPositive = market.change >= 0;

  return (
    <div className="bg-black-light border border-gray-800 rounded-lg p-4 hover:border-yellow/50 transition group cursor-pointer">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-white text-sm">{market.name}</h3>
          <p className="text-xs text-gray-500 font-mono">{market.symbol}</p>
        </div>
        <button
          onClick={() => toggleFavorite(market.symbol)}
          className="text-gray-400 hover:text-yellow transition opacity-0 group-hover:opacity-100"
        >
          <Heart
            className="w-5 h-5"
            fill={isFavorite(market.symbol) ? 'currentColor' : 'none'}
            color={isFavorite(market.symbol) ? '#FFD700' : 'currentColor'}
          />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-2xl font-bold text-yellow font-mono">
            {formatPrice(market.price)}
          </span>
          <div className={`flex items-center gap-1 ${isPositive ? 'text-green' : 'text-red'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-mono text-sm">
              {isPositive ? '+' : ''}{market.change.toFixed(2)}%
            </span>
          </div>
        </div>

        <button className="w-full bg-yellow text-black text-xs font-semibold py-2 rounded hover:bg-yellow/90 transition">
          Analyze Signal
        </button>
      </div>
    </div>
  );
}

// Market List Row Component (List View)
function MarketListRow({ market }) {
  const { isFavorite, toggleFavorite } = useMarket();
  const isPositive = market.change >= 0;

  return (
    <div className="bg-black-light border border-gray-800 rounded-lg p-4 hover:border-yellow/50 transition flex items-center justify-between group">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={() => toggleFavorite(market.symbol)}
          className="text-gray-400 hover:text-yellow transition"
        >
          <Heart
            className="w-5 h-5"
            fill={isFavorite(market.symbol) ? 'currentColor' : 'none'}
            color={isFavorite(market.symbol) ? '#FFD700' : 'currentColor'}
          />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white">{market.name}</h3>
            <span className="text-xs text-gray-500 font-mono">{market.symbol}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="font-bold text-yellow font-mono">{formatPrice(market.price)}</div>
        </div>

        <div className={`text-right min-w-[80px] flex items-center gap-2 justify-end ${isPositive ? 'text-green' : 'text-red'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="font-mono font-semibold">
            {isPositive ? '+' : ''}{market.change.toFixed(2)}%
          </span>
        </div>

        <button className="bg-yellow text-black text-xs font-semibold px-4 py-2 rounded hover:bg-yellow/90 transition whitespace-nowrap">
          Analyze
        </button>
      </div>
    </div>
  );
}

// Price formatter
function formatPrice(price) {
  if (price == null) return '—';
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}