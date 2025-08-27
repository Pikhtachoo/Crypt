# Trading & Risk Management Functions

This document covers the core trading logic, signal generation, risk management, and trade execution functions in the Crypto Quantum Trader Pro system.

## Overview

The trading system implements a comprehensive approach to cryptocurrency trading with:

- **Signal Generation**: ML-based probability assessment with multi-factor analysis
- **Risk Management**: Dynamic position sizing, stop-losses, and daily limits
- **Trade Execution**: Automated position opening with multiple take-profit levels
- **Event Management**: Special handling during high-volatility periods
- **Portfolio Management**: Position limits and correlation-based adjustments

## Signal Generation Functions

### `computeFeatures(sym, snap)`
Computes all technical features required for model prediction.

**Parameters**:
- `sym` (string): Cryptocurrency symbol
- `snap` (Object): Price snapshot from `dataManager.snapshot()`

**Returns**: `Object` - Complete feature vector for ML model

**Feature Computation Process**:
1. **Order Book Analysis**: Get OBI and support/resistance walls
2. **Technical Indicators**: Calculate ATR for volatility measurement  
3. **Market Microstructure**: Analyze CVD, funding rate, and open interest
4. **Correlation Adjustment**: Apply BTC correlation factor for altcoins
5. **Projected Movement**: Calculate expected price range based on walls

**Example**:
```javascript
const snapshot = dataManager.snapshot('BTC');
const features = computeFeatures('BTC', snapshot);

console.log('Computed Features:');
console.log(`  OBI: ${features.OBI.toFixed(3)} (${features.OBI > 0 ? 'bid pressure' : 'ask pressure'})`);
console.log(`  Funding: ${(features.funding * 100).toFixed(4)}% (${features.funding > 0 ? 'bullish sentiment' : 'bearish sentiment'})`);
console.log(`  CVD: ${features.cvd.toFixed(2)} (${features.cvd > 0 ? 'buying pressure' : 'selling pressure'})`);
console.log(`  dOI: ${features.dOI} (${features.dOI > 0 ? 'positions opening' : 'positions closing'})`);
console.log(`  ATR: $${features.atr.toFixed(2)} (volatility measure)`);
console.log(`  Proj: ${(features.proj * 100).toFixed(2)}% (expected move)`);
console.log(`  BTC Adj: ${features.btcAdj.toFixed(3)} (correlation factor)`);
console.log(`  Support: ${features.floor ? '$' + features.floor.toFixed(2) : 'None'}`);
console.log(`  Resistance: ${features.ceil ? '$' + features.ceil.toFixed(2) : 'None'}`);
```

**Feature Validation**:
```javascript
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
  if (Math.abs(features.OBI) > 1) issues.push(`OBI out of range: ${features.OBI}`);
  if (Math.abs(features.funding) > 0.1) issues.push(`Funding rate extreme: ${features.funding}`);
  if (features.proj < 0 || features.proj > 1) issues.push(`Projection out of range: ${features.proj}`);
  if (Math.abs(features.btcAdj) > 0.15) issues.push(`BTC adjustment extreme: ${features.btcAdj}`);
  
  return issues;
}
```

---

### `decideHorizon(px, floor, ceil)`
Determines the appropriate trading horizon based on projected price movement.

**Parameters**:
- `px` (number): Current price
- `floor` (number): Support level (can be null)
- `ceil` (number): Resistance level (can be null)

**Returns**: `string` - Trading horizon: 'SCALP', 'SWING', or 'POSITION'

**Horizon Logic**:
- **SCALP**: Distance to nearest wall ≤ 0.4% of price (≤1 hour trades)
- **SWING**: Distance to nearest wall ≤ 2.0% of price (1-6 hour trades)  
- **POSITION**: Distance to nearest wall > 2.0% of price (6+ hour trades)

