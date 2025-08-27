# Machine Learning Model Documentation

The Crypto Quantum Trader Pro system uses a logistic regression model with online learning capabilities to predict trade profitability. This document covers the model architecture, features, training process, and usage.

## Model Overview

The system implements a **logistic regression classifier** with the following characteristics:

- **Binary Classification**: Predicts probability of profitable trade (0-1 scale)
- **Online Learning**: Continuously updates weights based on trade outcomes
- **Feature Engineering**: Uses multiple market indicators as input features
- **Regularization**: L2 regularization prevents overfitting
- **Multi-Horizon**: Separate parameters for different trading horizons

## Architecture

```
Input Features → Linear Combination → Sigmoid → Probability
     ↓                 ↓                ↓           ↓
Market Data    →   z = w₀ + Σwᵢxᵢ   →  σ(z)  →  p ∈ [0,1]
```

### Mathematical Foundation

**Linear Combination**:
```
z = bias + w_OBI×OBI + w_funding×funding + w_dOI×dOI + w_CVD×CVD + 
    w_proj×proj + w_btcAdj×btcAdj + w_horizon×horizon_indicator
```

**Sigmoid Function**:
```
p = σ(z) = 1 / (1 + e^(-z))
```

**Online Learning Update**:
```
w_i ← w_i - lr × (gradient + l2 × w_i)
gradient = (predicted - actual) × feature_i
```

## Features

The model uses the following features to make predictions:

### Core Market Features

#### 1. OBI (Order Book Imbalance)
- **Range**: -1.0 to 1.0
- **Formula**: `(bid_volume - ask_volume) / (bid_volume + ask_volume)`
- **Interpretation**: 
  - Positive: More buying pressure
  - Negative: More selling pressure
- **Weight**: Typically positive (bullish bias for positive OBI)

#### 2. Funding Rate
- **Range**: Typically -0.01 to 0.01 (±1%)
- **Source**: Perpetual futures funding rate
- **Interpretation**:
  - Positive: Longs pay shorts (bullish sentiment)
  - Negative: Shorts pay longs (bearish sentiment)
- **Weight**: Typically negative (contrarian indicator)

#### 3. dOI (Delta Open Interest)
- **Range**: Varies by symbol (absolute change in contracts)
- **Calculation**: Current OI - Previous OI
- **Interpretation**:
  - Positive: New positions opening
  - Negative: Positions closing
- **Weight**: Typically positive (increasing OI shows commitment)

#### 4. CVD (Cumulative Volume Delta)
- **Range**: Varies by symbol and timeframe
- **Calculation**: Sum of (buy_volume - sell_volume) from recent trades
- **Interpretation**:
  - Positive: Net buying pressure
  - Negative: Net selling pressure
- **Weight**: Typically positive (buying pressure is bullish)

#### 5. Proj (Projected Move)
- **Range**: 0.0 to ~0.1 (0% to 10% of price)
- **Calculation**: Distance to nearest order book wall / current_price
- **Interpretation**: Expected price movement based on support/resistance
- **Weight**: Typically positive (larger projected moves favor trading)

#### 6. BTCadj (Bitcoin Adjustment)
- **Range**: -0.12 to 0.12
- **Calculation**: Correlation with BTC × 0.12
- **Purpose**: Adjusts altcoin signals based on BTC correlation
- **Weight**: Typically positive (positive BTC correlation helps)

### Horizon Features

The model includes binary indicators for trading horizons:

#### H_SCALP
- **Value**: 1 if horizon is 'SCALP', 0 otherwise
- **Purpose**: Adjusts model for short-term trades (≤1 hour)
- **Weight**: Small positive (scalping has slight edge in some conditions)

#### H_SWING  
- **Value**: 1 if horizon is 'SWING', 0 otherwise
- **Purpose**: Adjusts model for medium-term trades (1-6 hours)
- **Weight**: Small positive (swing trades often work well)

#### H_POSITION
- **Value**: 1 if horizon is 'POSITION', 0 otherwise  
- **Purpose**: Adjusts model for long-term trades (6+ hours)
- **Weight**: Small negative (position trades have higher risk)

## Model Functions

### Sheet Management

#### `ensureModelSheet()`
Creates and initializes the model weights sheet with default values.

**Returns**: `Sheet` - The model weights sheet

