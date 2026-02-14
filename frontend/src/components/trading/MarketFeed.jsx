import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Zap, AlertCircle } from 'lucide-react';
import { signalService, analysisService } from '../../services/api';

/**
 * Market Feed — Real-time prices with one-click SMC signal generation.
 * 
 * FIX: Uses analysisService.getFullAnalysis() (single API call)
 *      instead of 3 separate calls with methods that didn't exist.
 */
export default function MarketFeed({ onSignalGenerated }) {
  const [markets, setMarkets]                   = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [favorites, setFavorites]               = useState(['BTCUSDT', 'ETHUSDT', 'EURUSD', 'XAUUSD', 'GBPUSD']);
  const [generatingSignal, setGeneratingSignal] = useState(null);
  const [signals, setSignals]                   = useState({});
  const [error, setError]                       = useState(null);

  useEffect(() => {
    loadMarkets();
    const iv = setInterval(loadMarkets, 10000);
    return () => clearInterval(iv);
  }, [favorites]);

  // ─── Fetch live prices ────────────────────────────────────
  const loadMarkets = async () => {
    try {
      const allPrices = {};

      // Crypto via Binance
      const cryptoSyms = favorites.filter(s => s.endsWith('USDT'));
      if (cryptoSyms.length > 0) {
        try {
          const res  = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(cryptoSyms)}`);
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach(t => {
              allPrices[t.symbol] = {
                price: parseFloat(t.lastPrice),
                change: parseFloat(t.priceChangePercent)
              };
            });
          }
        } catch (_) { /* ignore */ }
      }

      // Gold via PAXGUSDT
      if (favorites.includes('XAUUSD') && !allPrices['XAUUSD']) {
        try {
          const res  = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT');
          const data = await res.json();
          allPrices['XAUUSD'] = {
            price: parseFloat(data.lastPrice),
            change: parseFloat(data.priceChangePercent)
          };
        } catch (_) { /* ignore */ }
      }

      // Forex via ExchangeRate API
      const forexSyms = favorites.filter(s =>
        !s.endsWith('USDT') && s !== 'XAUUSD' && s !== 'XAGUSD'
      );
      if (forexSyms.length > 0) {
        try {
          const res  = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          const data = await res.json();
          if (data.rates) {
            forexSyms.forEach(sym => {
              const base  = sym.slice(0, 3);
              const quote = sym.slice(3, 6);
              let rate = null;
              if (base === 'USD' && data.rates[quote]) {
                rate = data.rates[quote];
              } else if (quote === 'USD' && data.rates[base]) {
                rate = 1 / data.rates[base];
              } else if (data.rates[base] && data.rates[quote]) {
                rate = data.rates[quote] / data.rates[base];
              }
              if (rate) {
                allPrices[sym] = { price: parseFloat(rate.toFixed(5)), change: 0 };
              }
            });
          }
        } catch (_) { /* ignore */ }
      }

      setMarkets(
        favorites
          .map(symbol => ({ symbol, data: allPrices[symbol] }))
          .filter(m => m.data)
      );
    } catch (err) {
      console.error('loadMarkets error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Generate signal for a symbol (ONE API CALL) ──────────
  const handleGenerateSignal = async (symbol) => {
    setGeneratingSignal(symbol);
    setError(null);

    try {
      // 1. Check access (trial / subscription)
      let canGenerate = true;
      try {
        const accessCheck = await signalService.checkAccess();
        canGenerate = accessCheck?.data?.canGenerate !== false;
      } catch (accessErr) {
        // If check-access fails (e.g. 401), still try analysis
        console.warn('Access check failed:', accessErr.message);
      }

      if (!canGenerate) {
        setError('Trial limit reached — please upgrade your plan.');
        setGeneratingSignal(null);
        return;
      }

      // 2. Track the generation (for trial counting)
      try {
        await signalService.generate({ symbol, timeframe: 'H1', signalType: 'MARKET_FEED' });
      } catch (trackErr) {
        // If trial-limit error, surface it
        if (trackErr.response?.data?.error === 'TRIAL_LIMIT_EXCEEDED') {
          setError(trackErr.response.data.message || 'Trial limit exceeded.');
          setGeneratingSignal(null);
          return;
        }
        console.warn('Signal tracking failed:', trackErr.message);
      }

      // 3. Run full analysis (one call does everything)
      const result = await analysisService.getFullAnalysis(symbol, '1h');

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Analysis returned no data');
      }

      const d   = result.data;
      const sig = d.signal;

      if (!sig) {
        throw new Error('No signal generated');
      }

      const generatedSignal = {
        direction:  sig.direction || 'WAIT',
        confidence: sig.confidence || d.confluence?.confidence || 0,
        entry:      sig.entry || d.currentPrice || 0,
        sl:         sig.stopLoss || 0,
        tp1:        sig.tp1 || 0,
        tp2:        sig.tp2 || 0,
        tp3:        sig.tp3 || 0,
        rr:         sig.rr || '0.00',
        reason:     sig.reason || '',
        timestamp:  new Date().toISOString()
      };

      setSignals(prev => ({ ...prev, [symbol]: generatedSignal }));

      if (onSignalGenerated) {
        onSignalGenerated(symbol, generatedSignal);
      }

      console.log(`✅ Signal for ${symbol}:`, generatedSignal);

    } catch (err) {
      console.error(`❌ Signal error for ${symbol}:`, err);
      setError(err.message || 'Failed to generate signal');
      setSignals(prev => ({ ...prev, [symbol]: { error: err.message } }));
    } finally {
      setGeneratingSignal(null);
    }
  };

  const removeFavorite = (symbol) => {
    setFavorites(prev => prev.filter(s => s !== symbol));
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="bg-black-light rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Live Market Data
        </h2>
        <div className="text-xs text-gray-500">
          Click any pair to generate signal
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="spinner"></div>
          <span className="text-xs text-gray-400 ml-2">Loading markets…</span>
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
              const signal     = signals[market.symbol];
              const isPositive = market.data.change >= 0;

              return (
                <div
                  key={market.symbol}
                  className="group bg-black rounded-lg p-4 border border-gray-800 hover:border-yellow/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-yellow/20"
                  onClick={() => handleGenerateSignal(market.symbol)}
                >
                  <div className="flex items-center justify-between">
                    {/* Symbol */}
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow/10 rounded-lg flex items-center justify-center text-yellow text-lg font-bold group-hover:bg-yellow/20 transition">
                        {getSymbolIcon(market.symbol)}
                      </div>
                      <div>
                        <p className="font-bold text-white">
                          {market.symbol.replace('USDT', '').replace('USD', '')}
                        </p>
                        <p className="text-xs text-gray-400">{market.symbol}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex-1 text-center">
                      <p className="text-lg font-mono font-bold text-yellow">
                        ${fmtPrice(market.data.price)}
                      </p>
                      <p className={`text-sm font-semibold flex items-center justify-center gap-1 ${
                        isPositive ? 'text-green' : 'text-red'
                      }`}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {isPositive ? '+' : ''}{market.data.change.toFixed(2)}%
                      </p>
                    </div>

                    {/* Signal status */}
                    <div className="flex-1 flex flex-col items-end gap-2">
                      {generatingSignal === market.symbol ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-yellow/30 border-t-yellow rounded-full animate-spin" />
                          <span className="text-xs text-gray-400">Analyzing…</span>
                        </div>
                      ) : signal && !signal.error ? (
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                            signal.direction === 'BUY'  ? 'bg-green/20 text-green' :
                            signal.direction === 'SELL' ? 'bg-red/20 text-red' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            <Zap size={12} />
                            {signal.direction}
                          </div>
                          <span className="text-xs text-gray-500">{signal.confidence}%</span>
                        </div>
                      ) : signal?.error ? (
                        <span className="text-xs text-red">Error</span>
                      ) : null}

                      <button
                        onClick={(e) => { e.stopPropagation(); removeFavorite(market.symbol); }}
                        className="text-gray-400 hover:text-red transition text-sm"
                      >✕</button>
                    </div>
                  </div>

                  {/* Expanded signal details */}
                  {signal && !signal.error && signal.direction !== 'WAIT' && (
                    <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center">
                        <p className="text-gray-500">Entry</p>
                        <p className="font-mono font-bold text-green">${fmtPrice(signal.entry)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">S/L</p>
                        <p className="font-mono font-bold text-red">${fmtPrice(signal.sl)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">T/P</p>
                        <p className="font-mono font-bold text-green">${fmtPrice(signal.tp1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">R:R</p>
                        <p className="font-mono font-bold text-yellow">
                          {typeof signal.rr === 'number' ? signal.rr.toFixed(2) : signal.rr || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* WAIT signal with reason */}
                  {signal && !signal.error && signal.direction === 'WAIT' && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-xs text-gray-500 text-center">
                        ⏸ No clear setup — {signal.reason || 'wait for better confluence'}
                      </p>
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

// ─── Helpers ────────────────────────────────────────────────
function getSymbolIcon(symbol) {
  const icons = {
    BTCUSDT: '₿', ETHUSDT: 'Ξ', BNBUSDT: 'B', SOLUSDT: '◎',
    XRPUSDT: 'X', ADAUSDT: 'A', DOGEUSDT: 'Ð',
    EURUSD: '€', GBPUSD: '£', USDJPY: '¥', AUDUSD: 'A$',
    USDCHF: 'Fr', NZDUSD: 'NZ', USDCAD: 'C$',
    XAUUSD: '🥇', XAGUSD: '🥈'
  };
  return icons[symbol] || '○';
}

function fmtPrice(price) {
  if (price == null || isNaN(price)) return '—';
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)    return price.toFixed(4);
  return price.toFixed(6);
}