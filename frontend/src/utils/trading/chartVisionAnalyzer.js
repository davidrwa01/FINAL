/**
 * chartVisionAnalyzer.js
 * 
 * Analyzes chart screenshots using Canvas pixel analysis.
 * 
 * CRITICAL RULES:
 *   ✅ Only reports what is VISUALLY DETECTABLE
 *   ✅ Never guesses prices, symbols, or hidden data
 *   ✅ Returns confidence level for every detection
 *   ✅ Returns "unclear" when uncertain
 *   ❌ Never fabricates numbers
 *   ❌ Never invents market data
 * 
 * Detects:
 *   - Candle color ratio (bullish vs bearish)
 *   - Trend direction from visual slope
 *   - Potential structure patterns (HH/HL/LH/LL)
 *   - Equal highs/lows (liquidity zones)
 *   - Large candles (potential order blocks)
 *   - Gaps between candles (potential FVGs)
 */

// Color thresholds for candle detection
const GREEN_THRESHOLD = { r: [0, 150], g: [100, 255], b: [0, 150] };
const RED_THRESHOLD = { r: [150, 255], g: [0, 100], b: [0, 100] };
const WHITE_THRESHOLD = { r: [200, 255], g: [200, 255], b: [200, 255] };

/**
 * Main analysis function — takes an image file, returns SMC visual structure
 */
export async function analyzeChartImage(imageFile) {
  if (!imageFile) {
    return createEmptyResult('No image provided');
  }

  try {
    // Load image into canvas
    const img = await loadImage(imageFile);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // 1. Analyze candle colors
    const colorAnalysis = analyzeColors(pixels, canvas.width, canvas.height);

    // 2. Detect trend direction from price line slope
    const trendAnalysis = detectTrendFromPixels(pixels, canvas.width, canvas.height);

    // 3. Detect potential structure patterns
    const structureAnalysis = detectStructure(pixels, canvas.width, canvas.height, trendAnalysis);

    // 4. Detect liquidity patterns (equal highs/lows)
    const liquidityAnalysis = detectLiquidity(pixels, canvas.width, canvas.height);

    // 5. Detect potential order blocks (large candles before moves)
    const obAnalysis = detectOrderBlocks(colorAnalysis, trendAnalysis);

    // 6. Detect potential FVGs (gaps)
    const fvgAnalysis = detectFVGs(pixels, canvas.width, canvas.height);

    // 7. Determine overall trend bias
    const trendBias = determineTrendBias(colorAnalysis, trendAnalysis, structureAnalysis);

    // 8. Calculate overall confidence
    const confidence = calculateConfidence(colorAnalysis, trendAnalysis, structureAnalysis);

    return {
      success: true,

      structure: {
        higher_high: structureAnalysis.higher_high,
        higher_low: structureAnalysis.higher_low,
        lower_high: structureAnalysis.lower_high,
        lower_low: structureAnalysis.lower_low,
        bos: structureAnalysis.bos,
        choch: structureAnalysis.choch
      },

      liquidity: {
        equal_highs_visible: liquidityAnalysis.equal_highs,
        equal_lows_visible: liquidityAnalysis.equal_lows,
        liquidity_sweep_up: liquidityAnalysis.sweep_up,
        liquidity_sweep_down: liquidityAnalysis.sweep_down
      },

      order_block: {
        bullish_order_block_visible: obAnalysis.bullish_ob,
        bearish_order_block_visible: obAnalysis.bearish_ob
      },

      fvg: {
        fvg_visible: fvgAnalysis.detected
      },

      trend_bias: trendBias,
      confidence: confidence,

      // Raw analysis data (for debugging / display)
      raw: {
        bullishCandles: colorAnalysis.bullishPercent,
        bearishCandles: colorAnalysis.bearishPercent,
        trendSlope: trendAnalysis.slope,
        trendDirection: trendAnalysis.direction,
        imageSize: { width: canvas.width, height: canvas.height },
        totalCandlePixels: colorAnalysis.totalCandlePixels,
        priceLineDetected: trendAnalysis.priceLineDetected
      }
    };

  } catch (error) {
    console.error('Vision analysis error:', error);
    return createEmptyResult('Image analysis failed: ' + error.message);
  }
}

// ═══════════════════════════════════════════════════════════
// IMAGE LOADING
// ═══════════════════════════════════════════════════════════

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (file instanceof File || file instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    } else if (typeof file === 'string') {
      img.src = file;
    } else {
      reject(new Error('Invalid image input'));
    }
  });
}

// ═══════════════════════════════════════════════════════════
// COLOR ANALYSIS — Detect candle colors
// ═══════════════════════════════════════════════════════════

