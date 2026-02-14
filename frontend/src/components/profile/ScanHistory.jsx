import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Filter, Download, Eye } from 'lucide-react';

export default function ScanHistory({ user, subscriptionData }) {
  const [filterType, setFilterType] = useState('all');
  const [filterPair, setFilterPair] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [page, setPage] = useState(1);
  
  const [allScans, setAllScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch signal history from backend
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/history/signals?limit=100&page=1', {
          credentials: 'include'
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch history');
        }

        // Transform Activity records to scan format
        const scans = (data.data?.activities || []).map(activity => {
          const signalData = activity.signalData || {};
          return {
            id: activity._id,
            pair: signalData.symbol || 'N/A',
            date: new Date(activity.createdAt),
            signal: signalData.direction || 'WAIT',
            confidence: signalData.confidence || 0,
            entry: signalData.entry || null,
            stopLoss: signalData.sl || null,
            takeProfit: signalData.tp || null,
            result: 'PENDING', // Default - would need to be tracked separately
            description: activity.description
          };
        });

        setAllScans(scans);
        setError('');
      } catch (err) {
        console.error('History fetch error:', err);
        setError('Failed to load signal history');
        setAllScans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Apply filters
  const getFilteredScans = () => {
    return allScans.filter(scan => {
      // Filter by signal type
      if (filterType !== 'all' && scan.signal !== filterType) return false;
      
      // Filter by trading pair
      if (filterPair !== 'all' && scan.pair !== filterPair) return false;
      
      // Filter by date range
      if (dateRange !== 'all') {
        const now = new Date();
        const scanDate = new Date(scan.date);
        
        if (dateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (scanDate < weekAgo) return false;
        } else if (dateRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (scanDate < monthAgo) return false;
        }
      }
      
      return true;
    });
  };

  const filteredScans = getFilteredScans();
  const uniquePairs = ['all', ...new Set(allScans.map(s => s.pair).filter(Boolean))];

  // Calculate statistics
  const calculateStats = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const thisWeekScans = allScans.filter(s => new Date(s.date) >= weekAgo);
    const totalScans = allScans.length;
    
    // Win rate (approximation - would need result tracking)
    const wins = filteredScans.filter(s => s.result === 'WIN').length;
    const losses = filteredScans.filter(s => s.result === 'LOSS').length;
    const total = wins + losses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : '0.00';
    
    return {
      totalScans,
      thisWeek: thisWeekScans.length,
      winRate: total > 0 ? `${winRate}%` : 'N/A',
      avgRR: '1.85:1', // Would need to calculate from actual data
    };
  };

  const stats = calculateStats();

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

        {/* Desktop Column Headers */}
        <div className="hidden md:grid md:grid-cols-8 md:gap-4 mb-4 px-4 text-xs text-gray-500 font-medium uppercase tracking-wide">
          <div>Pair</div>
          <div>Signal</div>
          <div>Confidence</div>
          <div className="text-right">Entry</div>
          <div className="text-right">Stop Loss</div>
          <div className="text-right">Take Profit</div>
          <div className="text-center">Result</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-400">Loading signal history...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
            <p>{error}</p>
          </div>
        )}

        {/* Scan Items */}
        {!loading && !error && (
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
                          {new Date(scan.date).toLocaleDateString('en-US', {
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
                          <span className="text-white font-mono">{scan.stopLoss?.toLocaleString() || '—'}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>TP</span>
                          <span className="text-white font-mono">{scan.takeProfit?.toLocaleString() || '—'}</span>
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
                        {new Date(scan.date).toLocaleDateString('en-US', {
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
                <p className="text-gray-400">
                  {allScans.length === 0 
                    ? 'No signal history yet. Start generating signals to see them here.' 
                    : 'No scans match your filters'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