**Example**:
```javascript
const price = 45000;
const support = 44500;  // 1.11% below
const resistance = 46000; // 2.22% above

const horizon = decideHorizon(price, support, resistance);
console.log(`Trading horizon: ${horizon}`);

// Calculate distances for analysis
const upDistance = resistance ? ((resistance - price) / price * 100) : Infinity;
const downDistance = support ? ((price - support) / price * 100) : Infinity;
const minDistance = Math.min(upDistance, downDistance);

console.log(`Distance to nearest wall: ${minDistance.toFixed(2)}%`);
console.log(`Up to resistance: ${upDistance.toFixed(2)}%`);
console.log(`Down to support: ${downDistance.toFixed(2)}%`);

// Horizon-specific parameters
const horizonConfig = {
  'SCALP': { 
    ttl: TTL_SCALP_MIN,     // 60 minutes
    riskMult: 1.0,
    tpLevels: 2             // Use fewer TP levels
  },
  'SWING': { 
    ttl: TTL_SWING_MIN,     // 360 minutes
    riskMult: 1.0,
    tpLevels: 4             // Use all TP levels
  },
  'POSITION': { 
    ttl: TTL_POSITION_MIN,  // 1440 minutes
    riskMult: 0.8,          // Reduced risk for longer trades
    tpLevels: 4
  }
};

const config = horizonConfig[horizon];
console.log(`Configuration: TTL=${config.ttl}min, Risk=${config.riskMult}, TPs=${config.tpLevels}`);
```

---

### `decideSignal(prob, longMin, shortMax)`
Converts model probability into trading signal using configurable thresholds.

**Parameters**:
- `prob` (number): Model probability (0-1 scale)
- `longMin` (number): Minimum probability for LONG signals (typically 0.55)
- `shortMax` (number): Maximum probability for SHORT signals (typically 0.45)

**Returns**: `string` - Trading signal: 'LONG', 'SHORT', or 'NEUTRAL'

**Signal Logic**:
- `prob >= longMin`: Generate LONG signal
- `prob <= shortMax`: Generate SHORT signal  
- `shortMax < prob < longMin`: Generate NEUTRAL signal

**Example**:
```javascript
// Test different probability values
const testProbs = [0.2, 0.4, 0.45, 0.5, 0.55, 0.7, 0.9];
const longThreshold = 0.55;
const shortThreshold = 0.45;

console.log('Signal Generation Test:');
testProbs.forEach(prob => {
  const signal = decideSignal(prob, longThreshold, shortThreshold);
  const confidence = Math.abs(prob - 0.5) * 2; // 0-1 scale
  
  console.log(`  Prob: ${(prob * 100).toFixed(0)}% → Signal: ${signal.padEnd(7)} (confidence: ${(confidence * 100).toFixed(0)}%)`);
});

// Output:
// Prob: 20% → Signal: SHORT   (confidence: 60%)
// Prob: 40% → Signal: SHORT   (confidence: 20%)
// Prob: 45% → Signal: SHORT   (confidence: 10%)
// Prob: 50% → Signal: NEUTRAL (confidence: 0%)
// Prob: 55% → Signal: LONG    (confidence: 10%)
// Prob: 70% → Signal: LONG    (confidence: 40%)
// Prob: 90% → Signal: LONG    (confidence: 80%)
```

**Dynamic Threshold Adjustment**:
```javascript
function adaptiveThresholds(marketCondition) {
  let longMin = LONG_PROB_MIN;
  let shortMax = SHORT_PROB_MAX;
  
  // Adjust thresholds based on market conditions
  switch (marketCondition) {
    case 'HIGH_VOLATILITY':
      longMin += 0.05;  // Require higher confidence
      shortMax -= 0.05;
      break;
    case 'LOW_VOLATILITY':
      longMin -= 0.02;  // Allow lower confidence
      shortMax += 0.02;
      break;
    case 'TRENDING':
      longMin -= 0.03;  // Favor trend following
      shortMax += 0.03;
      break;
    case 'RANGING':
      longMin += 0.03;  // Require higher confidence in ranges
      shortMax -= 0.03;
      break;
  }
  
  // Ensure valid ranges
  longMin = U.clamp(longMin, 0.51, 0.8);
  shortMax = U.clamp(shortMax, 0.2, 0.49);
  
  return { longMin, shortMax };
}
```

## Risk Management Functions

### `calcSL_TPs(side, px, atr, floor, ceil, eventSLmult)`
Calculates stop-loss and take-profit levels using technical analysis and risk management rules.