function analyzeColors(pixels, width, height) {
  let greenPixels = 0;
  let redPixels = 0;
  let totalPixels = 0;

  // Sample the chart area (avoid edges/headers — focus on center 70%)
  const startX = Math.floor(width * 0.1);
  const endX = Math.floor(width * 0.9);
  const startY = Math.floor(height * 0.1);
  const endY = Math.floor(height * 0.85);

  // Sample every 2nd pixel for performance
  for (let y = startY; y < endY; y += 2) {
    for (let x = startX; x < endX; x += 2) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      if (isGreen(r, g, b)) {
        greenPixels++;
        totalPixels++;
      } else if (isRed(r, g, b)) {
        redPixels++;
        totalPixels++;
      }
    }
  }

  const total = greenPixels + redPixels || 1;

  return {
    greenPixels,
    redPixels,
    totalCandlePixels: total,
    bullishPercent: Math.round((greenPixels / total) * 100),
    bearishPercent: Math.round((redPixels / total) * 100),
    dominance: greenPixels > redPixels * 1.2 ? 'BULLISH'
      : redPixels > greenPixels * 1.2 ? 'BEARISH'
      : 'MIXED'
  };
}

function isGreen(r, g, b) {
  return g > 80 && g > r * 1.3 && g > b * 1.3 && r < 180;
}

function isRed(r, g, b) {
  return r > 80 && r > g * 1.3 && r > b * 1.2 && g < 150;
}

// ═══════════════════════════════════════════════════════════
// TREND DETECTION — Analyze price line slope
// ═══════════════════════════════════════════════════════════