**Default Weights**:
```javascript
[
  ['bias',        -0.10],   // Slight bearish bias
  ['OBI',          0.80],   // Strong positive weight
  ['Funding',     -0.50],   // Contrarian indicator
  ['dOI',          0.35],   // Positive OI change is good
  ['CVD',          0.20],   // Buying pressure helps
  ['Proj',         0.60],   // Larger moves favored
  ['H_SCALP',      0.10],   // Slight scalp advantage
  ['H_SWING',      0.05],   // Slight swing advantage  
  ['H_POSITION',  -0.05],   // Position trades penalized
  ['BTCadj',       0.50]    // BTC correlation helps
]
```

**Example**:
```javascript
const modelSheet = ensureModelSheet();
console.log('Model sheet initialized with default weights');

// Sheet structure:
// Column A: Feature names
// Column B: Weight values
```

---

#### `readWeights()`
Reads the current model weights from the sheet into a JavaScript object.

**Returns**: `Object` - Map of feature names to weight values

**Example**:
```javascript
const weights = readWeights();
console.log('Current model weights:', weights);
// {
//   bias: -0.10,
//   OBI: 0.80,
//   Funding: -0.50,
//   dOI: 0.35,
//   CVD: 0.20,
//   Proj: 0.60,
//   H_SCALP: 0.10,
//   H_SWING: 0.05,
//   H_POSITION: -0.05,
//   BTCadj: 0.50
// }

// Access individual weights
console.log(`OBI weight: ${weights.OBI}`);
console.log(`Funding weight: ${weights.Funding}`);
```

---

#### `writeWeights(w)`
Writes updated weights back to the model sheet.

**Parameters**:
- `w` (Object): Map of feature names to new weight values

**Example**:
```javascript
const weights = readWeights();

// Update specific weights
weights.OBI = 0.85;          // Increase OBI importance
weights.Funding = -0.55;     // Increase funding contrarian effect

writeWeights(weights);
console.log('Weights updated in sheet');
```

### Model Prediction

#### `modelScore(features, horizonTag)`
Calculates the probability score for a given set of features and trading horizon.

**Parameters**:
- `features` (Object): Feature vector with market indicators
- `horizonTag` (string): Trading horizon ('SCALP', 'SWING', or 'POSITION')

**Returns**: `number` - Probability between 0 and 1

**Feature Object Structure**:
```javascript
{
  OBI: 0.15,           // Order book imbalance
  funding: -0.001,     // Funding rate
  dOI: 1000,           // Open interest delta
  cvd: 50,             // Cumulative volume delta
  proj: 0.025,         // Projected move percentage
  btcAdj: 0.03         // Bitcoin correlation adjustment
}
```

**Example**:
```javascript
const features = {
  OBI: 0.15,           // 15% bid imbalance
  funding: -0.001,     // -0.1% funding rate
  dOI: 1000,           // +1000 contracts OI
  cvd: 50,             // +50 net buying
  proj: 0.025,         // 2.5% projected move
  btcAdj: 0.03         // +3% BTC correlation adjustment
};

const probScalp = modelScore(features, 'SCALP');
const probSwing = modelScore(features, 'SWING');
const probPosition = modelScore(features, 'POSITION');

console.log(`Scalp probability: ${(probScalp * 100).toFixed(1)}%`);
console.log(`Swing probability: ${(probSwing * 100).toFixed(1)}%`);
console.log(`Position probability: ${(probPosition * 100).toFixed(1)}%`);

// Determine best horizon
const horizons = [
  { name: 'SCALP', prob: probScalp },
  { name: 'SWING', prob: probSwing },
  { name: 'POSITION', prob: probPosition }
];

const bestHorizon = horizons.reduce((max, h) => h.prob > max.prob ? h : max);
console.log(`Best horizon: ${bestHorizon.name} (${(bestHorizon.prob * 100).toFixed(1)}%)`);
```