**Parameters**:
- `side` (string): Trade direction ('LONG' or 'SHORT')
- `px` (number): Entry price
- `atr` (number): Average True Range for volatility-based stops
- `floor` (number): Support level from order book analysis
- `ceil` (number): Resistance level from order book analysis
- `eventSLmult` (number): Event-based stop-loss multiplier

**Returns**: `Object` - Stop-loss and take-profit configuration

**Return Structure**:
```javascript
{
  SL: 44850.5,           // Stop-loss price
  TPs: [                 // Take-profit levels (4 levels)
    45900.0,             // TP1 (1R)
    46890.0,             // TP2 (1.8R)
    48150.0,             // TP3 (3R)
    49725.0              // TP4 (4.5R)
  ],
  R: 149.5               // Risk amount (entry - SL)
}
```

**Stop-Loss Logic**:
1. **Wall-Based**: Use order book walls with buffer if available
2. **ATR-Based**: Use volatility-based distance as fallback
3. **Minimum**: Apply minimum stop distance (ATR_MIN_RATIO)
4. **Event Adjustment**: Apply event multiplier during high-volatility periods

**Example**:
```javascript
const side = 'LONG';
const entryPrice = 45000;
const atr = 150;          // $150 ATR
const support = 44500;    // Support wall
const resistance = 46000; // Resistance wall
const eventMult = 1.0;    // Normal conditions

const levels = calcSL_TPs(side, entryPrice, atr, support, resistance, eventMult);

console.log('Risk Management Levels:');
console.log(`  Entry: $${entryPrice}`);
console.log(`  Stop-Loss: $${levels.SL.toFixed(2)}`);
console.log(`  Risk (R): $${levels.R.toFixed(2)}`);
console.log(`  Risk %: ${(levels.R / entryPrice * 100).toFixed(2)}%`);

console.log('\n  Take-Profit Levels:');
levels.TPs.forEach((tp, i) => {
  const rMultiple = TP_R[i];
  const allocation = TP_ALLOCATION[i] * 100;
  const gain = tp - entryPrice;
  const gainPercent = (gain / entryPrice * 100);
  
  console.log(`    TP${i+1}: $${tp.toFixed(2)} (${rMultiple}R, ${allocation}%, +${gainPercent.toFixed(2)}%)`);
});

// Risk-reward analysis
const totalReward = levels.TPs.reduce((sum, tp, i) => {
  const gain = tp - entryPrice;
  return sum + (gain * TP_ALLOCATION[i]);
}, 0);

const riskRewardRatio = totalReward / levels.R;
console.log(`\n  Risk-Reward Ratio: ${riskRewardRatio.toFixed(2)}:1`);
```

**Event-Based Adjustments**:
```javascript
function calculateEventAdjustedLevels(side, px, atr, floor, ceil) {
  const eventPolicy = currentEventPolicy();
  
  // Apply event multipliers
  const eventSLmult = eventPolicy.active ? eventPolicy.slMult : 1.0;
  const eventRiskMult = eventPolicy.active ? eventPolicy.riskMult : 1.0;
  
  // Calculate base levels
  const baseLevels = calcSL_TPs(side, px, atr, floor, ceil, eventSLmult);
  
  if (eventPolicy.active) {
    console.log('⚠️ Event mode active - applying adjustments:');
    console.log(`  SL multiplier: ${eventSLmult}`);
    console.log(`  Risk multiplier: ${eventRiskMult}`);
    console.log(`  Base SL: $${baseLevels.SL.toFixed(2)}`);
    
    // Tighter stop-loss in event mode
    const tighterR = baseLevels.R * eventSLmult;
    const adjustedSL = side === 'LONG' ? px - tighterR : px + tighterR;
    
    console.log(`  Adjusted SL: $${adjustedSL.toFixed(2)}`);
    
    return {
      ...baseLevels,
      SL: adjustedSL,
      R: tighterR,
      eventAdjusted: true,
      riskMultiplier: eventRiskMult
    };
  }
  
  return { ...baseLevels, eventAdjusted: false, riskMultiplier: 1.0 };
}
```

---

### `canOpenMoreForSymbol(sym)`
Checks if additional positions can be opened for a specific symbol based on position limits.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `boolean` - True if more positions can be opened

**Position Limit Logic**:
- Maximum 1 active position per symbol
- Prevents over-concentration in single assets
- Checks active signals sheet for existing positions