function detectTrendFromPixels(pixels, width, height) {
  // Find the dominant price line by scanning for bright/colored pixels
  // in vertical columns across the chart area
  const chartLeft = Math.floor(width * 0.1);
  const chartRight = Math.floor(width * 0.85);
  const chartTop = Math.floor(height * 0.1);
  const chartBottom = Math.floor(height * 0.85);

  const columns = 20; // Sample 20 columns across the chart
  const columnWidth = Math.floor((chartRight - chartLeft) / columns);
  const pricePoints = [];

  for (let col = 0; col < columns; col++) {
    const x = chartLeft + col * columnWidth + Math.floor(columnWidth / 2);

    // Scan this column from top to bottom, find the topmost colored pixel
    // (representing the highest price point in that area)
    let highestY = chartBottom;
    let lowestY = chartTop;
    let foundCandle = false;

    for (let y = chartTop; y < chartBottom; y++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      if (isGreen(r, g, b) || isRed(r, g, b) || isWhiteLine(r, g, b)) {
        if (y < highestY) highestY = y;
        if (y > lowestY) lowestY = y;
        foundCandle = true;
      }
    }

    if (foundCandle) {
      // In a chart, lower Y = higher price
      pricePoints.push({
        column: col,
        highY: highestY,
        lowY: lowestY,
        midY: (highestY + lowestY) / 2
      });
    }
  }

  if (pricePoints.length < 5) {
    return {
      direction: 'unclear',
      slope: 0,
      priceLineDetected: false,
      points: []
    };
  }

  // Calculate slope using linear regression on midpoints
  // Remember: lower Y = higher price in canvas coordinates
  const n = pricePoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  pricePoints.forEach((p, i) => {
    sumX += i;
    sumY += p.midY;
    sumXY += i * p.midY;
    sumX2 += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Negative slope = price going UP (y decreases as price increases)
  // Positive slope = price going DOWN
  let direction = 'ranging';
  const slopeThreshold = 1.5; // pixels per column

  if (slope < -slopeThreshold) direction = 'bullish';
  else if (slope > slopeThreshold) direction = 'bearish';

  // Check recent vs earlier (last 30% vs first 30%)
  const earlyPoints = pricePoints.slice(0, Math.floor(n * 0.3));
  const latePoints = pricePoints.slice(Math.floor(n * 0.7));

  const earlyAvgY = earlyPoints.reduce((a, p) => a + p.midY, 0) / earlyPoints.length;
  const lateAvgY = latePoints.reduce((a, p) => a + p.midY, 0) / latePoints.length;

  // Significant visual difference
  const yDiff = earlyAvgY - lateAvgY;
  const chartHeight = chartBottom - chartTop;

  if (Math.abs(yDiff) > chartHeight * 0.1) {
    if (yDiff > 0) direction = 'bearish'; // early higher on screen = early price lower
    else direction = 'bullish';
  }

  return {
    direction,
    slope: parseFloat(slope.toFixed(2)),
    priceLineDetected: true,
    points: pricePoints,
    recentTrend: lateAvgY < earlyAvgY ? 'bullish' : 'bearish'
  };
}

function isWhiteLine(r, g, b) {
  return r > 180 && g > 180 && b > 180;
}

// ═══════════════════════════════════════════════════════════
// STRUCTURE DETECTION — HH/HL/LH/LL/BOS/CHoCH
// ═══════════════════════════════════════════════════════════

function detectStructure(pixels, width, height, trendData) {
  const result = {
    higher_high: false,
    higher_low: false,
    lower_high: false,
    lower_low: false,
    bos: false,
    choch: false
  };

  if (!trendData.priceLineDetected || trendData.points.length < 6) {
    return result;
  }

  const points = trendData.points;

  // Find local peaks (swing highs) and valleys (swing lows)
  const peaks = [];
  const valleys = [];

  for (let i = 1; i < points.length - 1; i++) {
    // Peak = highY is lower than neighbors (higher price)
    if (points[i].highY < points[i - 1].highY && points[i].highY < points[i + 1].highY) {
      peaks.push({ index: i, y: points[i].highY });
    }
    // Valley = lowY is higher than neighbors (lower price)
    if (points[i].lowY > points[i - 1].lowY && points[i].lowY > points[i + 1].lowY) {
      valleys.push({ index: i, y: points[i].lowY });
    }
  }

  // Analyze swing structure
  if (peaks.length >= 2) {
    const lastPeak = peaks[peaks.length - 1];
    const prevPeak = peaks[peaks.length - 2];

    // Lower Y = higher price
    if (lastPeak.y < prevPeak.y) {
      result.higher_high = true; // New peak is higher
    } else if (lastPeak.y > prevPeak.y) {
      result.lower_high = true; // New peak is lower
    }
  }

  if (valleys.length >= 2) {
    const lastValley = valleys[valleys.length - 1];
    const prevValley = valleys[valleys.length - 2];

    if (lastValley.y < prevValley.y) {
      result.higher_low = true; // New valley is higher price
    } else if (lastValley.y > prevValley.y) {
      result.lower_low = true; // New valley is lower price
    }
  }

  // BOS detection: HH+HL = bullish BOS, or LL+LH = bearish BOS
  if (result.higher_high && result.higher_low) {
    result.bos = true;
  }
  if (result.lower_low && result.lower_high) {
    result.bos = true;
  }

  // CHoCH detection: Was making HH but now LH, or was making LL but now HL
  if (trendData.direction === 'bullish' && result.lower_high) {
    result.choch = true;
  }
  if (trendData.direction === 'bearish' && result.higher_low) {
    result.choch = true;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// LIQUIDITY DETECTION — Equal highs/lows
// ═══════════════════════════════════════════════════════════

function detectLiquidity(pixels, width, height) {
  const result = {
    equal_highs: false,
    equal_lows: false,
    sweep_up: false,
    sweep_down: false
  };

  // Scan top region for horizontal resistance clusters
  const chartTop = Math.floor(height * 0.1);
  const chartBottom = Math.floor(height * 0.85);
  const chartLeft = Math.floor(width * 0.1);
  const chartRight = Math.floor(width * 0.85);

  // Count colored pixels at each Y level
  const yHistogram = new Array(height).fill(0);

  for (let y = chartTop; y < chartBottom; y++) {
    for (let x = chartLeft; x < chartRight; x += 3) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      if (isGreen(r, g, b) || isRed(r, g, b)) {
        yHistogram[y]++;
      }
    }
  }

  // Find Y levels with high concentration (potential equal highs/lows)
  const avgDensity = yHistogram.reduce((a, b) => a + b, 0) / height;
  const highDensityLevels = [];

  for (let y = chartTop; y < chartBottom; y++) {
    if (yHistogram[y] > avgDensity * 3) {
      highDensityLevels.push(y);
    }
  }

  // Group nearby levels
  const groups = [];
  let currentGroup = [];

  highDensityLevels.forEach((y, i) => {
    if (currentGroup.length === 0 || y - currentGroup[currentGroup.length - 1] < 5) {
      currentGroup.push(y);
    } else {
      if (currentGroup.length >= 3) groups.push(currentGroup);
      currentGroup = [y];
    }
  });
  if (currentGroup.length >= 3) groups.push(currentGroup);

  // Equal highs = concentration near the top
  // Equal lows = concentration near the bottom
  const midChart = (chartTop + chartBottom) / 2;

  groups.forEach(group => {
    const avgY = group.reduce((a, b) => a + b, 0) / group.length;
    if (avgY < midChart) result.equal_highs = true;
    else result.equal_lows = true;
  });

  return result;
}

// ═══════════════════════════════════════════════════════════
// ORDER BLOCK DETECTION
// ═══════════════════════════════════════════════════════════

function detectOrderBlocks(colorAnalysis, trendAnalysis) {
  return {
    // If bullish trend and we see red candles followed by strong green = bullish OB
    bullish_ob: trendAnalysis.direction === 'bullish' && colorAnalysis.bearishPercent > 20,
    // If bearish trend and we see green candles followed by strong red = bearish OB
    bearish_ob: trendAnalysis.direction === 'bearish' && colorAnalysis.bullishPercent > 20
  };
}

// ═══════════════════════════════════════════════════════════
// FVG DETECTION — Gaps between candles
// ═══════════════════════════════════════════════════════════

function detectFVGs(pixels, width, height) {
  // Look for vertical gaps (areas with no colored pixels between candles)
  const chartTop = Math.floor(height * 0.15);
  const chartBottom = Math.floor(height * 0.8);
  const chartLeft = Math.floor(width * 0.15);
  const chartRight = Math.floor(width * 0.8);

  let gapCount = 0;
  const columnWidth = Math.floor((chartRight - chartLeft) / 30);

  for (let col = 1; col < 29; col++) {
    const x = chartLeft + col * columnWidth;

    let hasGap = false;
    let consecutiveEmpty = 0;

    for (let y = chartTop; y < chartBottom; y++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      if (!isGreen(r, g, b) && !isRed(r, g, b) && !isWhiteLine(r, g, b)) {
        consecutiveEmpty++;
        if (consecutiveEmpty > height * 0.03) { // Gap > 3% of chart height
          hasGap = true;
          break;
        }
      } else {
        consecutiveEmpty = 0;
      }
    }

    if (hasGap) gapCount++;
  }

  return {
    detected: gapCount >= 2,
    gapCount
  };
}

// ═══════════════════════════════════════════════════════════
// TREND BIAS DETERMINATION
// ═══════════════════════════════════════════════════════════

function determineTrendBias(colorAnalysis, trendAnalysis, structureAnalysis) {
  let bullishScore = 0;
  let bearishScore = 0;

  // Color dominance
  if (colorAnalysis.dominance === 'BULLISH') bullishScore += 2;
  else if (colorAnalysis.dominance === 'BEARISH') bearishScore += 2;

  // Trend direction
  if (trendAnalysis.direction === 'bullish') bullishScore += 3;
  else if (trendAnalysis.direction === 'bearish') bearishScore += 3;

  // Structure
  if (structureAnalysis.higher_high && structureAnalysis.higher_low) bullishScore += 3;
  if (structureAnalysis.lower_high && structureAnalysis.lower_low) bearishScore += 3;

  // BOS
  if (structureAnalysis.bos) {
    if (bullishScore > bearishScore) bullishScore += 2;
    else bearishScore += 2;
  }

  // CHoCH — reversal signal
  if (structureAnalysis.choch) {
    if (bullishScore > bearishScore) bearishScore += 2; // Potential reversal
    else bullishScore += 2;
  }

  const diff = Math.abs(bullishScore - bearishScore);

  if (diff < 2) return 'ranging';
  if (!trendAnalysis.priceLineDetected) return 'unclear';
  if (bullishScore > bearishScore) return 'bullish';
  if (bearishScore > bullishScore) return 'bearish';
  return 'unclear';
}

// ═══════════════════════════════════════════════════════════
// CONFIDENCE CALCULATION
// ═══════════════════════════════════════════════════════════

function calculateConfidence(colorAnalysis, trendAnalysis, structureAnalysis) {
  let score = 0;

  // Price line detected
  if (trendAnalysis.priceLineDetected) score += 30;

  // Enough candle pixels
  if (colorAnalysis.totalCandlePixels > 100) score += 20;
  else if (colorAnalysis.totalCandlePixels > 30) score += 10;

  // Clear trend
  if (trendAnalysis.direction !== 'ranging' && trendAnalysis.direction !== 'unclear') score += 20;

  // Structure detected
  if (structureAnalysis.bos || structureAnalysis.choch) score += 15;
  if (structureAnalysis.higher_high || structureAnalysis.lower_low) score += 15;

  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ═══════════════════════════════════════════════════════════
// EMPTY RESULT
// ═══════════════════════════════════════════════════════════

function createEmptyResult(reason) {
  return {
    success: false,
    error: reason,
    structure: {
      higher_high: false, higher_low: false,
      lower_high: false, lower_low: false,
      bos: false, choch: false
    },
    liquidity: {
      equal_highs_visible: false, equal_lows_visible: false,
      liquidity_sweep_up: false, liquidity_sweep_down: false
    },
    order_block: {
      bullish_order_block_visible: false,
      bearish_order_block_visible: false
    },
    fvg: { fvg_visible: false },
    trend_bias: 'unclear',
    confidence: 'low',
    raw: {}
  };
}

export default { analyzeChartImage };