**Detailed Calculation Example**:
```javascript
function explainModelScore(features, horizonTag) {
  const weights = readWeights();
  
  // Calculate each component
  const components = {
    bias: weights.bias || 0,
    OBI: (weights.OBI || 0) * (features.OBI || 0),
    Funding: (weights.Funding || 0) * (features.funding || 0),
    dOI: (weights.dOI || 0) * (features.dOI || 0),
    CVD: (weights.CVD || 0) * (features.cvd || 0),
    Proj: (weights.Proj || 0) * (features.proj || 0),
    BTCadj: (weights.BTCadj || 0) * (features.btcAdj || 0),
    H_SCALP: horizonTag === 'SCALP' ? (weights.H_SCALP || 0) : 0,
    H_SWING: horizonTag === 'SWING' ? (weights.H_SWING || 0) : 0,
    H_POSITION: horizonTag === 'POSITION' ? (weights.H_POSITION || 0) : 0
  };
  
  // Sum to get z-score
  const z = Object.values(components).reduce((sum, val) => sum + val, 0);
  
  // Apply sigmoid
  const probability = U.sigmoid(z);
  
  // Detailed breakdown
  console.log('Model Score Breakdown:');
  Object.entries(components).forEach(([feature, contribution]) => {
    if (contribution !== 0) {
      console.log(`  ${feature}: ${contribution.toFixed(4)}`);
    }
  });
  console.log(`  z-score: ${z.toFixed(4)}`);
  console.log(`  Probability: ${(probability * 100).toFixed(2)}%`);
  
  return probability;
}
```

### Online Learning

#### `modelOnlineUpdate(example)`
Updates model weights using online learning based on a trade outcome.

**Parameters**:
- `example` (Object): Training example with features, outcome, and prediction

**Example Object Structure**:
```javascript
{
  feats: {              // Feature vector used for prediction
    OBI: 0.15,
    funding: -0.001,
    dOI: 1000,
    cvd: 50,
    proj: 0.025,
    btcAdj: 0.03
  },
  label: 1,             // Actual outcome: 1 = profitable, -1 = unprofitable
  prob: 0.65,           // Model's prediction (0-1)
  horizon: 'SWING'      // Trading horizon used
}
```

**Learning Algorithm**:
1. Convert binary label (-1/1) to probability space (0/1)
2. Calculate prediction error: `error = predicted - actual`
3. Update each weight: `w_i = w_i - lr × (error × feature_i + l2 × w_i)`
4. Apply L2 regularization to prevent overfitting

**Example**:
```javascript
// Simulate a completed trade
const tradeExample = {
  feats: {
    OBI: 0.15,
    funding: -0.001,
    dOI: 1000,
    cvd: 50,
    proj: 0.025,
    btcAdj: 0.03
  },
  label: 1,              // Trade was profitable
  prob: 0.65,            // Model predicted 65% chance
  horizon: 'SWING'
};

// Get weights before update
const weightsBefore = readWeights();
console.log('Weights before update:', weightsBefore.OBI.toFixed(4));

// Update model
modelOnlineUpdate(tradeExample);

// Get weights after update
const weightsAfter = readWeights();
console.log('Weights after update:', weightsAfter.OBI.toFixed(4));

// Calculate weight change
const weightChange = weightsAfter.OBI - weightsBefore.OBI;
console.log(`OBI weight changed by: ${weightChange.toFixed(6)}`);
```

**Batch Update Example**:
```javascript
function batchModelUpdate(tradeHistory) {
  console.log(`Updating model with ${tradeHistory.length} trade examples`);
  
  let totalError = 0;
  tradeHistory.forEach((trade, index) => {
    const error = Math.abs(trade.prob - ((trade.label + 1) / 2));
    totalError += error;
    
    modelOnlineUpdate(trade);
    
    if ((index + 1) % 10 === 0) {
      console.log(`Processed ${index + 1} trades, avg error: ${(totalError / (index + 1)).toFixed(4)}`);
    }
  });
  
  const avgError = totalError / tradeHistory.length;
  console.log(`Model update complete. Average prediction error: ${avgError.toFixed(4)}`);
}
```

## Model Configuration

### Learning Parameters

#### Learning Rate (LR)
- **Default**: 0.03
- **Range**: 0.001 to 0.1
- **Effect**: Controls how quickly the model adapts
- **Tuning**: 
  - Higher: Faster adaptation, more noise
  - Lower: Slower adaptation, more stability

#### L2 Regularization (L2)
- **Default**: 0.001  
- **Range**: 0.0001 to 0.01
- **Effect**: Prevents overfitting by penalizing large weights
- **Tuning**:
  - Higher: More regularization, simpler model
  - Lower: Less regularization, more complex model