**Example**:
```javascript
const symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA'];

console.log('Position Availability Check:');
symbols.forEach(symbol => {
  const canOpen = canOpenMoreForSymbol(symbol);
  const status = canOpen ? '✅ Available' : '❌ Position exists';
  console.log(`  ${symbol}: ${status}`);
});

// Advanced position management
function getPortfolioPositions() {
  const activeSheet = U.getOrCreate('📊 АКТИВНЫЕ СИГНАЛЫ', []);
  const rows = activeSheet.getDataRange().getValues().slice(1);
  
  const positions = rows
    .filter(row => row[0] && row[1]) // Has ID and Symbol
    .map(row => ({
      id: row[0],
      symbol: row[1],
      side: row[2],
      entry: parseFloat(row[3]),
      currentR: parseFloat(row[16]) || 0,
      leftPercent: parseFloat(row[14]) || 1.0
    }));
  
  return positions;
}

function analyzePortfolioRisk() {
  const positions = getPortfolioPositions();
  
  if (positions.length === 0) {
    console.log('No active positions');
    return;
  }
  
  console.log(`Active Positions: ${positions.length}`);
  
  let totalRisk = 0;
  const bySide = { LONG: 0, SHORT: 0 };
  const bySymbol = {};
  
  positions.forEach(pos => {
    totalRisk += Math.abs(pos.currentR);
    bySide[pos.side] = (bySide[pos.side] || 0) + 1;
    bySymbol[pos.symbol] = (bySymbol[pos.symbol] || 0) + 1;
  });
  
  console.log(`  Total risk: ${totalRisk.toFixed(2)}R`);
  console.log(`  Long positions: ${bySide.LONG || 0}`);
  console.log(`  Short positions: ${bySide.SHORT || 0}`);
  console.log(`  Symbols: ${Object.keys(bySymbol).join(', ')}`);
}
```

---

### Event & Risk Management

#### `currentEventPolicy()`
Retrieves the current event-based risk management policy.

**Returns**: `Object` - Current event policy configuration

**Policy Structure**:
```javascript
{
  riskMult: 0.5,         // Risk multiplier (reduces position size)
  slMult: 1.2,           // Stop-loss multiplier (tighter stops)
  blockScalp: true,      // Whether to block scalping
  active: true           // Whether event mode is currently active
}
```

**Example**:
```javascript
const policy = currentEventPolicy();

console.log('Current Risk Policy:');
console.log(`  Event mode: ${policy.active ? '🔴 ACTIVE' : '🟢 Normal'}`);

if (policy.active) {
  console.log(`  Risk reduction: ${((1 - policy.riskMult) * 100).toFixed(0)}%`);
  console.log(`  Stop-loss adjustment: ${((policy.slMult - 1) * 100).toFixed(0)}% tighter`);
  console.log(`  Scalping blocked: ${policy.blockScalp ? 'Yes' : 'No'}`);
} else {
  console.log(`  Standard risk parameters in effect`);
}

// Apply policy to position sizing
function calculatePositionSize(riskUSD, stopDistance, price, policy) {
  let adjustedRisk = riskUSD;
  
  if (policy.active) {
    adjustedRisk *= policy.riskMult;
    console.log(`Risk reduced from $${riskUSD} to $${adjustedRisk.toFixed(2)} due to event policy`);
  }
  
  const positionSize = adjustedRisk / (stopDistance / price);
  return positionSize;
}
```

---

#### `dailyRiskUsedUSD()`
Calculates the total risk used today in USD terms.

**Returns**: `number` - Amount of risk used today in USD

**Calculation Logic**:
- Analyzes completed trades from today (closed positions)
- Sums absolute losses (negative R values)
- Converts R to USD using account size and risk percentage

