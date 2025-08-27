# Usage Examples

This document provides comprehensive usage examples for all major components of the Crypto Quantum Trader Pro system.

## Table of Contents

- [Quick Start](#quick-start)
- [Data Management Examples](#data-management-examples)
- [Analytics Examples](#analytics-examples)
- [Machine Learning Examples](#machine-learning-examples)
- [Trading Examples](#trading-examples)
- [Risk Management Examples](#risk-management-examples)
- [Complete Workflows](#complete-workflows)
- [Debugging Examples](#debugging-examples)

## Quick Start

### Basic System Setup
```javascript
// 1. Initialize the system
initQuantumTrader();

// 2. Test connectivity
testConnectivity();

// 3. Install automated triggers
installTriggers();

// 4. Run first update
updateMain();
```

### Basic Market Data Retrieval
```javascript
// Get current price for BTC
const snapshot = dataManager.snapshot('BTC');
console.log(`BTC: $${snapshot.price} (${snapshot.freshness})`);

// Get multiple symbols
const symbols = ['BTC', 'ETH', 'SOL'];
symbols.forEach(sym => {
  const snap = dataManager.snapshot(sym);
  if (snap) {
    console.log(`${sym}: $${U.toFixedDyn(snap.price)}`);
  }
});
```

## Data Management Examples

### Working with Market Data Pack
```javascript
// Fetch market data for multiple symbols
function fetchMarketData() {
  const symbols = getSymbolsList();
  console.log(`Fetching data for: ${symbols.join(', ')}`);
  
  try {
    const pack = _throttledPack(symbols);
    
    if (pack.ok) {
      console.log(`Data source: ${pack._source}`);
      
      Object.entries(pack.data).forEach(([symbol, data]) => {
        console.log(`${symbol}:`);
        console.log(`  Price: $${U.toFixedDyn(data.price)}`);
        console.log(`  Source: ${data.source}`);
        console.log(`  Time: ${data.timestampMskIso}`);
      });
      
      // Log to derivatives sheet
      appendDerivativesLog(pack);
      
    } else {
      console.error('Failed to get market data pack');
    }
  } catch (error) {
    console.error('Error fetching market data:', error.message);
  }
}
```

### Order Book Analysis
```javascript
// Analyze order book depth for a symbol
function analyzeOrderBook(symbol) {
  console.log(`\n=== Order Book Analysis: ${symbol} ===`);
  
  try {
    // Get combined order book from multiple exchanges
    const book = Analytics.bookCombined(symbol);
    
    if (!book) {
      console.log('No order book data available');
      return;
    }
    
    console.log(`Data sources: ${book.src}`);
    
    // Analyze top levels
    const topBids = book.bids.slice(0, 5);
    const topAsks = book.asks.slice(0, 5);
    
    console.log('\nTop 5 Bids:');
    topBids.forEach((bid, i) => {
      console.log(`  ${i+1}. $${bid[0].toFixed(2)} × ${bid[1].toFixed(4)}`);
    });
    
    console.log('\nTop 5 Asks:');
    topAsks.forEach((ask, i) => {
      console.log(`  ${i+1}. $${ask[0].toFixed(2)} × ${ask[1].toFixed(4)}`);
    });
    
    // Calculate spread
    const bestBid = topBids[0][0];
    const bestAsk = topAsks[0][0];
    const spread = bestAsk - bestBid;
    const spreadBps = (spread / bestBid) * 10000;
    
    console.log(`\nSpread: $${spread.toFixed(2)} (${spreadBps.toFixed(1)} bps)`);
    
    // Calculate total volume
    const bidVolume = U.sum(topBids.map(b => b[1]));
    const askVolume = U.sum(topAsks.map(a => a[1]));
    
    console.log(`Bid volume (top 5): ${bidVolume.toFixed(4)}`);
    console.log(`Ask volume (top 5): ${askVolume.toFixed(4)}`);
    
  } catch (error) {
    console.error('Order book analysis failed:', error.message);
  }
}

// Usage
analyzeOrderBook('BTC');
```

### Trade Flow Analysis
```javascript
// Analyze recent trade flow for CVD calculation
function analyzeTradeFlow(symbol, minutes = 10) {
  console.log(`\n=== Trade Flow Analysis: ${symbol} (${minutes}min) ===`);
  
  try {
    // Get recent trades from OKX
    const okxTrades = dataManager.okxTrades(symbol, 100);
    
    if (okxTrades && okxTrades.data) {
      const trades = okxTrades.data;
      const cutoff = Date.now() - (minutes * 60 * 1000);
      
      let buyVolume = 0, sellVolume = 0;
      let buyCount = 0, sellCount = 0;
      let recentTrades = 0;
      
      trades.forEach(trade => {
        const tradeTime = parseInt(trade.ts);
        if (tradeTime >= cutoff) {
          recentTrades++;
          const size = parseFloat(trade.sz);
          
          if (trade.side === 'buy') {
            buyVolume += size;
            buyCount++;
          } else {
            sellVolume += size;
            sellCount++;
          }
        }
      });
      
      const cvd = buyVolume - sellVolume;
      const totalVolume = buyVolume + sellVolume;
      const buyRatio = totalVolume > 0 ? (buyVolume / totalVolume) : 0;
      
      console.log(`Recent trades (${minutes}min): ${recentTrades}`);
      console.log(`Buy trades: ${buyCount} (${buyVolume.toFixed(4)} ${symbol})`);
      console.log(`Sell trades: ${sellCount} (${sellVolume.toFixed(4)} ${symbol})`);
      console.log(`CVD: ${cvd.toFixed(4)} ${symbol}`);
      console.log(`Buy ratio: ${(buyRatio * 100).toFixed(1)}%`);
      
      // Interpretation
      if (Math.abs(cvd) > totalVolume * 0.1) {
        const direction = cvd > 0 ? 'buying' : 'selling';
        console.log(`🔍 Strong ${direction} pressure detected`);
      } else {
        console.log(`🔍 Balanced buy/sell pressure`);
      }
    }
    
  } catch (error) {
    console.error('Trade flow analysis failed:', error.message);
  }
}

// Usage
analyzeTradeFlow('BTC', 15);
```

## Analytics Examples

### Market Condition Analysis
```javascript
// Comprehensive market condition analysis
function analyzeMarketConditions(symbol) {
  console.log(`\n=== Market Conditions: ${symbol} ===`);
  
  try {
    // Get current price
    const snapshot = dataManager.snapshot(symbol);
    if (!snapshot) {
      console.log('No price data available');
      return null;
    }
    
    const price = snapshot.price;
    console.log(`Current price: $${U.toFixedDyn(price)}`);
    
    // Analyze order book walls and imbalance
    const wallAnalysis = Analytics.wallsAndObi(symbol, price);
    console.log(`Order Book Imbalance: ${wallAnalysis.OBI.toFixed(3)}`);
    
    if (wallAnalysis.floor) {
      const supportDist = ((price - wallAnalysis.floor) / price * 100);
      console.log(`Support wall: $${wallAnalysis.floor.toFixed(2)} (-${supportDist.toFixed(2)}%)`);
    } else {
      console.log('No significant support wall detected');
    }
    
    if (wallAnalysis.ceil) {
      const resistanceDist = ((wallAnalysis.ceil - price) / price * 100);
      console.log(`Resistance wall: $${wallAnalysis.ceil.toFixed(2)} (+${resistanceDist.toFixed(2)}%)`);
    } else {
      console.log('No significant resistance wall detected');
    }
    
    // Get technical indicators
    const atr = Analytics.atr(symbol);
    const atrPercent = (atr / price) * 100;
    console.log(`ATR: $${atr.toFixed(2)} (${atrPercent.toFixed(2)}% of price)`);
    
    // Get funding and OI
    const funding = Analytics.funding(symbol);
    const oiData = Analytics.openInterest(symbol);
    
    console.log(`Funding rate: ${(funding * 100).toFixed(4)}%`);
    console.log(`Open Interest: ${oiData.oi.toFixed(0)} contracts`);
    console.log(`OI change: ${oiData.delta > 0 ? '+' : ''}${oiData.delta.toFixed(0)}`);
    
    // Get CVD
    const cvd = Analytics.cvd(symbol);
    console.log(`Cumulative Volume Delta: ${cvd.toFixed(4)}`);
    
    // Determine trading horizon
    const horizon = Analytics.horizonByProj(price, wallAnalysis.floor, wallAnalysis.ceil);
    console.log(`Suggested horizon: ${horizon}`);
    
    // Market regime classification
    let regime = 'NEUTRAL';
    if (Math.abs(wallAnalysis.OBI) > 0.15) {
      regime = wallAnalysis.OBI > 0 ? 'BULLISH' : 'BEARISH';
    }
    if (atrPercent > 3) {
      regime += '_HIGH_VOL';
    }
    
    console.log(`Market regime: ${regime}`);
    
    return {
      price,
      obi: wallAnalysis.OBI,
      support: wallAnalysis.floor,
      resistance: wallAnalysis.ceil,
      atr,
      atrPercent,
      funding,
      cvd,
      horizon,
      regime
    };
    
  } catch (error) {
    console.error('Market analysis failed:', error.message);
    return null;
  }
}

// Analyze multiple symbols
function multiSymbolAnalysis() {
  const symbols = getSymbolsList();
  const results = {};
  
  console.log('\n' + '='.repeat(60));
  console.log('MULTI-SYMBOL MARKET ANALYSIS');
  console.log('='.repeat(60));
  
  symbols.forEach(symbol => {
    const analysis = analyzeMarketConditions(symbol);
    if (analysis) {
      results[symbol] = analysis;
    }
  });
  
  // Summary
  console.log('\n=== SUMMARY ===');
  Object.entries(results).forEach(([symbol, data]) => {
    const obi = data.obi > 0 ? `+${data.obi.toFixed(3)}` : data.obi.toFixed(3);
    const vol = data.atrPercent.toFixed(1);
    console.log(`${symbol}: OBI=${obi}, Vol=${vol}%, ${data.regime}, ${data.horizon}`);
  });
  
  return results;
}
```

### Correlation Analysis
```javascript
// Analyze correlations between symbols
function analyzeCorrelations() {
  console.log('\n=== CORRELATION ANALYSIS ===');
  
  const symbols = getSymbolsList().filter(s => s !== 'BTC');
  const results = {};
  
  symbols.forEach(symbol => {
    const btcAdj = Analytics.btcAdj(symbol);
    results[symbol] = btcAdj;
    
    let interpretation = '';
    if (btcAdj > 0.05) {
      interpretation = 'Strong positive correlation';
    } else if (btcAdj < -0.05) {
      interpretation = 'Strong negative correlation';
    } else {
      interpretation = 'Low correlation';
    }
    
    console.log(`${symbol}-BTC: ${btcAdj.toFixed(3)} (${interpretation})`);
  });
  
  // Find most/least correlated
  const sorted = Object.entries(results).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  
  console.log(`\nMost correlated: ${sorted[0][0]} (${sorted[0][1].toFixed(3)})`);
  console.log(`Least correlated: ${sorted[sorted.length-1][0]} (${sorted[sorted.length-1][1].toFixed(3)})`);
  
  return results;
}
```

## Machine Learning Examples

### Feature Engineering
```javascript
// Complete feature engineering pipeline
function engineerFeatures(symbol) {
  console.log(`\n=== Feature Engineering: ${symbol} ===`);
  
  try {
    // Get price snapshot
    const snapshot = dataManager.snapshot(symbol);
    if (!snapshot) {
      console.log('No price data available');
      return null;
    }
    
    // Compute all features
    const features = computeFeatures(symbol, snapshot);
    
    console.log('Raw Features:');
    Object.entries(features).forEach(([name, value]) => {
      if (typeof value === 'number') {
        console.log(`  ${name}: ${value.toFixed(6)}`);
      } else {
        console.log(`  ${name}: ${value}`);
      }
    });
    
    // Feature validation
    const issues = validateFeatures(features);
    if (issues.length > 0) {
      console.log('\n⚠️ Feature Issues:');
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log('\n✅ All features valid');
    }
    
    // Feature normalization (example)
    const normalized = {};
    const ranges = {
      OBI: [-1, 1],
      funding: [-0.01, 0.01],
      proj: [0, 0.1],
      btcAdj: [-0.12, 0.12]
    };
    
    Object.entries(features).forEach(([name, value]) => {
      if (ranges[name] && typeof value === 'number') {
        const [min, max] = ranges[name];
        normalized[name] = U.clamp((value - min) / (max - min), 0, 1);
      }
    });
    
    console.log('\nNormalized Features:');
    Object.entries(normalized).forEach(([name, value]) => {
      console.log(`  ${name}: ${value.toFixed(3)}`);
    });
    
    return { raw: features, normalized };
    
  } catch (error) {
    console.error('Feature engineering failed:', error.message);
    return null;
  }
}

function validateFeatures(features) {
  const issues = [];
  
  // Check for required features
  const required = ['OBI', 'funding', 'dOI', 'cvd', 'proj', 'btcAdj', 'atr'];
  required.forEach(feature => {
    if (typeof features[feature] !== 'number' || !isFinite(features[feature])) {
      issues.push(`Invalid ${feature}: ${features[feature]}`);
    }
  });
  
  // Check ranges
  if (Math.abs(features.OBI) > 1) {
    issues.push(`OBI out of range: ${features.OBI}`);
  }
  
  if (Math.abs(features.funding) > 0.1) {
    issues.push(`Funding rate extreme: ${features.funding}`);
  }
  
  if (features.proj < 0 || features.proj > 1) {
    issues.push(`Projection out of range: ${features.proj}`);
  }
  
  if (features.atr <= 0) {
    issues.push(`Invalid ATR: ${features.atr}`);
  }
  
  return issues;
}
```

### Model Prediction and Analysis
```javascript
// Comprehensive model prediction analysis
function analyzeModelPrediction(symbol) {
  console.log(`\n=== Model Prediction Analysis: ${symbol} ===`);
  
  try {
    // Get features
    const snapshot = dataManager.snapshot(symbol);
    const features = computeFeatures(symbol, snapshot);
    
    // Test all horizons
    const horizons = ['SCALP', 'SWING', 'POSITION'];
    const predictions = {};
    
    horizons.forEach(horizon => {
      const prob = modelScore(features, horizon);
      const signal = decideSignal(prob, LONG_PROB_MIN, SHORT_PROB_MAX);
      const confidence = Math.abs(prob - 0.5) * 2;
      
      predictions[horizon] = { prob, signal, confidence };
      
      console.log(`${horizon}:`);
      console.log(`  Probability: ${(prob * 100).toFixed(1)}%`);
      console.log(`  Signal: ${signal}`);
      console.log(`  Confidence: ${(confidence * 100).toFixed(1)}%`);
    });
    
    // Determine best horizon
    const bestHorizon = Object.entries(predictions)
      .reduce((max, [horizon, data]) => 
        data.confidence > max.confidence ? { horizon, ...data } : max,
        { confidence: 0 });
    
    console.log(`\nBest signal: ${bestHorizon.horizon} ${bestHorizon.signal}`);
    console.log(`Confidence: ${(bestHorizon.confidence * 100).toFixed(1)}%`);
    
    // Feature importance analysis
    console.log('\n=== Feature Contribution Analysis ===');
    const weights = readWeights();
    
    const contributions = {
      bias: weights.bias || 0,
      OBI: (weights.OBI || 0) * features.OBI,
      Funding: (weights.Funding || 0) * features.funding,
      dOI: (weights.dOI || 0) * features.dOI,
      CVD: (weights.CVD || 0) * features.cvd,
      Proj: (weights.Proj || 0) * features.proj,
      BTCadj: (weights.BTCadj || 0) * features.btcAdj
    };
    
    // Sort by absolute contribution
    const sorted = Object.entries(contributions)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    
    sorted.forEach(([feature, contribution]) => {
      const direction = contribution > 0 ? '↑' : '↓';
      console.log(`  ${feature}: ${contribution.toFixed(4)} ${direction}`);
    });
    
    const totalContribution = U.sum(Object.values(contributions));
    console.log(`\nTotal z-score: ${totalContribution.toFixed(4)}`);
    console.log(`Sigmoid output: ${U.sigmoid(totalContribution).toFixed(4)}`);
    
    return {
      predictions,
      bestHorizon,
      contributions,
      features
    };
    
  } catch (error) {
    console.error('Model analysis failed:', error.message);
    return null;
  }
}
```

### Model Training Simulation
```javascript
// Simulate model training with historical data
function simulateModelTraining() {
  console.log('\n=== Model Training Simulation ===');
  
  // Get historical trades for training examples
  const archiveSheet = U.getOrCreate('📦 АРХИВ СИГНАЛОВ', []);
  const trades = archiveSheet.getDataRange().getValues().slice(1);
  
  if (trades.length < 10) {
    console.log('Insufficient historical trades for simulation');
    return;
  }
  
  console.log(`Found ${trades.length} historical trades`);
  
  // Get current weights
  const initialWeights = { ...readWeights() };
  console.log('Initial weights:', initialWeights);
  
  // Simulate training on recent trades
  let trainingExamples = 0;
  let totalError = 0;
  
  trades.slice(-20).forEach(trade => { // Last 20 trades
    const symbol = trade[1];
    const side = trade[2];
    const R = parseFloat(trade[6]) || 0;
    
    // Create synthetic feature vector (in real system, this would be stored)
    const syntheticFeatures = {
      OBI: (Math.random() - 0.5) * 0.4,
      funding: (Math.random() - 0.5) * 0.002,
      dOI: (Math.random() - 0.5) * 10000,
      cvd: (Math.random() - 0.5) * 200,
      proj: Math.random() * 0.05,
      btcAdj: (Math.random() - 0.5) * 0.1
    };
    
    // Determine horizon (synthetic)
    const horizon = Math.random() < 0.5 ? 'SWING' : 'SCALP';
    
    // Get model prediction
    const prob = modelScore(syntheticFeatures, horizon);
    
    // Create training example
    const label = R > 0 ? 1 : -1;
    const example = {
      feats: syntheticFeatures,
      label,
      prob,
      horizon
    };
    
    // Calculate error before update
    const actual = (label + 1) / 2; // Convert to 0-1
    const error = Math.abs(prob - actual);
    totalError += error;
    
    // Update model
    modelOnlineUpdate(example);
    trainingExamples++;
  });
  
  // Get final weights
  const finalWeights = readWeights();
  
  console.log(`\nTraining completed: ${trainingExamples} examples`);
  console.log(`Average error: ${(totalError / trainingExamples).toFixed(4)}`);
  
  console.log('\nWeight changes:');
  Object.keys(initialWeights).forEach(feature => {
    const change = finalWeights[feature] - initialWeights[feature];
    if (Math.abs(change) > 0.001) {
      console.log(`  ${feature}: ${initialWeights[feature].toFixed(4)} → ${finalWeights[feature].toFixed(4)} (${change > 0 ? '+' : ''}${change.toFixed(4)})`);
    }
  });
}
```

## Trading Examples

### Complete Signal Generation
```javascript
// Complete signal generation workflow
function generateTradingSignals() {
  console.log('\n=== TRADING SIGNAL GENERATION ===');
  
  const symbols = getSymbolsList();
  const signals = [];
  
  // Check daily risk limit
  const dailyRisk = dailyRiskUsedUSD();
  const dailyLimit = DAILY_RISK_LIMIT_USD;
  
  console.log(`Daily risk: $${dailyRisk.toFixed(2)} / $${dailyLimit}`);
  
  if (dailyRisk >= dailyLimit) {
    console.log('❌ Daily risk limit exceeded - no new signals');
    return [];
  }
  
  // Check event policy
  const eventPolicy = currentEventPolicy();
  if (eventPolicy.active) {
    console.log(`⚠️ Event mode active (risk=${eventPolicy.riskMult}, sl=${eventPolicy.slMult})`);
  }
  
  symbols.forEach(symbol => {
    console.log(`\n--- Analyzing ${symbol} ---`);
    
    try {
      // Check position limits
      if (!canOpenMoreForSymbol(symbol)) {
        console.log(`⏭️ Position already exists for ${symbol}`);
        return;
      }
      
      // Get market data
      const snapshot = dataManager.snapshot(symbol);
      if (!snapshot) {
        console.log(`❌ No market data for ${symbol}`);
        return;
      }
      
      console.log(`Price: $${U.toFixedDyn(snapshot.price)} (${snapshot.freshness})`);
      
      // Compute features
      const features = computeFeatures(symbol, snapshot);
      
      // Validate features
      const issues = validateFeatures(features);
      if (issues.length > 0) {
        console.log(`❌ Feature issues: ${issues.join(', ')}`);
        return;
      }
      
      // Determine horizon
      const horizon = decideHorizon(snapshot.price, features.floor, features.ceil);
      console.log(`Horizon: ${horizon}`);
      
      // Check event restrictions
      if (eventPolicy.active && eventPolicy.blockScalp && horizon === 'SCALP') {
        console.log(`❌ Scalping blocked by event policy`);
        return;
      }
      
      // Get model prediction
      const probability = modelScore(features, horizon);
      console.log(`Model probability: ${(probability * 100).toFixed(1)}%`);
      
      // Generate signal
      const signal = decideSignal(probability, LONG_PROB_MIN, SHORT_PROB_MAX);
      console.log(`Signal: ${signal}`);
      
      if (signal === 'NEUTRAL') {
        console.log(`⚪ Neutral signal - no action`);
        return;
      }
      
      // Calculate levels
      const levels = calcSL_TPs(
        signal, 
        snapshot.price, 
        features.atr, 
        features.floor, 
        features.ceil,
        eventPolicy.active ? eventPolicy.slMult : 1.0
      );
      
      console.log(`Entry: $${snapshot.price.toFixed(2)}`);
      console.log(`Stop-loss: $${levels.SL.toFixed(2)}`);
      console.log(`Risk: $${levels.R.toFixed(2)} (${(levels.R/snapshot.price*100).toFixed(2)}%)`);
      console.log(`Take-profits: ${levels.TPs.map(tp => '$' + tp.toFixed(2)).join(', ')}`);
      
      // Calculate position size
      const riskUSD = ACCOUNT_SIZE_USD * (RISK_PER_TRADE_PCT / 100);
      const adjustedRisk = eventPolicy.active ? riskUSD * eventPolicy.riskMult : riskUSD;
      const positionSize = adjustedRisk / levels.R;
      
      console.log(`Position size: ${positionSize.toFixed(6)} ${symbol}`);
      console.log(`Risk amount: $${adjustedRisk.toFixed(2)}`);
      
      // Create signal object
      const signalObj = {
        symbol,
        signal,
        probability,
        horizon,
        entry: snapshot.price,
        stopLoss: levels.SL,
        takeProfits: levels.TPs,
        risk: levels.R,
        positionSize,
        riskUSD: adjustedRisk,
        confidence: Math.abs(probability - 0.5) * 2,
        features,
        eventAdjusted: eventPolicy.active
      };
      
      signals.push(signalObj);
      console.log(`✅ ${signal} signal generated`);
      
    } catch (error) {
      console.error(`❌ Error analyzing ${symbol}:`, error.message);
    }
  });
  
  // Sort by confidence
  signals.sort((a, b) => b.confidence - a.confidence);
  
  console.log(`\n=== SIGNAL SUMMARY ===`);
  console.log(`Generated ${signals.length} signals`);
  
  signals.forEach((sig, i) => {
    console.log(`${i+1}. ${sig.symbol} ${sig.signal} (${(sig.confidence*100).toFixed(0)}% confidence, ${sig.horizon})`);
  });
  
  return signals;
}
```

### Trade Execution
```javascript
// Execute trades from generated signals
function executeTrades(signals) {
  console.log('\n=== TRADE EXECUTION ===');
  
  if (!signals || signals.length === 0) {
    console.log('No signals to execute');
    return [];
  }
  
  const executedTrades = [];
  const maxTrades = 3; // Limit concurrent trades
  
  // Calculate remaining risk budget
  const dailyRisk = dailyRiskUsedUSD();
  const dailyLimit = DAILY_RISK_LIMIT_USD;
  const remainingRisk = Math.max(0, dailyLimit - dailyRisk);
  
  console.log(`Remaining risk budget: $${remainingRisk.toFixed(2)}`);
  
  let usedRisk = 0;
  
  for (let i = 0; i < Math.min(signals.length, maxTrades); i++) {
    const signal = signals[i];
    
    // Check risk budget
    if (usedRisk + signal.riskUSD > remainingRisk) {
      console.log(`⚠️ Insufficient risk budget for ${signal.symbol} (need $${signal.riskUSD.toFixed(2)}, have $${(remainingRisk - usedRisk).toFixed(2)})`);
      continue;
    }
    
    try {
      console.log(`\n--- Executing ${signal.symbol} ${signal.signal} ---`);
      
      // Final validation
      const currentSnapshot = dataManager.snapshot(signal.symbol);
      if (!currentSnapshot) {
        console.log(`❌ No current price data for ${signal.symbol}`);
        continue;
      }
      
      // Check price hasn't moved too much
      const priceChange = Math.abs(currentSnapshot.price - signal.entry) / signal.entry;
      if (priceChange > 0.01) { // 1% max price change
        console.log(`⚠️ Price moved too much: ${(priceChange*100).toFixed(2)}%`);
        continue;
      }
      
      // Determine TTL
      const ttlMap = {
        'SCALP': TTL_SCALP_MIN,
        'SWING': TTL_SWING_MIN,
        'POSITION': TTL_POSITION_MIN
      };
      const ttl = ttlMap[signal.horizon];
      
      // Create reason string
      const reason = `${signal.signal} signal (p=${(signal.probability*100).toFixed(1)}%, c=${(signal.confidence*100).toFixed(0)}%, h=${signal.horizon})`;
      
      // Execute trade
      const tradeId = openTrade(
        signal.symbol,
        signal.signal,
        currentSnapshot,
        signal.features,
        signal.probability,
        signal.horizon,
        ttl,
        signal.stopLoss,
        signal.takeProfits,
        signal.risk,
        reason
      );
      
      if (tradeId) {
        console.log(`✅ Trade executed: ${tradeId}`);
        console.log(`   Entry: $${currentSnapshot.price.toFixed(2)}`);
        console.log(`   Risk: $${signal.riskUSD.toFixed(2)}`);
        console.log(`   Position: ${signal.positionSize.toFixed(6)} ${signal.symbol}`);
        
        executedTrades.push({
          id: tradeId,
          ...signal,
          actualEntry: currentSnapshot.price
        });
        
        usedRisk += signal.riskUSD;
      } else {
        console.log(`❌ Failed to execute trade for ${signal.symbol}`);
      }
      
    } catch (error) {
      console.error(`❌ Trade execution failed for ${signal.symbol}:`, error.message);
    }
  }
  
  console.log(`\n=== EXECUTION SUMMARY ===`);
  console.log(`Executed ${executedTrades.length} trades`);
  console.log(`Total risk deployed: $${usedRisk.toFixed(2)}`);
  
  return executedTrades;
}
```

## Risk Management Examples

### Portfolio Risk Analysis
```javascript
// Comprehensive portfolio risk analysis
function analyzePortfolioRisk() {
  console.log('\n=== PORTFOLIO RISK ANALYSIS ===');
  
  // Get active positions
  const activeSheet = U.getOrCreate('📊 АКТИВНЫЕ СИГНАЛЫ', []);
  const rows = activeSheet.getDataRange().getValues();
  
  if (rows.length <= 1) {
    console.log('No active positions');
    return;
  }
  
  const positions = rows.slice(1).map(row => ({
    id: row[0],
    symbol: row[1],
    side: row[2],
    entry: parseFloat(row[3]),
    stopLoss: parseFloat(row[4]),
    leftPercent: parseFloat(row[14]) || 1.0,
    currentR: parseFloat(row[16]) || 0,
    horizon: row[17],
    created: row[21]
  })).filter(pos => pos.id && pos.symbol);
  
  console.log(`Active positions: ${positions.length}`);
  
  // Risk metrics
  let totalRisk = 0;
  let totalCurrentR = 0;
  const bySide = { LONG: 0, SHORT: 0 };
  const byHorizon = { SCALP: 0, SWING: 0, POSITION: 0 };
  const bySymbol = {};
  
  console.log('\n--- Position Details ---');
  positions.forEach(pos => {
    const riskUSD = ACCOUNT_SIZE_USD * (RISK_PER_TRADE_PCT / 100) * pos.leftPercent;
    const currentPnL = pos.currentR * ACCOUNT_SIZE_USD * (RISK_PER_TRADE_PCT / 100);
    
    totalRisk += riskUSD;
    totalCurrentR += pos.currentR;
    
    bySide[pos.side] = (bySide[pos.side] || 0) + 1;
    byHorizon[pos.horizon] = (byHorizon[pos.horizon] || 0) + 1;
    bySymbol[pos.symbol] = (bySymbol[pos.symbol] || 0) + 1;
    
    console.log(`${pos.symbol} ${pos.side}:`);
    console.log(`  Entry: $${pos.entry.toFixed(2)}, SL: $${pos.stopLoss.toFixed(2)}`);
    console.log(`  Left: ${(pos.leftPercent*100).toFixed(0)}%, R: ${pos.currentR.toFixed(2)}`);
    console.log(`  Risk: $${riskUSD.toFixed(2)}, P&L: $${currentPnL.toFixed(2)}`);
    console.log(`  Age: ${U.diffMin(new Date(), new Date(pos.created))} minutes`);
  });
  
  // Summary statistics
  console.log('\n--- Risk Summary ---');
  console.log(`Total risk deployed: $${totalRisk.toFixed(2)}`);
  console.log(`Current P&L: $${(totalCurrentR * ACCOUNT_SIZE_USD * (RISK_PER_TRADE_PCT / 100)).toFixed(2)}`);
  console.log(`Total R: ${totalCurrentR.toFixed(2)}`);
  
  console.log('\n--- Position Distribution ---');
  console.log(`Long positions: ${bySide.LONG || 0}`);
  console.log(`Short positions: ${bySide.SHORT || 0}`);
  
  Object.entries(byHorizon).forEach(([horizon, count]) => {
    if (count > 0) {
      console.log(`${horizon} positions: ${count}`);
    }
  });
  
  console.log('\n--- Symbol Exposure ---');
  Object.entries(bySymbol).forEach(([symbol, count]) => {
    console.log(`${symbol}: ${count} position${count > 1 ? 's' : ''}`);
  });
  
  // Risk warnings
  console.log('\n--- Risk Warnings ---');
  if (totalRisk > ACCOUNT_SIZE_USD * 0.1) {
    console.log('⚠️ High total risk deployed (>10% of account)');
  }
  
  if (Math.abs(bySide.LONG - bySide.SHORT) > 2) {
    console.log('⚠️ Significant directional bias in positions');
  }
  
  const maxSymbolPositions = Math.max(...Object.values(bySymbol));
  if (maxSymbolPositions > 1) {
    console.log('⚠️ Multiple positions in same symbol detected');
  }
  
  // Daily risk check
  const dailyRisk = dailyRiskUsedUSD();
  const dailyLimit = DAILY_RISK_LIMIT_USD;
  const dailyUsage = (dailyRisk / dailyLimit) * 100;
  
  console.log(`\nDaily risk usage: ${dailyUsage.toFixed(1)}%`);
  if (dailyUsage > 80) {
    console.log('⚠️ Approaching daily risk limit');
  }
  
  return {
    totalPositions: positions.length,
    totalRisk,
    totalCurrentR,
    bySide,
    byHorizon,
    bySymbol,
    dailyRiskUsage: dailyUsage
  };
}
```

### Event Risk Management
```javascript
// Monitor and manage event-based risk
function manageEventRisk() {
  console.log('\n=== EVENT RISK MANAGEMENT ===');
  
  // Check current event policy
  const policy = currentEventPolicy();
  
  console.log(`Event mode: ${policy.active ? '🔴 ACTIVE' : '🟢 Normal'}`);
  
  if (policy.active) {
    console.log(`Risk multiplier: ${policy.riskMult}`);
    console.log(`SL multiplier: ${policy.slMult}`);
    console.log(`Scalping blocked: ${policy.blockScalp}`);
    
    // Analyze impact on active positions
    const activePositions = getActivePositions();
    
    if (activePositions.length > 0) {
      console.log('\n--- Event Impact on Active Positions ---');
      
      activePositions.forEach(pos => {
        // Calculate adjusted stop-loss
        const originalR = Math.abs(pos.entry - pos.stopLoss);
        const adjustedR = originalR * policy.slMult;
        const adjustedSL = pos.side === 'LONG' ? 
          pos.entry - adjustedR : 
          pos.entry + adjustedR;
        
        console.log(`${pos.symbol} ${pos.side}:`);
        console.log(`  Current SL: $${pos.stopLoss.toFixed(2)}`);
        console.log(`  Event-adjusted SL: $${adjustedSL.toFixed(2)}`);
        
        if (pos.horizon === 'SCALP' && policy.blockScalp) {
          console.log(`  ⚠️ Scalp position affected by block policy`);
        }
      });
    }
    
    // Recommend actions
    console.log('\n--- Recommended Actions ---');
    console.log('• Reduce new position sizes');
    console.log('• Consider tightening stop-losses');
    console.log('• Avoid scalping strategies');
    console.log('• Monitor positions more closely');
  }
  
  return policy;
}

function getActivePositions() {
  const sheet = U.getOrCreate('📊 АКТИВНЫЕ СИГНАЛЫ', []);
  const rows = sheet.getDataRange().getValues();
  
  return rows.slice(1).map(row => ({
    id: row[0],
    symbol: row[1],
    side: row[2],
    entry: parseFloat(row[3]),
    stopLoss: parseFloat(row[4]),
    horizon: row[17]
  })).filter(pos => pos.id);
}
```

## Complete Workflows

### Daily Trading Routine
```javascript
// Complete daily trading routine
function dailyTradingRoutine() {
  console.log('\n' + '='.repeat(60));
  console.log('DAILY TRADING ROUTINE - ' + U.nowStr());
  console.log('='.repeat(60));
  
  try {
    // 1. System health check
    console.log('\n1. SYSTEM HEALTH CHECK');
    const health = runSystemHealthCheck();
    
    if (!health.allGood) {
      console.log('❌ System health issues detected - aborting routine');
      return;
    }
    
    // 2. Process active positions
    console.log('\n2. PROCESSING ACTIVE POSITIONS');
    processActive();
    
    // 3. Analyze portfolio risk
    console.log('\n3. PORTFOLIO RISK ANALYSIS');
    const riskAnalysis = analyzePortfolioRisk();
    
    // 4. Check market conditions
    console.log('\n4. MARKET CONDITIONS');
    const marketAnalysis = multiSymbolAnalysis();
    
    // 5. Generate new signals
    console.log('\n5. SIGNAL GENERATION');
    const signals = generateTradingSignals();
    
    // 6. Execute top signals
    if (signals.length > 0) {
      console.log('\n6. TRADE EXECUTION');
      const executedTrades = executeTrades(signals.slice(0, 3)); // Top 3 signals
      
      if (executedTrades.length > 0) {
        console.log(`✅ Executed ${executedTrades.length} new trades`);
      }
    } else {
      console.log('\n6. No signals to execute');
    }
    
    // 7. Update logs and KPIs
    console.log('\n7. LOGGING AND REPORTING');
    const pack = _throttledPack(getSymbolsList());
    appendDerivativesLog(pack);
    
    // 8. Summary
    console.log('\n' + '='.repeat(60));
    console.log('DAILY ROUTINE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Active positions: ${riskAnalysis?.totalPositions || 0}`);
    console.log(`Signals generated: ${signals.length}`);
    console.log(`Trades executed: ${executedTrades?.length || 0}`);
    console.log(`Portfolio P&L: $${(riskAnalysis?.totalCurrentR * ACCOUNT_SIZE_USD * (RISK_PER_TRADE_PCT / 100) || 0).toFixed(2)}`);
    console.log(`Daily risk used: ${riskAnalysis?.dailyRiskUsage || 0}%`);
    
    console.log('\n✅ Daily routine completed successfully');
    
  } catch (error) {
    console.error('❌ Daily routine failed:', error.message);
    
    // Log error
    const errorSheet = U.getOrCreate('🚨 ERRORS', ['Time', 'Function', 'Error']);
    errorSheet.getRange(errorSheet.getLastRow() + 1, 1, 1, 3).setValues([
      [U.nowStr(), 'dailyTradingRoutine', error.message]
    ]);
  }
}

function runSystemHealthCheck() {
  const checks = {
    connectivity: false,
    data: false,
    sheets: false,
    model: false
  };
  
  // Test connectivity
  try {
    WorkerClient.getHealth();
    checks.connectivity = true;
  } catch (e) {
    console.log('❌ Connectivity check failed');
  }
  
  // Test data freshness
  try {
    const snapshot = dataManager.snapshot('BTC');
    if (snapshot && snapshot.freshness === 'LIVE') {
      checks.data = true;
    } else {
      console.log('⚠️ Data is stale or unavailable');
    }
  } catch (e) {
    console.log('❌ Data check failed');
  }
  
  // Test sheets
  try {
    const settings = readSettingMap();
    if (settings && Object.keys(settings).length > 5) {
      checks.sheets = true;
    }
  } catch (e) {
    console.log('❌ Sheets check failed');
  }
  
  // Test model
  try {
    const weights = readWeights();
    if (weights && Object.keys(weights).length >= 8) {
      checks.model = true;
    }
  } catch (e) {
    console.log('❌ Model check failed');
  }
  
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  
  console.log(`Health check: ${passed}/${total} passed`);
  
  return {
    ...checks,
    allGood: passed === total
  };
}
```

## Debugging Examples

### Debug Market Data Issues
```javascript
// Debug market data pipeline
function debugMarketData(symbol) {
  console.log(`\n=== DEBUGGING MARKET DATA: ${symbol} ===`);
  
  // 1. Test worker connectivity
  console.log('1. Testing worker connectivity...');
  try {
    const health = WorkerClient.getHealth();
    console.log(`✅ Worker health: ${health.status}`);
  } catch (error) {
    console.log(`❌ Worker connectivity failed: ${error.message}`);
    return;
  }
  
  // 2. Test pack data
  console.log('\n2. Testing pack data...');
  try {
    const pack = _throttledPack([symbol]);
    console.log(`✅ Pack data received (${pack._source})`);
    
    if (pack.data && pack.data[symbol]) {
      const data = pack.data[symbol];
      console.log(`   Price: $${data.price}`);
      console.log(`   Source: ${data.source}`);
      console.log(`   Timestamp: ${data.timestampMskIso}`);
    } else {
      console.log(`❌ No data for ${symbol} in pack`);
    }
  } catch (error) {
    console.log(`❌ Pack data failed: ${error.message}`);
  }
  
  // 3. Test individual data sources
  console.log('\n3. Testing individual data sources...');
  
  // Order books
  try {
    const okxBook = dataManager.okxBook(symbol);
    console.log(`✅ OKX book: ${okxBook.data?.[0]?.bids?.length || 0} bids, ${okxBook.data?.[0]?.asks?.length || 0} asks`);
  } catch (error) {
    console.log(`❌ OKX book failed: ${error.message}`);
  }
  
  try {
    const binanceBook = dataManager.binanceBook(symbol);
    console.log(`✅ Binance book: ${binanceBook.bids?.length || 0} bids, ${binanceBook.asks?.length || 0} asks`);
  } catch (error) {
    console.log(`❌ Binance book failed: ${error.message}`);
  }
  
  // Trades
  try {
    const okxTrades = dataManager.okxTrades(symbol, 10);
    console.log(`✅ OKX trades: ${okxTrades.data?.length || 0} trades`);
  } catch (error) {
    console.log(`❌ OKX trades failed: ${error.message}`);
  }
  
  // 4. Test analytics
  console.log('\n4. Testing analytics...');
  
  try {
    const snapshot = dataManager.snapshot(symbol);
    if (snapshot) {
      const features = computeFeatures(symbol, snapshot);
      console.log(`✅ Features computed:`);
      console.log(`   OBI: ${features.OBI?.toFixed(3)}`);
      console.log(`   ATR: ${features.atr?.toFixed(2)}`);
      console.log(`   CVD: ${features.cvd?.toFixed(2)}`);
    } else {
      console.log(`❌ No snapshot available`);
    }
  } catch (error) {
    console.log(`❌ Analytics failed: ${error.message}`);
  }
}
```

### Performance Profiling
```javascript
// Profile system performance
function profileSystemPerformance() {
  console.log('\n=== SYSTEM PERFORMANCE PROFILING ===');
  
  const symbols = getSymbolsList();
  const results = {};
  
  // Profile data fetching
  console.log('\n1. Data Fetching Performance');
  
  const startTime = Date.now();
  
  // Pack request
  const packStart = Date.now();
  try {
    const pack = _throttledPack(symbols);
    results.packTime = Date.now() - packStart;
    console.log(`Pack request: ${results.packTime}ms`);
  } catch (error) {
    console.log(`Pack request failed: ${error.message}`);
  }
  
  // Individual symbol processing
  console.log('\n2. Symbol Processing Performance');
  const symbolTimes = {};
  
  symbols.slice(0, 3).forEach(symbol => { // Test first 3 symbols
    const symStart = Date.now();
    
    try {
      const snapshot = dataManager.snapshot(symbol);
      const features = computeFeatures(symbol, snapshot);
      const prob = modelScore(features, 'SWING');
      
      symbolTimes[symbol] = Date.now() - symStart;
      console.log(`${symbol}: ${symbolTimes[symbol]}ms`);
      
    } catch (error) {
      console.log(`${symbol}: ERROR - ${error.message}`);
    }
  });
  
  // Sheet operations
  console.log('\n3. Sheet Operations Performance');
  
  const sheetStart = Date.now();
  try {
    const settings = readSettingMap();
    const weights = readWeights();
    results.sheetTime = Date.now() - sheetStart;
    console.log(`Sheet operations: ${results.sheetTime}ms`);
  } catch (error) {
    console.log(`Sheet operations failed: ${error.message}`);
  }
  
  // Total time
  results.totalTime = Date.now() - startTime;
  
  console.log('\n=== PERFORMANCE SUMMARY ===');
  console.log(`Total execution time: ${results.totalTime}ms`);
  console.log(`Average symbol processing: ${Object.values(symbolTimes).length > 0 ? Math.round(U.mean(Object.values(symbolTimes))) : 'N/A'}ms`);
  console.log(`Symbols per second: ${Object.values(symbolTimes).length > 0 ? (Object.values(symbolTimes).length / (results.totalTime / 1000)).toFixed(2) : 'N/A'}`);
  
  // Performance recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  if (results.totalTime > 30000) {
    console.log('⚠️ Total execution time is high (>30s)');
    console.log('   Consider reducing number of symbols or optimizing data fetching');
  }
  
  if (results.packTime > 10000) {
    console.log('⚠️ Pack request is slow (>10s)');
    console.log('   Check worker performance and network connectivity');
  }
  
  const avgSymbolTime = U.mean(Object.values(symbolTimes));
  if (avgSymbolTime > 5000) {
    console.log('⚠️ Symbol processing is slow (>5s per symbol)');
    console.log('   Consider optimizing feature computation or caching');
  }
  
  return results;
}
```

This comprehensive usage examples document demonstrates practical implementation patterns for all major components of the Crypto Quantum Trader Pro system, from basic data retrieval to complex trading workflows and debugging techniques.