### Signal Thresholds

#### LONG_PROB_MIN
- **Default**: 0.55 (55%)
- **Purpose**: Minimum probability for LONG signals
- **Tuning**: Higher = fewer but higher-confidence signals

#### SHORT_PROB_MAX  
- **Default**: 0.45 (45%)
- **Purpose**: Maximum probability for SHORT signals
- **Tuning**: Lower = fewer but higher-confidence signals

## Model Performance Analysis

### Performance Metrics

```javascript
function analyzeModelPerformance() {
  const archiveSheet = U.getOrCreate('📦 АРХИВ СИГНАЛОВ', []);
  const trades = archiveSheet.getDataRange().getValues().slice(1);
  
  let totalTrades = 0;
  let profitableTrades = 0;
  let totalR = 0;
  let predictions = [];
  let outcomes = [];
  
  trades.forEach(trade => {
    const R = parseFloat(trade[6]) || 0;  // R column
    const profitable = R > 0;
    
    totalTrades++;
    if (profitable) profitableTrades++;
    totalR += R;
    
    // If we stored predictions, we could analyze them here
    // predictions.push(storedPrediction);
    // outcomes.push(profitable ? 1 : 0);
  });
  
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) : 0;
  const avgR = totalTrades > 0 ? (totalR / totalTrades) : 0;
  const expectedValue = winRate * 1 + (1 - winRate) * (-1); // Simplified
  
  console.log('Model Performance Analysis:');
  console.log(`  Total trades: ${totalTrades}`);
  console.log(`  Win rate: ${(winRate * 100).toFixed(2)}%`);
  console.log(`  Average R: ${avgR.toFixed(3)}`);
  console.log(`  Expected value: ${expectedValue.toFixed(3)}`);
  
  return {
    totalTrades,
    winRate,
    avgR,
    expectedValue
  };
}
```

### Model Calibration

```javascript
function checkModelCalibration(predictions, outcomes) {
  // Group predictions into bins
  const bins = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const binStats = bins.slice(0, -1).map((binStart, i) => {
    const binEnd = bins[i + 1];
    const binPreds = [];
    const binOutcomes = [];
    
    predictions.forEach((pred, j) => {
      if (pred >= binStart && pred < binEnd) {
        binPreds.push(pred);
        binOutcomes.push(outcomes[j]);
      }
    });
    
    const avgPred = binPreds.length > 0 ? U.mean(binPreds) : 0;
    const avgOutcome = binOutcomes.length > 0 ? U.mean(binOutcomes) : 0;
    
    return {
      range: `${(binStart * 100).toFixed(0)}-${(binEnd * 100).toFixed(0)}%`,
      count: binPreds.length,
      avgPrediction: avgPred,
      avgOutcome: avgOutcome,
      calibrationError: Math.abs(avgPred - avgOutcome)
    };
  });
  
  console.log('Model Calibration Analysis:');
  binStats.forEach(bin => {
    if (bin.count > 0) {
      console.log(`  ${bin.range}: ${bin.count} trades, ` +
                 `pred=${(bin.avgPrediction * 100).toFixed(1)}%, ` +
                 `actual=${(bin.avgOutcome * 100).toFixed(1)}%, ` +
                 `error=${(bin.calibrationError * 100).toFixed(1)}%`);
    }
  });
  
  const avgCalibrationError = U.mean(binStats.map(b => b.calibrationError));
  console.log(`  Average calibration error: ${(avgCalibrationError * 100).toFixed(2)}%`);
  
  return binStats;
}
```

## Feature Engineering

### Feature Scaling and Normalization

```javascript
function normalizeFeatures(rawFeatures) {
  // Define typical ranges for each feature
  const ranges = {
    OBI: { min: -1, max: 1 },
    funding: { min: -0.01, max: 0.01 },
    dOI: { min: -100000, max: 100000 },
    cvd: { min: -1000, max: 1000 },
    proj: { min: 0, max: 0.1 },
    btcAdj: { min: -0.12, max: 0.12 }
  };
  
  const normalized = {};
  
  Object.entries(rawFeatures).forEach(([feature, value]) => {
    if (ranges[feature]) {
      const range = ranges[feature];
      // Min-max normalization to [-1, 1]
      normalized[feature] = 2 * (value - range.min) / (range.max - range.min) - 1;
      normalized[feature] = U.clamp(normalized[feature], -1, 1);
    } else {
      normalized[feature] = value;
    }
  });
  
  return normalized;
}
```

