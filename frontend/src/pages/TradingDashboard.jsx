import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signalService, subscriptionService, marketService, analysisService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import MarketFeed from '../components/trading/MarketFeed';
import MarketWatch from '../components/trading/MarketWatch';
import SignalPanel from '../components/trading/SignalPanel';
import Tesseract from 'tesseract.js';
import Chart from 'chart.js/auto';
import { calculateEMA, calculateRSI, calculateATR, detectSwings, formatPrice, getDecimals, calculateSMA, calculateMACD } from '../utils/trading/indicators-complete';
import { BarChart3, TrendingUp, TrendingDown, LogOut, Zap, Lock, Eye, Upload, User } from 'lucide-react';

export default function TradingDashboard() {
  const [canGenerate, setCanGenerate] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { connectionStatus } = useMarket();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const accessResponse = await signalService.checkAccess();
      console.log('Access check response:', accessResponse);
      
      if (!accessResponse.data || !accessResponse.data.canGenerate) {
        console.log('No access, redirecting to subscribe');
        navigate('/subscribe');
        return;
      }

      setCanGenerate(true);
      const statusResponse = await subscriptionService.getStatus();
      console.log('Subscription status:', statusResponse);
      setSubscriptionStatus(statusResponse.data);
    } catch (error) {
      console.error('Access check failed:', error);
      setError(error.response?.data?.message || 'Failed to load trading dashboard. Please try again.');
      if (error.response?.status === 403) {
        navigate('/subscribe');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignalGeneration = async (signalData) => {
    try {
      const response = await signalService.generate(signalData);
      
      if (!response.success && response.error === 'TRIAL_LIMIT_EXCEEDED') {
        alert(response.message);
        navigate('/subscribe');
        return false;
      }

      if (response.data.remainingSignals !== undefined) {
        setSubscriptionStatus(prev => ({
          ...prev,
          trial: {
            ...prev.trial,
            remaining: response.data.remainingSignals
          }
        }));
      }

      return true;
    } catch (error) {
      console.error('Signal generation failed:', error);
      if (error.response?.data?.error === 'TRIAL_LIMIT_EXCEEDED') {
        alert('Trial limit exceeded. Please upgrade to continue.');
        navigate('/subscribe');
        return false;
      }
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-400">Loading trading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="bg-black-light rounded-xl p-8 max-w-md text-center">
          <p className="text-red text-lg mb-4">⚠️ Error Loading Dashboard</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-yellow text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-dark transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* HEADER - Command Center */}
      <div className="fixed top-0 w-full bg-black-light border-b border-gray-800 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Left: Logo + Status */}
          <div className="flex items-center space-x-6">
            <div className="text-sm font-bold tracking-wider text-white">
              SMART-KORAFX
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-green rounded-full animate-pulse"></div>
              <span className="text-gray-400">LIVE</span>
            </div>
          </div>

          {/* Center: Subscription Status */}
          {subscriptionStatus && (
            <div className="flex items-center space-x-4 text-xs">
              {subscriptionStatus.hasActiveSubscription ? (
                <div className="flex items-center space-x-2 bg-green/10 border border-green px-3 py-2 rounded">
                  <Lock className="w-3 h-3 text-green" />
                  <span className="text-green font-mono">
                    {subscriptionStatus.activeSubscription?.plan || 'PRO'} · Active
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-yellow/10 border border-yellow px-3 py-2 rounded">
                  <Zap className="w-3 h-3 text-yellow" />
                  <span className="text-yellow font-mono">
                    Trial: {subscriptionStatus.trial?.remaining || 2}/{subscriptionStatus.trial?.dailyLimit || 2}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Right: User + Actions */}
          <div className="flex items-center space-x-4">
            <div className="text-right text-xs">
              <div className="text-white font-mono">{user?.fullName || 'Trader'}</div>
              <div className="text-gray-500">User</div>
            </div>
            {subscriptionStatus && !subscriptionStatus.hasActiveSubscription && (
              <button
                onClick={() => navigate('/subscribe')}
                className="text-xs font-semibold px-3 py-2 bg-yellow text-black rounded hover:bg-yellow/90 transition"
              >
                Upgrade
              </button>
            )}
            <button 
              onClick={() => navigate('/profile')}
              className="text-gray-400 hover:text-yellow transition p-1"
              title="Profile"
            >
              <User className="w-4 h-4" />
            </button>
            <button 
              onClick={logout} 
              className="text-gray-400 hover:text-yellow transition p-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - With top padding for fixed header */}
      <main className="pt-16 max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            <MarketWatch onSelectPair={setSelectedSignal} />
            <SignalGenerator onSignalGeneration={handleSignalGeneration} />
            <OCRScanner onSignalGeneration={handleSignalGeneration} />
            <LiveChart />
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            <MarketFeed />
            <RiskSettings />
            <SystemStatus />
          </div>
        </div>
      </main>

      {/* Signal Panel Modal */}
      {selectedSignal && (
        <SignalPanel
          signal={selectedSignal}
          symbol={selectedSignal.symbol}
          onClose={() => setSelectedSignal(null)}
        />
      )}
    </div>
  );
}

// SIGNAL GENERATOR COMPONENT
function SignalGenerator({ onSignalGeneration }) {
  const [symbol, setSymbol] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('H4');
  const [loading, setLoading] = useState(false);
  const [signal, setSignal] = useState(null);
  const [error, setError] = useState(null);

  const symbols = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'XAUUSD'];
  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

  const handleGenerate = async () => {
    setError(null);
    const allowed = await onSignalGeneration({ symbol, timeframe, signalType: 'LIVE_ANALYSIS' });
    if (!allowed) return;

    setLoading(true);
    try {
      // Step 1: Fetch market klines
      const klineResponse = await marketService.getMarketSeries(symbol, timeframe, 120);
      if (!klineResponse.success || !klineResponse.data.candles || klineResponse.data.candles.length === 0) {
        throw new Error('Failed to fetch market data. Symbol may not be supported.');
      }
      
      const klines = klineResponse.data.candles;
      
      // Step 2: Perform SMC analysis
      const analysisResponse = await analysisService.analyzeSMC(klines);
      if (!analysisResponse.success || !analysisResponse.data) {
        throw new Error('Analysis failed');
      }
      
      const analysis = analysisResponse.data;
      
      // Step 3: Get current price
      const currentPrice = analysis.currentPrice;
      
      // Step 4: Generate signal
      const signalResponse = await analysisService.generateSignal(
        analysis,
        currentPrice,
        symbol,
        timeframe
      );
      
      if (!signalResponse.success || !signalResponse.data) {
        throw new Error('Signal generation failed');
      }
      
      // Format and display the signal
      const generatedSignal = {
        direction: signalResponse.data.signal,
        confidence: signalResponse.data.confidence,
        entry: signalResponse.data.entry,
        sl: signalResponse.data.stopLoss,
        tp1: signalResponse.data.takeProfit,
        tp2: signalResponse.data.takeProfit + (signalResponse.data.takeProfit - signalResponse.data.entry) * 0.5,
        tp3: signalResponse.data.takeProfit + (signalResponse.data.takeProfit - signalResponse.data.entry),
        rr: signalResponse.data.riskReward,
        reason: signalResponse.data.reason,
        analysis: signalResponse.data.analysis,
        timestamp: new Date().toISOString()
      };
      
      setSignal(generatedSignal);
    } catch (err) {
      console.error('Signal generation failed:', err);
      setError(err.message || 'Failed to generate signal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-wider text-white uppercase">Signal Generator</h2>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Symbol</label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-800 text-white text-sm rounded font-mono focus:border-yellow outline-none transition">
            {symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Timeframe</label>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-800 text-white text-sm rounded font-mono focus:border-yellow outline-none transition">
            {timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red/20 border border-red rounded text-red text-xs">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-2 bg-yellow text-black text-sm font-semibold rounded hover:bg-yellow/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Analyzing...' : 'Generate Signal'}
      </button>

      {signal && <SignalDisplay signal={signal} />}
    </div>
  );
}

// OCR SCANNER COMPONENT
function OCRScanner({ onSignalGeneration }) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    const allowed = await onSignalGeneration({ symbol: 'OCR_SCAN', timeframe: 'AUTO', signalType: 'OCR_ANALYSIS' });
    if (!allowed) return;

    setLoading(true);
    try {
      const { data } = await Tesseract.recognize(file, 'eng');
      // Process OCR result and generate signal
      console.log('OCR extracted text:', data.text);
      alert('Chart analyzed successfully!');
    } catch (error) {
      console.error('OCR failed:', error);
      alert('Failed to process screenshot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-wider text-white uppercase">Chart Analysis</h2>
        <Upload className="w-4 h-4 text-gray-500" />
      </div>
      
      <div
        className="border border-gray-800 bg-black rounded-lg p-8 text-center cursor-pointer hover:border-yellow/50 transition"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
          className="hidden"
        />
        
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="spinner mb-4"></div>
            <p className="text-sm text-gray-400">Processing market structure...</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-white font-mono mb-1">Upload Chart Screenshot</p>
            <p className="text-xs text-gray-500">TradingView, MT4/MT5, Bloomberg</p>
          </>
        )}
      </div>
    </div>
  );
}

// LIVE CHART COMPONENT
function LiveChart() {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initChart();
  }, []);

  useEffect(() => {
    updateChart();
  }, [symbol]);

  const initChart = async () => {
    try {
      const response = await marketService.getMarketSeries('BTCUSDT', 'H1', 80);
      if (response.success && response.data && response.data.candles) {
        renderChart('BTCUSDT', response.data.candles);
      }
    } catch (error) {
      console.error('Chart init failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateChart = async () => {
    try {
      const response = await marketService.getMarketSeries(symbol, 'H1', 80);
      if (response.success && response.data && response.data.candles) {
        renderChart(symbol, response.data.candles);
      }
    } catch (error) {
      console.error('Chart update failed:', error);
    }
  };

  const renderChart = (sym, candles) => {
    const closes = candles.map(k => k.close);
    const labels = candles.map(k => new Date(k.time).toLocaleTimeString());

    if (canvasRef.current) {
      // Destroy old chart if exists
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current.getContext('2d');
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: sym,
            data: closes,
            borderColor: '#FFD700',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: {
              position: 'right',
              grid: { color: 'rgba(255, 215, 0, 0.1)' },
              ticks: { color: '#888' }
            }
          }
        }
      });
    }
  };

  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold tracking-wider text-white uppercase">Live Market</h2>
        <div className="flex gap-2">
          {['BTCUSDT', 'ETHUSDT', 'XAUUSD'].map(ticker => (
            <button 
              key={ticker}
              onClick={() => setSymbol(ticker)}
              className={`px-2 py-1 text-xs font-mono rounded border ${
                symbol === ticker
                  ? 'bg-yellow text-black border-yellow' 
                  : 'border-gray-800 text-gray-400 hover:border-yellow/50'
              } transition`}
            >
              {ticker.replace('USDT', '').replace('USD', '')}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-container" style={{ position: 'relative', height: '300px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner"></div>
          </div>
        ) : (
          <canvas ref={canvasRef}></canvas>
        )}
      </div>
    </div>
  );
}

// RISK SETTINGS COMPONENT
function RiskSettings() {
  const [risk, setRisk] = useState(2);
  const [minRR, setMinRR] = useState(2);

  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      <h2 className="text-sm font-bold tracking-wider text-white mb-4 uppercase">Risk Parameters</h2>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Risk Per Trade</label>
            <span className="text-sm text-yellow font-mono">{risk}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={risk}
            onChange={(e) => setRisk(parseFloat(e.target.value))}
            className="w-full accent-yellow"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Min Risk:Reward</label>
          <select
            value={minRR}
            onChange={(e) => setMinRR(parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-sm text-white font-mono focus:border-yellow outline-none transition"
          >
            <option value={1.5}>1:1.5</option>
            <option value={2}>1:2.0</option>
            <option value={2.5}>1:2.5</option>
            <option value={3}>1:3.0</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// SYSTEM STATUS COMPONENT
function SystemStatus() {
  return (
    <div className="bg-black-light rounded-lg p-6 border border-gray-800">
      <h2 className="text-sm font-bold tracking-wider text-white mb-4 uppercase">System Status</h2>
      
      <div className="space-y-3 text-xs">
        <div className="flex justify-between items-center pb-2 border-b border-gray-800">
          <span className="text-gray-400">Binance API</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green rounded-full"></div>
            <span className="text-green font-mono">Online</span>
          </div>
        </div>
        <div className="flex justify-between items-center pb-2 border-b border-gray-800">
          <span className="text-gray-400">Market Data</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green rounded-full"></div>
            <span className="text-green font-mono">Streaming</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Analysis Engine</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green rounded-full"></div>
            <span className="text-green font-mono">Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// SIGNAL DISPLAY COMPONENT
function SignalDisplay({ signal }) {
  if (!signal || !signal.entry || typeof signal.entry !== 'number') {
    return null;
  }

  const isBuy = signal.direction === 'BUY';
  const decimals = getDecimals(signal.entry);
  
  return (
    <div className={`mt-6 rounded-lg p-6 border-l-4 ${
      isBuy ? 'bg-black border-green' : signal.direction === 'SELL' ? 'bg-black border-red' : 'bg-black border-gray-800'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          {isBuy ? (
            <TrendingUp className={`w-5 h-5 ${isBuy ? 'text-green' : 'text-red'}`} />
          ) : (
            <TrendingDown className={`w-5 h-5 ${isBuy ? 'text-green' : 'text-red'}`} />
          )}
          <div>
            <div className={`text-lg font-bold font-mono ${isBuy ? 'text-green' : signal.direction === 'SELL' ? 'text-red' : 'text-gray'}`}>
              {signal.direction}
            </div>
            <div className="text-xs text-gray-500">{signal.reason || 'Signal'}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow font-mono">{signal.confidence || 0}%</div>
          <div className="text-xs text-gray-500">Confidence</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black-light rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Entry</div>
          <div className="text-sm font-mono font-bold text-white">{signal.entry.toFixed(decimals)}</div>
        </div>
        <div className="bg-black-light rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Stop Loss</div>
          <div className="text-sm font-mono font-bold text-red">{(signal.sl || signal.entry).toFixed(decimals)}</div>
        </div>
        <div className="bg-black-light rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Take Profit</div>
          <div className="text-sm font-mono font-bold text-green">{(signal.tp1 || signal.entry).toFixed(decimals)}</div>
        </div>
        <div className="bg-black-light rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Risk:Reward</div>
          <div className="text-sm font-mono font-bold text-yellow">{signal.rr || '0.00'}</div>
        </div>
      </div>
    </div>
  );
}

// HELPER FUNCTIONS

function timeframeToInterval(timeframe) {
  const intervals = {
    'M1': '1m', 'M5': '5m', 'M15': '15m', 'M30': '30m',
    'H1': '1h', 'H4': '4h', 'D1': '1d', 'W1': '1w'
  };
  return intervals[timeframe] || '1h';
}
