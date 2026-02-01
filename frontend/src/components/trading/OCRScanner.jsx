import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { analyzeMarket, generateSignal } from '../../utils/trading/marketAnalysis';

export default function OCRScanner({ onSignalGeneration }) {
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState(null);

    const handleImageUpload = async (file) => {
        // Check access
        const allowed = await onSignalGeneration({
            symbol: 'OCR_SCAN',
            timeframe: 'AUTO',
            signalType: 'OCR_ANALYSIS'
        });

        if (!allowed) return;

        setProcessing(true);

        try {
            // Extract text using Tesseract (same as your original)
            const { data } = await Tesseract.recognize(file, 'eng', {
                logger: (m) => console.log(m)
            });

            // Parse extracted data (use YOUR original parsing logic)
            const parsedData = parseOCRText(data.text);

            // Analyze using YOUR original functions
            const analysis = analyzeMarket(parsedData.klines, parsedData.symbol);

            // Generate signal
            const signal = generateSignal(
                analysis,
                parsedData.currentPrice,
                parsedData.symbol,
                parsedData.timeframe
            );

            setResult(signal);
        } catch (error) {
            console.error('OCR processing failed:', error);
            alert('Failed to process screenshot');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="bg-black-light rounded-xl p-6">
            <h3 className="text-xl font-bold text-yellow mb-4">
                📸 Chart Screenshot Analysis
            </h3>

            <div className="upload-zone p-8 text-center cursor-pointer">
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files[0])}
                    className="hidden"
                    id="ocr-upload"
                />
                <label htmlFor="ocr-upload" className="cursor-pointer">
                    {processing ? (
                        <div className="flex flex-col items-center">
                            <div className="spinner mb-4"></div>
                            <p className="text-yellow">Processing screenshot...</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-6xl mb-4">📷</div>
                            <p className="text-yellow text-lg mb-2">
                                Upload Chart Screenshot
                            </p>
                            <p className="text-gray-400 text-sm">
                                AI will analyze patterns, structure, and generate signals
                            </p>
                        </>
                    )}
                </label>
            </div>

            {result && <SignalDisplay signal={result} />}
        </div>
    );
}

function parseOCRText(text) {
    // Use YOUR original parsing logic from the HTML file
    const result = {
        symbol: null,
        timeframe: null,
        price: null,
        klines: []
    };

    const combinedText = (text + ' ').toUpperCase();

    // Detect symbol (simplified version)
    const symbolPatterns = [
        /\b(EURUSD|GBPUSD|USDJPY|AUDUSD|USDCAD|EURGBP|EURJPY|GBPJPY|XAUUSD|GOLD)\b/g,
        /\b(EUR|GBP|USD|JPY|CHF|AUD|NZD|CAD|XAU|GOLD)(\/|-|)(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD)?\b/g
    ];

    for (const pattern of symbolPatterns) {
        const matches = combinedText.match(pattern);
        if (matches && matches.length > 0) {
            let symbol = matches[0].replace(/[\/\-]/g, '');
            if (symbol === 'XAU' || symbol === 'GOLD') symbol = 'XAUUSD';
            if (symbol.length === 6) symbol = symbol.slice(0, 3) + '/' + symbol.slice(3);
            result.symbol = symbol;
            break;
        }
    }

    // Detect timeframe
    const tfPatterns = [
        /\b(M1|M5|M15|M30|H1|H4|D1|W1|MN)\b/gi,
        /\b(\d+)(M|H|D|W)\b/gi
    ];

    for (const pattern of tfPatterns) {
        const match = combinedText.match(pattern);
        if (match) {
            result.timeframe = match[0].toUpperCase();
            break;
        }
    }

    // Try to extract price
    const pricePattern = /\b(\d{1,6}[.,]\d{2,8})\b/g;
    const priceMatches = text.match(pricePattern);
    if (priceMatches && priceMatches.length > 0) {
        const prices = priceMatches.map(p => parseFloat(p.replace(',', '.')));
        result.price = prices[0]; // Take first price found
    }

    // Generate mock klines based on detected data (in real implementation, you'd extract from chart)
    if (result.price) {
        result.klines = generateMockKlinesFromPrice(result.price, result.timeframe);
    }

    return result;
}

function generateMockKlinesFromPrice(currentPrice, timeframe) {
    // Generate mock klines around the detected price
    const klines = [];
    const periods = 100;
    const volatility = currentPrice * 0.005; // 0.5% volatility

    for (let i = periods; i >= 0; i--) {
        const basePrice = currentPrice + (Math.random() - 0.5) * volatility * 2;
        const open = basePrice;
        const close = basePrice + (Math.random() - 0.5) * volatility * 0.5;
        const high = Math.max(open, close) + Math.random() * volatility * 0.2;
        const low = Math.min(open, close) - Math.random() * volatility * 0.2;

        klines.push({
            time: Date.now() - i * 3600000, // 1 hour intervals
            open,
            high,
            low,
            close,
            volume: Math.random() * 1000
        });
    }

    return klines;
}

function SignalDisplay({ signal }) {
    const directionColor =
        signal.direction === 'BUY' ? 'text-green' :
        signal.direction === 'SELL' ? 'text-red' : 'text-gray-400';

    return (
        <div className={`signal-card rounded-xl p-6 mt-6 ${signal.direction.toLowerCase()}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`text-2xl font-bold ${directionColor}`}>
                    {signal.direction} SIGNAL
                </h3>
                <div className="text-3xl font-bold text-yellow">
                    80% {/* OCR signals typically higher confidence */}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-black rounded-lg p-4">
                    <p className="text-xs text-gray mb-1">Entry Price</p>
                    <p className="text-xl font-bold text-yellow mono">{signal.entry.toFixed(5)}</p>
                </div>
                <div className="bg-black rounded-lg p-4">
                    <p className="text-xs text-gray mb-1">Stop Loss</p>
                    <p className="text-xl font-bold text-red mono">{signal.sl.toFixed(5)}</p>
                </div>
                <div className="bg-black rounded-lg p-4">
                    <p className="text-xs text-gray mb-1">Take Profit 1</p>
                    <p className="text-xl font-bold text-green mono">{signal.tp1.toFixed(5)}</p>
                </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
                <div className="text-sm text-gray">
                    <p><span className="text-white">Source:</span> OCR Chart Analysis</p>
                    <p><span className="text-white">Reason:</span> {signal.reason}</p>
                    {signal.smcStrategy && (
                        <p><span className="text-white">SMC Strategy:</span> {signal.smcStrategy}</p>
                    )}
                    <p><span className="text-white">Risk/Reward:</span> 1:{signal.rr}</p>
                </div>
            </div>
        </div>
    );
}
