# Crypto Quantum Trader Pro v16.4s

A sophisticated cryptocurrency trading system built for Google Apps Script that integrates with multiple exchange APIs to provide automated trading signals using machine learning and technical analysis.

## 🚀 Overview

Crypto Quantum Trader Pro is a comprehensive trading system that:

- **Fetches real-time market data** from multiple cryptocurrency exchanges (OKX, Binance)
- **Analyzes market conditions** using advanced technical indicators and order book analysis
- **Generates trading signals** using a machine learning model with online learning capabilities
- **Manages risk** with dynamic stop-loss and take-profit levels
- **Tracks performance** with detailed logging and KPI monitoring
- **Handles events** with special risk management during high-volatility periods

## 📋 Table of Contents

- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Core Components](#core-components)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Trading Logic](#trading-logic)
- [Risk Management](#risk-management)
- [Performance Monitoring](#performance-monitoring)
- [Troubleshooting](#troubleshooting)

## 🛠️ Installation & Setup

### Prerequisites

- Google Sheets account
- Cloudflare Worker (for API proxy)
- Basic understanding of cryptocurrency trading concepts

### Setup Steps

1. **Create a new Google Sheets document**
2. **Open Apps Script** (Extensions → Apps Script)
3. **Copy the entire code** from the `Crypt` file into the script editor
4. **Configure your Cloudflare Worker** settings:
   - Update `WORKER_BASE` constant with your worker URL
   - Set `WORKER_KEY` with your secret key
5. **Run initial setup**:
   - Execute `initQuantumTrader()` function
   - Install triggers using `installTriggers()` function

### Initial Configuration

The system will automatically create several sheets in your Google Sheets document:

- **⚙️ НАСТРОЙКИ** - Configuration parameters
- **📈 ДЕРИВАТИВЫ** - Price data logging
- **📊 АКТИВНЫЕ СИГНАЛЫ** - Active trading signals
- **📦 АРХИВ СИГНАЛОВ** - Completed trades archive
- **🧠 МОДЕЛЬ** - Machine learning model weights
- **🗞️ СОБЫТИЯ** - Event-based risk management

## ⚙️ Configuration

### Global Constants

The system uses numerous configurable constants that can be modified in the settings sheet:

#### Exchange & API Settings
- `WORKER_BASE`: Cloudflare Worker proxy URL
- `WORKER_KEY`: Authentication key for the worker
- `DEFAULT_SYMBOLS`: Default cryptocurrency symbols to track

#### Rate Limiting & Caching
- `PACK_RATE_LIMIT_MS`: Minimum time between pack requests (60000ms)
- `PACK_CACHE_TTL_SEC`: Cache TTL for pack data (55s)
- `BOOK_TTL_SEC`: Order book cache TTL (60s)
- `TRADES_TTL_SEC`: Trades data cache TTL (60s)

#### Trading Parameters
- `ACCOUNT_SIZE_USD`: Trading account size ($10,000)
- `RISK_PER_TRADE_PCT`: Risk per trade percentage (1.0%)
- `DAILY_RISK_LIMIT_USD`: Daily risk limit ($200)

#### Technical Analysis
- `BOOK_LEVELS`: Order book depth levels (20)
- `ATR_PERIOD_M1`: ATR calculation period (14)
- `WALL_REL_MULT`: Wall detection multiplier (3.0)

## 🏗️ Core Components

### 1. Utilities Object (`U`)

A comprehensive utilities object providing common functionality:

```javascript
const U = {
  ss: () => SpreadsheetApp.getActive(),
  nowStr(): string,           // Current timestamp in Moscow timezone
  parseIso(s): Date,          // Parse ISO date string
  diffMin(a,b): number,       // Difference in minutes between dates
  getOrCreate(name, headers), // Get or create sheet with headers
  setMenu(),                  // Create custom menu
  // ... mathematical and statistical functions
}
```

### 2. Data Management

#### WorkerClient Class
Handles communication with the Cloudflare Worker proxy:

```javascript
class WorkerClient {
  static getHealth()          // Health check
  static getPack(symbols)     // Get market data pack
}
```

#### DataManager Class
Manages data fetching from multiple exchanges with caching:

```javascript
class DataManager {
  snapshot(sym)               // Get current price snapshot
  okxBook(sym)               // OKX order book
  binanceBook(sym)           // Binance order book
  okxTrades(sym, limit)      // OKX recent trades
  binanceTrades(sym, limit)  // Binance recent trades
  funding(sym)               // Funding rate data
  openInterest(sym)          // Open interest data
  ohlc1m(sym, limit)         // 1-minute OHLC data
}
```

### 3. Analytics Engine

The `Analytics` object provides market analysis functions:

```javascript
const Analytics = {
  bookCombined(sym),         // Combined order book from multiple exchanges
  wallsAndObi(sym, mid),     // Order book imbalance and walls detection
  cvd(sym),                  // Cumulative volume delta
  funding(sym),              // Current funding rate
  openInterest(sym),         // Open interest analysis
  atr(sym),                  // Average True Range calculation
  horizonByProj(px, floor, ceil), // Trading horizon determination
  btcAdj(sym)                // Bitcoin correlation adjustment
}
```

## 📊 API Reference

### Core Functions

#### Settings Management

##### `ensureSettings()`
Initializes the settings sheet with default configuration values.

**Returns**: `Sheet` - The settings sheet object

**Example**:
```javascript
const settingsSheet = ensureSettings();
```

##### `readSettingMap()`
Reads all settings from the configuration sheet into a key-value map.

**Returns**: `Object` - Map of setting keys to values

**Example**:
```javascript
const settings = readSettingMap();
const accountSize = settings['ACCOUNT_SIZE_USD'];
```

##### `getSymbolsList()`
Gets the list of cryptocurrency symbols to track from settings.

**Returns**: `Array<string>` - Array of symbol strings (e.g., ['BTC', 'ETH', 'SOL'])

**Example**:
```javascript
const symbols = getSymbolsList();
console.log(symbols); // ['BTC', 'ETH', 'SOL', 'XRP', 'ADA']
```

#### Data Fetching

##### `_throttledPack(symbols)`
Fetches market data with rate limiting and caching to avoid quota issues.

**Parameters**:
- `symbols` (Array<string>): Array of cryptocurrency symbols

**Returns**: `Object` - Market data pack with price information

**Example**:
```javascript
const symbols = ['BTC', 'ETH'];
const pack = _throttledPack(symbols);
console.log(pack.data.BTC.price);
```

#### Machine Learning Model

##### `modelScore(features, horizonTag)`
Calculates the probability score using the logistic regression model.

**Parameters**:
- `features` (Object): Feature vector containing market indicators
- `horizonTag` (string): Trading horizon ('SCALP', 'SWING', or 'POSITION')

**Returns**: `number` - Probability score between 0 and 1

**Example**:
```javascript
const features = {
  OBI: 0.1,
  funding: -0.001,
  dOI: 1000,
  cvd: 50,
  proj: 0.02,
  btcAdj: 0.05
};
const prob = modelScore(features, 'SWING');
console.log(`Probability: ${prob}`);
```

##### `modelOnlineUpdate(example)`
Updates the model weights using online learning with a new training example.

**Parameters**:
- `example` (Object): Training example with features, label, and probability

**Example**:
```javascript
const example = {
  feats: { OBI: 0.1, funding: -0.001, /* ... */ },
  label: 1,        // 1 for profitable, -1 for unprofitable
  prob: 0.65,      // Model's prediction
  horizon: 'SWING'
};
modelOnlineUpdate(example);
```

#### Trading Signal Generation

##### `computeFeatures(sym, snap)`
Computes all technical features for a given symbol and price snapshot.

**Parameters**:
- `sym` (string): Cryptocurrency symbol
- `snap` (Object): Price snapshot object

**Returns**: `Object` - Feature vector with all computed indicators

**Example**:
```javascript
const snapshot = dataManager.snapshot('BTC');
const features = computeFeatures('BTC', snapshot);
console.log(features);
// {
//   OBI: 0.15,
//   floor: 45000,
//   ceil: 47000,
//   atr: 1200,
//   cvd: 125.5,
//   funding: -0.001,
//   oi: 1500000,
//   dOI: 50000,
//   proj: 0.022,
//   btcAdj: 0.03
// }
```

##### `decideSignal(prob, longMin, shortMax)`
Determines trading signal based on probability thresholds.

**Parameters**:
- `prob` (number): Model probability score
- `longMin` (number): Minimum probability for LONG signal
- `shortMax` (number): Maximum probability for SHORT signal

**Returns**: `string` - 'LONG', 'SHORT', or 'NEUTRAL'

**Example**:
```javascript
const signal = decideSignal(0.65, 0.55, 0.45);
console.log(signal); // 'LONG'
```

##### `calcSL_TPs(side, px, atr, floor, ceil, eventSLmult)`
Calculates stop-loss and take-profit levels for a trade.

**Parameters**:
- `side` (string): Trade direction ('LONG' or 'SHORT')
- `px` (number): Entry price
- `atr` (number): Average True Range
- `floor` (number): Support level from order book walls
- `ceil` (number): Resistance level from order book walls
- `eventSLmult` (number): Event-based stop-loss multiplier

**Returns**: `Object` - Object containing SL, TPs array, and R (risk amount)

**Example**:
```javascript
const levels = calcSL_TPs('LONG', 45000, 1200, 44000, 47000, 1.0);
console.log(levels);
// {
//   SL: 43985,
//   TPs: [46000, 46800, 48000, 49200],
//   R: 1015
// }
```

#### Risk Management

##### `currentEventPolicy()`
Gets the current event-based risk management policy.

**Returns**: `Object` - Current risk policy with multipliers and restrictions

**Example**:
```javascript
const policy = currentEventPolicy();
console.log(policy);
// {
//   riskMult: 0.5,
//   slMult: 1.2,
//   blockScalp: true,
//   active: true
// }
```

##### `dailyRiskUsedUSD()`
Calculates the total risk used today in USD.

**Returns**: `number` - Amount of risk used today in USD

**Example**:
```javascript
const riskUsed = dailyRiskUsedUSD();
console.log(`Risk used today: $${riskUsed}`);
```

##### `canOpenMoreForSymbol(sym)`
Checks if more positions can be opened for a specific symbol.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `boolean` - True if more positions can be opened

**Example**:
```javascript
const canOpen = canOpenMoreForSymbol('BTC');
if (canOpen) {
  // Open new position
}
```

#### Trade Management

##### `openTrade(sym, side, snap, feats, prob, horizon, ttlMin, sl, tps, R, reason)`
Opens a new trading position with all parameters.

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

**Returns**: `string` - Trade ID

**Example**:
```javascript
const tradeId = openTrade(
  'BTC', 'LONG', snapshot, features, 0.65, 'SWING',
  360, 43985, [46000, 46800, 48000, 49200], 1015,
  'Strong bullish signal'
);
```

### Menu Functions (Entry Points)

#### `testConnectivity()`
Tests connection to the Cloudflare Worker and displays health status.

#### `updateMain()`
Main update function that processes all active signals and generates new ones.

#### `initQuantumTrader()`
Initializes all required sheets and sets up the trading system.

#### `installTriggers()`
Sets up time-based triggers for automated operation.

#### `kpi_24h_summary_now()`
Generates a 24-hour performance summary and KPI report.

## 💡 Usage Examples

### Basic Market Data Retrieval

```javascript
// Get current market snapshot
const snapshot = dataManager.snapshot('BTC');
console.log(`BTC Price: $${snapshot.price}`);

// Get order book data
const book = Analytics.bookCombined('BTC');
console.log(`Best bid: ${book.bids[0][0]}, Best ask: ${book.asks[0][0]}`);

// Calculate technical indicators
const features = computeFeatures('BTC', snapshot);
console.log(`Order Book Imbalance: ${features.OBI}`);
console.log(`Funding Rate: ${features.funding}`);
```

### Signal Generation Workflow

```javascript
// 1. Get market data
const symbols = getSymbolsList();
const pack = _throttledPack(symbols);

// 2. Process each symbol
symbols.forEach(sym => {
  const snapshot = dataManager.snapshot(sym);
  if (!snapshot) return;
  
  // 3. Compute features
  const features = computeFeatures(sym, snapshot);
  
  // 4. Determine trading horizon
  const horizon = decideHorizon(snapshot.price, features.floor, features.ceil);
  
  // 5. Get model prediction
  const prob = modelScore(features, horizon);
  
  // 6. Generate signal
  const signal = decideSignal(prob, LONG_PROB_MIN, SHORT_PROB_MAX);
  
  // 7. Open trade if signal is valid
  if (signal !== 'NEUTRAL' && canOpenMoreForSymbol(sym)) {
    const levels = calcSL_TPs(signal, snapshot.price, features.atr, 
                              features.floor, features.ceil, 1.0);
    
    const tradeId = openTrade(
      sym, signal, snapshot, features, prob, horizon,
      horizon === 'SCALP' ? TTL_SCALP_MIN : TTL_SWING_MIN,
      levels.SL, levels.TPs, levels.R, `${signal} signal (p=${prob.toFixed(3)})`
    );
    
    console.log(`Opened ${signal} trade for ${sym}: ${tradeId}`);
  }
});
```

### Custom Analysis

```javascript
// Analyze market conditions for a specific symbol
function analyzeSymbol(sym) {
  const snapshot = dataManager.snapshot(sym);
  const features = computeFeatures(sym, snapshot);
  
  return {
    symbol: sym,
    price: snapshot.price,
    signal: decideSignal(modelScore(features, 'SWING'), 0.55, 0.45),
    strength: {
      orderBookImbalance: features.OBI,
      volumeDelta: features.cvd,
      fundingBias: features.funding,
      openInterestChange: features.dOI,
      projectedMove: features.proj * 100 + '%'
    },
    levels: {
      support: features.floor,
      resistance: features.ceil,
      atr: features.atr
    }
  };
}

// Usage
const analysis = analyzeSymbol('BTC');
console.log(JSON.stringify(analysis, null, 2));
```

### Risk Management Example

```javascript
// Check current risk exposure
function checkRiskExposure() {
  const dailyRisk = dailyRiskUsedUSD();
  const limit = DAILY_RISK_LIMIT_USD;
  const eventPolicy = currentEventPolicy();
  
  console.log(`Daily risk used: $${dailyRisk} / $${limit}`);
  console.log(`Risk remaining: $${limit - dailyRisk}`);
  
  if (eventPolicy.active) {
    console.log('⚠️ Event mode active:');
    console.log(`- Risk multiplier: ${eventPolicy.riskMult}`);
    console.log(`- SL multiplier: ${eventPolicy.slMult}`);
    console.log(`- Scalping blocked: ${eventPolicy.blockScalp}`);
  }
  
  return {
    canTrade: dailyRisk < limit,
    riskRemaining: Math.max(0, limit - dailyRisk),
    eventMode: eventPolicy.active
  };
}
```

## 🎯 Trading Logic

### Signal Generation Process

1. **Data Collection**: Fetch real-time data from multiple exchanges
2. **Feature Engineering**: Calculate technical indicators and market metrics
3. **Model Prediction**: Use logistic regression to predict trade probability
4. **Signal Decision**: Apply probability thresholds to generate LONG/SHORT/NEUTRAL signals
5. **Risk Assessment**: Check daily limits and event-based restrictions
6. **Position Sizing**: Calculate position size based on account risk parameters
7. **Level Calculation**: Set stop-loss and take-profit levels using ATR and order book walls

### Machine Learning Model

The system uses a logistic regression model with online learning:

**Features**:
- **OBI** (Order Book Imbalance): Bid vs ask volume imbalance
- **Funding**: Current funding rate indicating sentiment
- **dOI** (Delta Open Interest): Change in open interest
- **CVD** (Cumulative Volume Delta): Buy vs sell pressure
- **Proj** (Projected Move): Expected price movement based on order book walls
- **BTCadj**: Bitcoin correlation adjustment for altcoins
- **Horizon Indicators**: SCALP, SWING, POSITION trading horizons

**Online Learning**: The model continuously updates its weights based on trade outcomes, adapting to changing market conditions.

## 🛡️ Risk Management

### Multi-Layer Risk Controls

1. **Position Limits**: Maximum one position per symbol
2. **Daily Risk Limit**: Soft limit on daily losses
3. **Event-Based Adjustments**: Reduced risk during high-volatility events
4. **Dynamic Stop-Losses**: Based on ATR and order book walls
5. **Take-Profit Scaling**: Multiple TP levels with allocation percentages

### Event Management

The system monitors for high-impact events and automatically:
- Reduces position sizes
- Tightens stop-losses
- Blocks scalping strategies
- Applies conservative risk parameters

## 📈 Performance Monitoring

### Key Performance Indicators

The system tracks comprehensive KPIs:

- **Win Rate**: Percentage of profitable trades
- **Average R**: Average risk-reward ratio
- **Daily P&L**: Profit and loss tracking
- **Maximum Drawdown**: Peak-to-trough decline
- **Sharpe Ratio**: Risk-adjusted returns
- **Trade Duration**: Average holding periods

### Logging and Audit Trail

All activities are logged in dedicated sheets:
- **📈 ДЕРИВАТИВЫ**: Price data with timestamps
- **📊 АКТИВНЫЕ СИГНАЛЫ**: Currently open positions
- **📦 АРХИВ СИГНАЛОВ**: Completed trade history
- **🧠 МОДЕЛЬ**: Model weight evolution

## 🔧 Troubleshooting

### Common Issues

#### Connection Problems
```javascript
// Test connectivity
try {
  const health = WorkerClient.getHealth();
  console.log('Worker status:', health);
} catch (error) {
  console.error('Connection failed:', error.message);
}
```

#### Rate Limiting
The system includes built-in rate limiting and caching. If you encounter quota issues:
1. Increase `PACK_RATE_LIMIT_MS` in settings
2. Check cache TTL settings
3. Verify Cloudflare Worker configuration

#### Data Quality Issues
```javascript
// Validate data quality
function validateData(sym) {
  const snapshot = dataManager.snapshot(sym);
  if (!snapshot || !isFinite(snapshot.price)) {
    console.error(`Invalid data for ${sym}`);
    return false;
  }
  return true;
}
```

### Debug Mode

Enable detailed logging by modifying the utility functions:

```javascript
// Add to U object for debug logging
debug: function(msg, data) {
  console.log(`[DEBUG] ${U.nowStr()}: ${msg}`, data || '');
}
```

### Performance Optimization

For optimal performance:
1. Monitor API quotas and adjust rate limits accordingly
2. Use appropriate cache TTL values
3. Limit the number of symbols processed simultaneously
4. Regular cleanup of old data in sheets

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

For questions, issues, or feature requests, please contact the development team.

---

**⚠️ Risk Disclaimer**: This software is for educational and research purposes. Cryptocurrency trading involves substantial risk of loss. Past performance does not guarantee future results. Use at your own risk.