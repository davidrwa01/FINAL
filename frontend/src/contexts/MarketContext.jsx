import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import marketDataService from '../services/marketDataService';

const MarketContext = createContext();

export function MarketProvider({ children }) {
  const [marketData, setMarketData] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Load favorites from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('favoritePairs');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
    }
  }, []);

  // Fetch market data periodically
  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await marketDataService.getAllMarketData();
      setMarketData(data);
      setConnectionStatus('connected');
      setError(null);
    } catch (err) {
      setConnectionStatus('error');
      setError(err.message);
      console.error('Market data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and periodic updates (every 10 seconds)
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 10000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Manage favorites
  const addFavorite = useCallback((symbol) => {
    setFavorites(prev => {
      const updated = [...new Set([...prev, symbol])];
      localStorage.setItem('favoritePairs', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((symbol) => {
    setFavorites(prev => {
      const updated = prev.filter(s => s !== symbol);
      localStorage.setItem('favoritePairs', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback((symbol) => {
    setFavorites(prev => {
      let updated;
      if (prev.includes(symbol)) {
        updated = prev.filter(s => s !== symbol);
      } else {
        updated = [...prev, symbol];
      }
      localStorage.setItem('favoritePairs', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorite = useCallback((symbol) => {
    return favorites.includes(symbol);
  }, [favorites]);

  // Get specific market data
  const getPrice = useCallback((symbol) => {
    const normalized = marketDataService.normalizeSymbolKey(symbol);
    return marketData.crypto?.[normalized]?.price ||
           marketData.forex?.[normalized]?.price ||
           null;
  }, [marketData]);

  const getMarketInfo = useCallback((symbol) => {
    const normalized = marketDataService.normalizeSymbolKey(symbol);
    return marketData.crypto?.[normalized] ||
           marketData.forex?.[normalized] ||
           null;
  }, [marketData]);

  const value = {
    marketData,
    favorites,
    loading,
    error,
    connectionStatus,
    fetchMarketData,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    getPrice,
    getMarketInfo
  };

  return (
    <MarketContext.Provider value={value}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within MarketProvider');
  }
  return context;
}
