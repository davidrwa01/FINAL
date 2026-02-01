# 🔧 Integration Guide: Adding Your Original Trading Logic

This guide shows you how to integrate your existing Smart-KORAFX trading logic into the React frontend.

## 📝 Overview

Your original `index.html` contains ~3810 lines of trading logic including:
- Signal generation algorithms
- SMC (Smart Money Concepts) analysis
- Chart rendering with Chart.js
- OCR text extraction from images
- Support/resistance calculations
- Timeframe selection
- Symbol management

All this logic can be preserved and integrated into the React app!

## 🎯 Step-by-Step Integration

### Step 1: Extract Core Logic Functions

From your original HTML, identify these core functions:

```javascript
// Market Analysis
function analyzeMarket(data, timeframe) { ... }
function calculateSMC(data) { ... }
function detectStructure(highs, lows) { ... }
function calculateRSI(prices, period) { ... }
function calculateEMA(prices, period) { ... }

// Signal Generation
function generateBuySignal(analysis) { ... }
function generateSellSignal(analysis) { ... }
function calculateTargets(entry, direction, support, resistance) { ... }

// OCR & Image Processing
function extractChartData(imageFile) { ... }
function processOCRResult(text) { ... }

// Display
function displaySignal(signal) { ... }
function renderChart(data) { ... }
```

### Step 2: Create Utility Files

Create `src/utils/` folder:

```
src/utils/
├── marketAnalysis.js      # Core analysis functions
├── indicators.js          # RSI, EMA, etc.
├── smcCalculations.js     # SMC-specific logic
├── ocrProcessor.js        # OCR handling
└── chartRenderer.js       # Chart.js integration
```

**Example: `src/utils/marketAnalysis.js`**

```javascript
// Copy your original functions here
export function analyzeMarket(data, timeframe) {
  // Your original logic
  const smc = calculateSMC(data);
  const rsi = calculateRSI(data.closes, 14);
  const ema20 = calculateEMA(data.closes, 20);
  
  // ... rest of analysis
  
  return {
    signal: determineSignal(smc, rsi, ema20),
    confidence: calculateConfidence(...),
    entry: data.closes[data.closes.length - 1],
    // ... etc
  };
}

export function calculateSMC(data) {
  // Your SMC logic
  // ...
}

// Export all your functions
```

### Step 3: Update TradingDashboard Component