**Example**:
```javascript
const dailyRisk = dailyRiskUsedUSD();
const dailyLimit = DAILY_RISK_LIMIT_USD;
const remainingRisk = Math.max(0, dailyLimit - dailyRisk);
const riskPercent = (dailyRisk / dailyLimit * 100);

console.log('Daily Risk Analysis:');
console.log(`  Risk used: $${dailyRisk.toFixed(2)}`);
console.log(`  Daily limit: $${dailyLimit.toFixed(2)}`);
console.log(`  Remaining: $${remainingRisk.toFixed(2)}`);
console.log(`  Used: ${riskPercent.toFixed(1)}% of daily limit`);

// Risk management decisions
if (riskPercent > 80) {
  console.log('⚠️ Approaching daily risk limit - reduce activity');
} else if (riskPercent > 50) {
  console.log('⚠️ Over 50% of daily risk used - proceed with caution');
} else {
  console.log('✅ Daily risk usage within normal range');
}

// Calculate maximum additional trades
const riskPerTrade = ACCOUNT_SIZE_USD * (RISK_PER_TRADE_PCT / 100);
const maxAdditionalTrades = Math.floor(remainingRisk / riskPerTrade);
console.log(`  Max additional trades today: ${maxAdditionalTrades}`);
```

**Risk Tracking Enhancement**:
```javascript
function analyzeRiskByTimeOfDay() {
  const archiveSheet = U.getOrCreate('📦 АРХИВ СИГНАЛОВ', []);
  const trades = archiveSheet.getDataRange().getValues().slice(1);
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  
  const hourlyRisk = new Array(24).fill(0);
  let totalTrades = 0;
  
  trades.forEach(trade => {
    const closedTime = String(trade[10] || '');
    if (!closedTime.startsWith(today)) return;
    
    const R = parseFloat(trade[6]) || 0;
    if (R < 0) { // Only count losses
      const hour = parseInt(closedTime.split(' ')[1].split(':')[0]);
      const riskUSD = Math.abs(R) * ACCOUNT_SIZE_USD * (RISK_PER_TRADE_PCT / 100);
      hourlyRisk[hour] += riskUSD;
      totalTrades++;
    }
  });
  
  console.log('Risk by Hour of Day:');
  hourlyRisk.forEach((risk, hour) => {
    if (risk > 0) {
      console.log(`  ${hour.toString().padStart(2, '0')}:00 - $${risk.toFixed(2)}`);
    }
  });
}
```

## Trade Execution Functions

### `openTrade(sym, side, snap, feats, prob, horizon, ttlMin, sl, tps, R, reason)`
Opens a new trading position with complete parameter specification.

**Parameters**:
- `sym` (string): Symbol
- `side` (string): 'LONG' or 'SHORT'
- `snap` (Object): Price snapshot
- `feats` (Object): Feature vector
- `prob` (number): Model probability
- `horizon` (string): Trading horizon
- `ttlMin` (number): Time to live in minutes
- `sl` (number): Stop-loss level
- `tps` (Array): Take-profit levels
- `R` (number): Risk amount
- `reason` (string): Reason for opening

**Returns**: `string` - Unique trade ID

**Trade Record Structure**:
```javascript
[
  id,                    // Unique trade ID
  sym,                   // Symbol
  side,                  // LONG/SHORT
  snap.price,            // Entry price
  sl,                    // Stop-loss
  tps[0], tps[1], tps[2], tps[3],  // TP levels
  alloc[0], alloc[1], alloc[2], alloc[3],  // Allocations
  1.00,                  // Left % (starts at 100%)
  0.0,                   // Average exit (starts at 0)
  0.0,                   // Current R (starts at 0)
  horizon,               // Trading horizon
  ttlMin,                // TTL in minutes
  snap.src,              // Data source
  reason,                // Opening reason
  U.nowStr(),            // Created timestamp
  snap.freshness         // Data freshness
]
```