### Feature Selection and Importance

```javascript
function analyzeFeatureImportance() {
  const weights = readWeights();
  
  // Calculate feature importance based on absolute weight values
  const importance = Object.entries(weights)
    .filter(([name]) => name !== 'bias')
    .map(([name, weight]) => ({
      feature: name,
      weight: weight,
      importance: Math.abs(weight)
    }))
    .sort((a, b) => b.importance - a.importance);
  
  console.log('Feature Importance Analysis:');
  importance.forEach((item, index) => {
    const direction = item.weight > 0 ? '↑' : '↓';
    console.log(`  ${index + 1}. ${item.feature}: ${item.weight.toFixed(3)} ${direction} ` +
               `(importance: ${item.importance.toFixed(3)})`);
  });
  
  return importance;
}
```

## Model Deployment and Monitoring

### Real-time Prediction Pipeline

```javascript
function generateTradingSignal(symbol) {
  try {
    // 1. Get market data
    const snapshot = dataManager.snapshot(symbol);
    if (!snapshot) return null;
    
    // 2. Compute features
    const features = computeFeatures(symbol, snapshot);
    
    // 3. Determine horizon
    const horizon = decideHorizon(snapshot.price, features.floor, features.ceil);
    
    // 4. Get model prediction
    const probability = modelScore(features, horizon);
    
    // 5. Generate signal
    const signal = decideSignal(probability, LONG_PROB_MIN, SHORT_PROB_MAX);
    
    return {
      symbol,
      signal,
      probability,
      horizon,
      features,
      timestamp: U.nowStr(),
      confidence: Math.abs(probability - 0.5) * 2 // 0 = no confidence, 1 = max confidence
    };
    
  } catch (error) {
    console.error(`Error generating signal for ${symbol}:`, error.message);
    return null;
  }
}
```

### Model Monitoring and Alerts

```javascript
function monitorModelHealth() {
  const weights = readWeights();
  const alerts = [];
  
  // Check for extreme weights
  Object.entries(weights).forEach(([feature, weight]) => {
    if (Math.abs(weight) > 2.0) {
      alerts.push(`Extreme weight detected: ${feature} = ${weight.toFixed(3)}`);
    }
  });
  
  // Check for weight drift
  const defaultWeights = {
    bias: -0.10, OBI: 0.80, Funding: -0.50, dOI: 0.35,
    CVD: 0.20, Proj: 0.60, H_SCALP: 0.10, H_SWING: 0.05,
    H_POSITION: -0.05, BTCadj: 0.50
  };
  
  Object.entries(defaultWeights).forEach(([feature, defaultWeight]) => {
    const currentWeight = weights[feature] || 0;
    const drift = Math.abs(currentWeight - defaultWeight);
    
    if (drift > 1.0) {
      alerts.push(`Significant weight drift: ${feature} changed by ${drift.toFixed(3)}`);
    }
  });
  
  // Log alerts
  if (alerts.length > 0) {
    console.log('Model Health Alerts:');
    alerts.forEach(alert => console.log(`  ⚠️ ${alert}`));
  } else {
    console.log('✅ Model health check passed');
  }
  
  return alerts;
}
```

## Best Practices

### Model Training
1. **Gradual Updates**: Update model weights gradually with small learning rates
2. **Regularization**: Use L2 regularization to prevent overfitting
3. **Feature Scaling**: Normalize features to similar ranges
4. **Validation**: Monitor out-of-sample performance regularly

### Feature Engineering
1. **Domain Knowledge**: Use market microstructure insights for feature design
2. **Stationarity**: Ensure features are stationary over time
3. **Correlation**: Monitor feature correlations and remove redundant features
4. **Robustness**: Test features across different market conditions

### Production Deployment
1. **Monitoring**: Continuously monitor model performance and feature distributions
2. **Fallback**: Have fallback strategies when model confidence is low
3. **Versioning**: Keep track of model versions and weight changes
4. **Testing**: Test model updates in paper trading before live deployment

---

The machine learning model provides the core intelligence for the trading system, continuously adapting to market conditions while maintaining robust risk management principles.