Replace the placeholder in `src/pages/TradingDashboard.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signalService } from '../services/api';
import { analyzeMarket, calculateSMC } from '../utils/marketAnalysis';
import Chart from 'react-chartjs-2';

function TradingInterface({ onSignalGeneration, subscriptionStatus }) {
  // State management
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('H4');
  const [chartData, setChartData] = useState(null);
  const [currentSignal, setCurrentSignal] = useState(null);
  const [loading, setLoading] = useState(false);

  // Your original symbol list
  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', /* ... */];
  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

  // Generate signal function
  const handleGenerateSignal = async () => {
    // Protection layer - check access before generating
    const allowed = await onSignalGeneration({
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      signalType: 'ANALYSIS'
    });
    
    if (!allowed) {
      // Trial limit exceeded - user redirected automatically
      return;
    }

    setLoading(true);
    
    try {
      // Fetch market data (your original logic)
      const data = await fetchMarketData(selectedSymbol, selectedTimeframe);
      
      // Run your analysis (your original functions)
      const analysis = analyzeMarket(data, selectedTimeframe);
      
      // Display signal
      setCurrentSignal(analysis);
      
      // Update chart
      setChartData(prepareChartData(data));
      
    } catch (error) {
      console.error('Signal generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Your original OCR handler
  const handleImageUpload = async (file) => {
    const allowed = await onSignalGeneration({
      symbol: 'OCR_SCAN',
      timeframe: 'N/A',
      signalType: 'OCR_ANALYSIS'
    });
    
    if (!allowed) return;

    setLoading(true);
    
    try {
      // Your original OCR logic
      const extractedData = await extractChartData(file);
      const analysis = analyzeMarket(extractedData, 'AUTO');
      setCurrentSignal(analysis);
    } catch (error) {
      console.error('OCR failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Symbol & Timeframe Selection */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-yellow mb-2">Symbol</label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="w-full px-4 py-3 bg-black-lighter border border-gray-700 text-white rounded-lg"
          >
            {symbols.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-yellow mb-2">Timeframe</label>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="w-full px-4 py-3 bg-black-lighter border border-gray-700 text-white rounded-lg"
          >
            {timeframes.map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Generate Signal Button */}
      <button
        onClick={handleGenerateSignal}
        disabled={loading}
        className="w-full py-4 bg-yellow text-black font-bold rounded-lg hover:bg-yellow-dark transition disabled:opacity-50"
      >
        {loading ? 'Analyzing...' : '🎯 Generate Signal'}
      </button>

      {/* OCR Upload */}
      <div className="upload-zone p-8 rounded-lg text-center">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e.target.files[0])}
          className="hidden"
          id="chart-upload"
        />
        <label htmlFor="chart-upload" className="cursor-pointer">
          <div className="text-yellow text-2xl mb-2">📸</div>
          <p className="text-gray-400">Upload Chart Screenshot for Analysis</p>
        </label>
      </div>

      {/* Display Signal */}
      {currentSignal && (
        <SignalDisplay signal={currentSignal} />
      )}

      {/* Chart */}
      {chartData && (
        <div className="bg-black-lighter rounded-lg p-6">
          <Chart type="line" data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}

// Signal display component
function SignalDisplay({ signal }) {
  const directionColor = signal.direction === 'BUY' ? 'text-green' : 
                         signal.direction === 'SELL' ? 'text-red' : 'text-gray-400';
  
  return (
    <div className={`signal-card rounded-xl p-6 ${signal.direction.toLowerCase()}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-2xl font-bold ${directionColor}`}>
          {signal.direction}
        </h3>
        <div className="text-3xl font-bold text-yellow">
          {signal.confidence}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black rounded p-3">
          <p className="text-xs text-gray-400">Entry</p>
          <p className="text-lg font-bold text-yellow font-mono">
            {signal.entry.toFixed(5)}
          </p>
        </div>
        <div className="bg-black rounded p-3">
          <p className="text-xs text-gray-400">Stop Loss</p>
          <p className="text-lg font-bold text-red font-mono">
            {signal.sl.toFixed(5)}
          </p>
        </div>
        <div className="bg-black rounded p-3">
          <p className="text-xs text-gray-400">TP 1</p>
          <p className="text-lg font-bold text-green font-mono">
            {signal.tp1.toFixed(5)}
          </p>
        </div>
        <div className="bg-black rounded p-3">
          <p className="text-xs text-gray-400">R:R Ratio</p>
          <p className="text-lg font-bold text-yellow font-mono">
            1:{signal.rr}
          </p>
        </div>
      </div>

      {/* SMC Analysis */}
      {signal.smc && (
        <div className="bg-black rounded-lg p-4">
          <h4 className="text-yellow font-semibold text-sm mb-3">
            🎯 SMC ANALYSIS
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Market Bias:</span>
              <span className="text-yellow font-bold ml-2">
                {signal.smc.marketBias}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Structure:</span>
              <span className="text-yellow font-semibold ml-2">
                {signal.smc.structure}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 4: Add Chart.js Integration

Install Chart.js:
```bash
npm install react-chartjs-2 chart.js
```

Create `src/components/TradingChart.jsx`:

```javascript
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function TradingChart({ data, signals }) {
  const chartData = {
    labels: data.timestamps,
    datasets: [
      {
        label: 'Price',
        data: data.closes,
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
      },
      // Add more datasets for indicators
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#FFFFFF',
        },
      },
    },
    scales: {
      y: {
        ticks: { color: '#888888' },
        grid: { color: '#252525' },
      },
      x: {
        ticks: { color: '#888888' },
        grid: { color: '#252525' },
      },
    },
  };

  return (
    <div className="h-96">
      <Line data={chartData} options={options} />
    </div>
  );
}
```

### Step 5: Add Tesseract.js for OCR

Your original code uses Tesseract.js. It's already in package.json!

Create `src/utils/ocrProcessor.js`:

```javascript
import Tesseract from 'tesseract.js';

export async function extractTextFromImage(imageFile) {
  try {
    const result = await Tesseract.recognize(
      imageFile,
      'eng',
      {
        logger: info => console.log(info),
      }
    );
    
    return result.data.text;
  } catch (error) {
    console.error('OCR failed:', error);
    throw error;
  }
}

export function parseChartData(ocrText) {
  // Your original parsing logic
  const numbers = ocrText.match(/\d+\.?\d*/g);
  // ... etc
  return parsedData;
}
```

## ✅ Checklist

- [ ] Extract all functions from original HTML
- [ ] Create utility files in `src/utils/`
- [ ] Update `TradingDashboard.jsx` with your logic
- [ ] Add `onSignalGeneration()` before each signal
- [ ] Test with free trial (2 signals)
- [ ] Test subscription flow
- [ ] Verify all features work

## 🎨 Styling Notes

All your original CSS classes are available:
- `bg-black`, `bg-black-light`, `bg-black-lighter`
- `text-yellow`, `text-green`, `text-red`
- `glow-yellow`, `glow-green`, `glow-red`
- `signal-card`, `upload-zone`
- `font-mono` for monospace numbers

## 📞 Need Help?

If you get stuck:
1. Check browser console for errors
2. Verify API calls in Network tab
3. Test backend endpoints directly
4. Check that protection layer is working

Your original logic is 100% compatible - just needs to be wrapped in React components with the protection layer!