**Example**:
```javascript
// Complete trade opening workflow
function executeTradeSignal(symbol) {
  // 1. Check if we can open more positions
  if (!canOpenMoreForSymbol(symbol)) {
    console.log(`Cannot open more positions for ${symbol}`);
    return null;
  }
  
  // 2. Get market data
  const snapshot = dataManager.snapshot(symbol);
  if (!snapshot) {
    console.log(`No market data for ${symbol}`);
    return null;
  }
  
  // 3. Compute features
  const features = computeFeatures(symbol, snapshot);
  const featureIssues = validateFeatures(features);
  if (featureIssues.length > 0) {
    console.log(`Feature validation failed: ${featureIssues.join(', ')}`);
    return null;
  }
  
  // 4. Determine horizon
  const horizon = decideHorizon(snapshot.price, features.floor, features.ceil);
  
  // 5. Get model prediction
  const probability = modelScore(features, horizon);
  
  // 6. Generate signal
  const signal = decideSignal(probability, LONG_PROB_MIN, SHORT_PROB_MAX);
  if (signal === 'NEUTRAL') {
    console.log(`Neutral signal for ${symbol} (prob: ${(probability * 100).toFixed(1)}%)`);
    return null;
  }
  
  // 7. Check event policy
  const eventPolicy = currentEventPolicy();
  if (eventPolicy.active && eventPolicy.blockScalp && horizon === 'SCALP') {
    console.log(`Scalping blocked due to event policy`);
    return null;
  }
  
  // 8. Check daily risk limit
  const dailyRisk = dailyRiskUsedUSD();
  if (dailyRisk >= DAILY_RISK_LIMIT_USD) {
    console.log(`Daily risk limit exceeded: $${dailyRisk}`);
    return null;
  }
  
  // 9. Calculate levels
  const levels = calculateEventAdjustedLevels(
    signal, snapshot.price, features.atr, features.floor, features.ceil
  );
  
  // 10. Determine TTL
  const ttlMap = {
    'SCALP': TTL_SCALP_MIN,
    'SWING': TTL_SWING_MIN,
    'POSITION': TTL_POSITION_MIN
  };
  const ttl = ttlMap[horizon];
  
  // 11. Create reason string
  const reason = `${signal} signal (p=${(probability * 100).toFixed(1)}%, h=${horizon})`;
  
  // 12. Open trade
  const tradeId = openTrade(
    symbol, signal, snapshot, features, probability, horizon,
    ttl, levels.SL, levels.TPs, levels.R, reason
  );
  
  console.log(`✅ Opened ${signal} trade for ${symbol}: ${tradeId}`);
  console.log(`  Entry: $${snapshot.price}, SL: $${levels.SL.toFixed(2)}, Risk: $${levels.R.toFixed(2)}`);
  
  return tradeId;
}
```

---

### `processActive()`
Processes all active trades, checking for stop-loss hits, take-profit executions, and TTL expiry.

**Key Functions**:
- **Price Monitoring**: Check current prices against SL/TP levels
- **Partial Exits**: Handle take-profit level hits with allocation percentages
- **TTL Management**: Close expired trades
- **P&L Tracking**: Update current R values and average exit prices
- **Trade Archival**: Move completed trades to archive sheet

