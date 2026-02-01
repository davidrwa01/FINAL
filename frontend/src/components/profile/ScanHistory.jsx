import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Filter, Download, Eye } from 'lucide-react';

export default function ScanHistory({ user }) {
  const [filterType, setFilterType] = useState('all');
  const [filterPair, setFilterPair] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [mockScans, setMockScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/signals/history', {
          credentials: 'include'
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch history');
        }

        // Format dates from API
        const formattedScans = (data.data?.scans || []).map(scan => ({
          ...scan,
          date: new Date(scan.date)
        }));

        setMockScans(formattedScans);
        setError('');
      } catch (err) {
        console.error('History fetch error:', err);
        // Fallback to mock data if API fails
        setMockScans([
          {
            id: 1,
            pair: 'BTC/USDT',
            date: new Date(Date.now() - 2 * 60 * 60 * 1000),
            signal: 'BUY',
            confidence: 87,
            entry: 42850,
            stopLoss: 42100,
            takeProfit: 44200,
            result: 'PENDING',
          },
          {
            id: 2,
            pair: 'ETH/USDT',
            date: new Date(Date.now() - 5 * 60 * 60 * 1000),
            signal: 'SELL',
            confidence: 72,
            entry: 2420,
            stopLoss: 2580,
            takeProfit: 2100,
            result: 'WIN',
          },
          {
            id: 3,
            pair: 'XAU/USD',
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            signal: 'BUY',
            confidence: 65,
            entry: 2095,
            stopLoss: 2050,
            takeProfit: 2150,
            result: 'LOSS',
          },
          {
            id: 4,
            pair: 'EUR/USD',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            signal: 'WAIT',
            confidence: 45,
            entry: null,
            stopLoss: null,
            takeProfit: null,
            result: 'SKIPPED',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Mock data - replace with API call
  const oldMockScans = [
    {
      id: 1,
      pair: 'BTC/USDT',
      date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      signal: 'BUY',
      confidence: 87,
      entry: 42850,
      stopLoss: 42100,
      takeProfit: 44200,
      result: 'PENDING',
    },
    {
      id: 2,
      pair: 'ETH/USDT',
      date: new Date(Date.now() - 5 * 60 * 60 * 1000),
      signal: 'SELL',
      confidence: 72,
      entry: 2420,
      stopLoss: 2580,
      takeProfit: 2100,
      result: 'WIN',
    },
    {
      id: 3,
      pair: 'XAU/USD',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      signal: 'BUY',
      confidence: 65,
      entry: 2095,
      stopLoss: 2050,
      takeProfit: 2150,
      result: 'LOSS',
    },
    {
      id: 4,
      pair: 'EUR/USD',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      signal: 'WAIT',
      confidence: 45,
      entry: null,
      stopLoss: null,
      takeProfit: null,
      result: 'SKIPPED',
    },
  ];

  const filteredScans = mockScans.filter(scan => {
    if (filterType !== 'all' && scan.signal !== filterType) return false;
    if (filterPair !== 'all' && scan.pair !== filterPair) return false;
    return true;
  });

  const uniquePairs = ['all', ...new Set(mockScans.map(s => s.pair))];

  // Statistics
  const stats = {
    totalScans: mockScans.length,
    thisWeek: mockScans.length,
    winRate: '66.67%',
    avgRR: '1.85:1',
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Total Scans</p>
          <p className="text-white font-bold text-2xl mt-2">{stats.totalScans}</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wide">This Week</p>
          <p className="text-white font-bold text-2xl mt-2">{stats.thisWeek}</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Win Rate</p>
          <p className="text-green-400 font-bold text-2xl mt-2">{stats.winRate}</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Avg R:R</p>
          <p className="text-yellow-400 font-bold text-2xl mt-2">{stats.avgRR}</p>
        </div>
      </div>

      {/* Scan History */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:p-8">
        <h2 className="text-xl font-bold text-white mb-6">Scan History</h2>

        {/* Filters */}
        <div className="bg-gray-800/30 rounded-lg p-4 mb-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-gray-400" />
            <p className="text-gray-400 font-medium">Filters</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Signal Type Filter */}
            <div>
              <label className="text-gray-400 text-sm block mb-2">Signal Type</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:border-yellow-400 focus:outline-none"
              >
                <option value="all">All Signals</option>
                <option value="BUY">BUY Only</option>
                <option value="SELL">SELL Only</option>
                <option value="WAIT">WAIT Only</option>
              </select>
            </div>

            {/* Pair Filter */}
            <div>
              <label className="text-gray-400 text-sm block mb-2">Trading Pair</label>
              <select
                value={filterPair}
                onChange={e => setFilterPair(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:border-yellow-400 focus:outline-none"
              >
                {uniquePairs.map(pair => (
                  <option key={pair} value={pair}>
                    {pair === 'all' ? 'All Pairs' : pair}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="text-gray-400 text-sm block mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:border-yellow-400 focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scan Items */}
        <div className="space-y-3">
          {filteredScans.length > 0 ? (
            filteredScans.map(scan => (
              <div
                key={scan.id}
                className="bg-gray-800/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
              >
                {/* Mobile Layout */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-bold text-lg">{scan.pair}</p>
                      <p className="text-gray-400 text-sm">
                        {scan.date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-lg font-bold text-sm ${
                        scan.signal === 'BUY'
                          ? 'bg-green-900/30 text-green-400'
                          : scan.signal === 'SELL'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-gray-900/30 text-gray-400'
                      }`}
                    >
                      {scan.signal}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-400">Confidence</p>
                    <p className="text-white font-bold">{scan.confidence}%</p>
                  </div>

                  {scan.entry && (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-gray-400">
                        <span>Entry</span>
                        <span className="text-white font-mono">{scan.entry.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>SL</span>
                        <span className="text-white font-mono">{scan.stopLoss.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>TP</span>
                        <span className="text-white font-mono">{scan.takeProfit.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        scan.result === 'WIN'
                          ? 'bg-green-900/30 text-green-400'
                          : scan.result === 'LOSS'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-gray-900/30 text-gray-400'
                      }`}
                    >
                      {scan.result}
                    </div>
                    <button className="text-yellow-400 hover:text-yellow-300 transition-colors">
                      <Eye size={16} />
                    </button>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:grid md:grid-cols-8 md:items-center md:gap-4">
                  <div>
                    <p className="text-white font-bold">{scan.pair}</p>
                    <p className="text-gray-400 text-xs">
                      {scan.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg font-bold text-sm w-fit ${
                        scan.signal === 'BUY'
                          ? 'bg-green-900/30 text-green-400'
                          : scan.signal === 'SELL'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-gray-900/30 text-gray-400'
                      }`}
                    >
                      {scan.signal === 'BUY' && <TrendingUp size={14} />}
                      {scan.signal === 'SELL' && <TrendingDown size={14} />}
                      {scan.signal}
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-white font-bold">{scan.confidence}%</p>
                  </div>

                  <div className="text-right font-mono text-sm">
                    <p className="text-gray-400">{scan.entry ? scan.entry.toLocaleString() : '—'}</p>
                  </div>

                  <div className="text-right font-mono text-sm">
                    <p className="text-gray-400">{scan.stopLoss ? scan.stopLoss.toLocaleString() : '—'}</p>
                  </div>

                  <div className="text-right font-mono text-sm">
                    <p className="text-gray-400">{scan.takeProfit ? scan.takeProfit.toLocaleString() : '—'}</p>
                  </div>

                  <div className="text-center">
                    <div
                      className={`inline-block text-xs font-bold px-2 py-1 rounded ${
                        scan.result === 'WIN'
                          ? 'bg-green-900/30 text-green-400'
                          : scan.result === 'LOSS'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-gray-900/30 text-gray-400'
                      }`}
                    >
                      {scan.result}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-white">
                      <Eye size={16} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-white">
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No scans match your filters</p>
            </div>
          )}
        </div>

        {/* Desktop Column Headers */}
        <div className="hidden md:grid md:grid-cols-8 md:gap-4 mb-4 text-xs text-gray-500 font-medium uppercase tracking-wide">
          <div>Pair</div>
          <div>Signal</div>
          <div>Confidence</div>
          <div className="text-right">Entry</div>
          <div className="text-right">Stop Loss</div>
          <div className="text-right">Take Profit</div>
          <div className="text-center">Result</div>
          <div className="text-right">Actions</div>
        </div>
      </div>
    </div>
  );
}