**Processing Logic**:
```javascript
// Simplified version of processActive workflow
function processActiveTradesWorkflow() {
  const activeSheet = U.getOrCreate('📊 АКТИВНЫЕ СИГНАЛЫ', []);
  const archiveSheet = U.getOrCreate('📦 АРХИВ СИГНАЛОВ', []);
  
  const trades = getActiveTradesData();
  const toArchive = [];
  
  trades.forEach(trade => {
    const currentPrice = getCurrentPrice(trade.symbol);
    if (!currentPrice) return;
    
    // Check stop-loss
    const slHit = (trade.side === 'LONG' && currentPrice <= trade.SL) ||
                  (trade.side === 'SHORT' && currentPrice >= trade.SL);
    
    if (slHit) {
      // Full stop-loss exit
      const finalR = trade.side === 'LONG' ? 
        (currentPrice - trade.entry) / (trade.entry - trade.SL) :
        (trade.entry - currentPrice) / (trade.SL - trade.entry);
      
      toArchive.push({
        ...trade,
        exitPrice: currentPrice,
        finalR: -1.0, // Always -1R for SL hits
        exitReason: 'Stop-Loss'
      });
      
      console.log(`🔴 Stop-loss hit: ${trade.symbol} ${trade.side} at $${currentPrice}`);
      return;
    }
    
    // Check take-profit levels
    let updatedTrade = { ...trade };
    let partialExit = false;
    
    for (let i = 0; i < trade.TPs.length; i++) {
      if (trade.allocations[i] <= 0) continue; // Already taken
      
      const tpHit = (trade.side === 'LONG' && currentPrice >= trade.TPs[i]) ||
                    (trade.side === 'SHORT' && currentPrice <= trade.TPs[i]);
      
      if (tpHit) {
        // Partial take-profit
        const allocation = trade.allocations[i];
        updatedTrade.allocations[i] = 0;
        updatedTrade.leftPercent -= allocation;
        
        // Update average exit price
        const exitValue = currentPrice * allocation;
        const totalExitValue = trade.avgExit * (1 - updatedTrade.leftPercent - allocation) + exitValue;
        updatedTrade.avgExit = totalExitValue / (1 - updatedTrade.leftPercent);
        
        // Update current R
        const partialR = trade.side === 'LONG' ?
          (currentPrice - trade.entry) / (trade.entry - trade.SL) * allocation :
          (trade.entry - currentPrice) / (trade.SL - trade.entry) * allocation;
        
        updatedTrade.currentR += partialR;
        
        console.log(`🟢 TP${i+1} hit: ${trade.symbol} ${trade.side} at $${currentPrice} (${(allocation*100).toFixed(0)}%)`);
        partialExit = true;
      }
    }
    
    // Check if trade is fully closed
    if (updatedTrade.leftPercent <= 0.01) { // Essentially zero
      toArchive.push({
        ...updatedTrade,
        exitReason: 'All TPs Hit'
      });
      return;
    }
    
    // Check TTL expiry
    const createdTime = new Date(trade.created);
    const elapsed = (Date.now() - createdTime.getTime()) / (1000 * 60); // minutes
    
    if (elapsed >= trade.ttl) {
      // TTL expiry - close at market
      const finalR = trade.side === 'LONG' ?
        (currentPrice - trade.entry) / (trade.entry - trade.SL) * updatedTrade.leftPercent :
        (trade.entry - currentPrice) / (trade.SL - trade.entry) * updatedTrade.leftPercent;
      
      updatedTrade.currentR += finalR;
      
      toArchive.push({
        ...updatedTrade,
        exitPrice: currentPrice,
        exitReason: 'TTL Expiry'
      });
      
      console.log(`⏰ TTL expiry: ${trade.symbol} ${trade.side} at $${currentPrice} after ${elapsed.toFixed(0)}min`);
      return;
    }
    
    // Update active trade if partial exit occurred
    if (partialExit) {
      updateActiveTrade(updatedTrade);
    }
  });
  
  // Archive completed trades
  toArchive.forEach(trade => {
    archiveTrade(trade);
    removeFromActive(trade.id);
  });
  
  console.log(`Processed ${trades.length} active trades, archived ${toArchive.length}`);
}
```

## Portfolio Management

### Position Correlation Management
```javascript
function analyzePositionCorrelations() {
  const positions = getPortfolioPositions();
  if (positions.length < 2) return;
  
  console.log('Position Correlation Analysis:');
  
  // Get recent returns for each symbol
  const returns = {};
  positions.forEach(pos => {
    returns[pos.symbol] = getRecentReturns(pos.symbol, 100);
  });
  
  // Calculate pairwise correlations
  const correlations = {};
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const sym1 = positions[i].symbol;
      const sym2 = positions[j].symbol;
      const corr = U.corr(returns[sym1], returns[sym2]);
      correlations[`${sym1}-${sym2}`] = corr;
      
      console.log(`  ${sym1}-${sym2}: ${corr.toFixed(3)}`);
    }
  }
  
  // Check for high correlations
  const highCorr = Object.entries(correlations).filter(([pair, corr]) => Math.abs(corr) > 0.7);
  if (highCorr.length > 0) {
    console.log('⚠️ High correlation positions detected:');
    highCorr.forEach(([pair, corr]) => {
      console.log(`  ${pair}: ${corr.toFixed(3)}`);
    });
  }
}
```

### Risk Budgeting
```javascript
function allocateRiskBudget() {
  const dailyBudget = DAILY_RISK_LIMIT_USD;
  const used = dailyRiskUsedUSD();
  const remaining = Math.max(0, dailyBudget - used);
  
  const symbols = getSymbolsList();
  const signals = [];
  
  // Generate signals for all symbols
  symbols.forEach(symbol => {
    if (canOpenMoreForSymbol(symbol)) {
      const signal = generateTradingSignal(symbol);
      if (signal && signal.signal !== 'NEUTRAL') {
        signals.push(signal);
      }
    }
  });
  
  if (signals.length === 0) {
    console.log('No valid signals generated');
    return;
  }
  
  // Sort by confidence
  signals.sort((a, b) => b.confidence - a.confidence);
  
  // Allocate risk budget
  const riskPerTrade = ACCOUNT_SIZE_USD * (RISK_PER_TRADE_PCT / 100);
  const maxTrades = Math.floor(remaining / riskPerTrade);
  const selectedSignals = signals.slice(0, Math.min(maxTrades, signals.length));
  
  console.log('Risk Budget Allocation:');
  console.log(`  Daily budget: $${dailyBudget}`);
  console.log(`  Used: $${used.toFixed(2)}`);
  console.log(`  Remaining: $${remaining.toFixed(2)}`);
  console.log(`  Max new trades: ${maxTrades}`);
  console.log(`  Selected signals: ${selectedSignals.length}`);
  
  selectedSignals.forEach((signal, i) => {
    console.log(`  ${i+1}. ${signal.symbol} ${signal.signal} (${(signal.confidence * 100).toFixed(0)}% confidence)`);
  });
  
  return selectedSignals;
}
```

## Performance Analytics

### Trade Performance Analysis
```javascript
function analyzeTradePerformance(days = 30) {
  const archiveSheet = U.getOrCreate('📦 АРХИВ СИГНАЛОВ', []);
  const trades = archiveSheet.getDataRange().getValues().slice(1);
  
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentTrades = trades.filter(trade => {
    const closedDate = new Date(trade[10]); // Closed time
    return closedDate >= cutoff;
  });
  
  if (recentTrades.length === 0) {
    console.log(`No trades in last ${days} days`);
    return;
  }
  
  // Calculate metrics
  const metrics = {
    totalTrades: recentTrades.length,
    winners: 0,
    losers: 0,
    totalR: 0,
    maxWin: -Infinity,
    maxLoss: Infinity,
    avgDuration: 0,
    byHorizon: { SCALP: [], SWING: [], POSITION: [] },
    bySide: { LONG: [], SHORT: [] }
  };
  
  recentTrades.forEach(trade => {
    const R = parseFloat(trade[6]) || 0;
    const duration = parseFloat(trade[8]) || 0;
    const side = String(trade[2]);
    
    metrics.totalR += R;
    metrics.avgDuration += duration;
    
    if (R > 0) {
      metrics.winners++;
      metrics.maxWin = Math.max(metrics.maxWin, R);
    } else {
      metrics.losers++;
      metrics.maxLoss = Math.min(metrics.maxLoss, R);
    }
    
    // Categorize by side
    if (metrics.bySide[side]) {
      metrics.bySide[side].push(R);
    }
  });
  
  metrics.avgDuration /= metrics.totalTrades;
  const winRate = metrics.winners / metrics.totalTrades;
  const avgR = metrics.totalR / metrics.totalTrades;
  const profitFactor = metrics.winners > 0 && metrics.losers > 0 ?
    (metrics.winners * Math.abs(metrics.maxWin)) / (metrics.losers * Math.abs(metrics.maxLoss)) : 0;
  
  console.log(`Trade Performance (Last ${days} days):`);
  console.log(`  Total trades: ${metrics.totalTrades}`);
  console.log(`  Win rate: ${(winRate * 100).toFixed(1)}%`);
  console.log(`  Average R: ${avgR.toFixed(3)}`);
  console.log(`  Total R: ${metrics.totalR.toFixed(2)}`);
  console.log(`  Max win: ${metrics.maxWin.toFixed(2)}R`);
  console.log(`  Max loss: ${metrics.maxLoss.toFixed(2)}R`);
  console.log(`  Average duration: ${metrics.avgDuration.toFixed(0)} minutes`);
  console.log(`  Profit factor: ${profitFactor.toFixed(2)}`);
  
  // Side analysis
  Object.entries(metrics.bySide).forEach(([side, results]) => {
    if (results.length > 0) {
      const sideWinRate = results.filter(r => r > 0).length / results.length;
      const sideAvgR = U.mean(results);
      console.log(`  ${side}: ${results.length} trades, ${(sideWinRate * 100).toFixed(1)}% win rate, ${sideAvgR.toFixed(3)} avg R`);
    }
  });
}
```

---

The trading and risk management functions provide a comprehensive framework for automated cryptocurrency trading with robust risk controls, position management, and performance tracking.