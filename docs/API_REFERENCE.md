# API Reference

This document provides a complete reference for all public APIs, functions, classes, and components in the Crypto Quantum Trader Pro system.

## Table of Contents

- [Constants](#constants)
- [Utility Functions (U Object)](#utility-functions-u-object)
- [Data Management](#data-management)
- [Analytics](#analytics)
- [Machine Learning Model](#machine-learning-model)
- [Trading Functions](#trading-functions)
- [Risk Management](#risk-management)
- [Entry Points](#entry-points)
- [Sheet Management](#sheet-management)
- [Event Management](#event-management)

## Constants

### Configuration Constants

#### Time & Location
```javascript
const TZ = 'Europe/Moscow'                    // Timezone for all operations
```

#### API Configuration
```javascript
const WORKER_BASE = 'https://...'             // Cloudflare Worker URL
const WORKER_KEY = 'MySuperSecretKey123!@#'   // Authentication key
const DEFAULT_SYMBOLS = ['BTC','ETH','SOL','XRP','ADA'] // Default symbols
```

#### Rate Limiting & Caching
```javascript
const PACK_RATE_LIMIT_MS = 60000              // Pack request rate limit (ms)
const PACK_CACHE_TTL_SEC = 55                 // Pack cache TTL (seconds)
const BOOK_TTL_SEC = 60                       // Order book cache TTL
const TRADES_TTL_SEC = 60                     // Trades cache TTL
const FUND_TTL_SEC = 300                      // Funding rate cache TTL
const OI_TTL_SEC = 120                        // Open interest cache TTL
const OHLC_TTL_SEC = 60                       // OHLC cache TTL
```

#### Technical Analysis
```javascript
const BOOK_LEVELS = 20                        // Order book depth levels
const ATR_PERIOD_M1 = 14                      // ATR calculation period
const ATR_MIN_RATIO = 0.005                   // Minimum SL ratio (0.5%)
const WALL_REL_MULT = 3.0                     // Wall detection multiplier
const WALL_BUF_RATIO = 0.0015                 // Wall buffer ratio (0.15%)
```

#### Trading Parameters
```javascript
const TAKER_FEE_PER_SIDE = 0.0006            // Taker fee per side (0.06%)
const SLIPPAGE_BPS_BASE = 5                   // Base slippage (5 bps)
const LONG_PROB_MIN = 0.55                    // LONG signal threshold
const SHORT_PROB_MAX = 0.45                   // SHORT signal threshold
const LR = 0.03                               // Learning rate
const L2 = 0.001                              // L2 regularization
```

#### Risk Management
```javascript
const ACCOUNT_SIZE_USD = 10000                // Account size ($)
const RISK_PER_TRADE_PCT = 1.0               // Risk per trade (%)
const DAILY_RISK_LIMIT_USD = 200             // Daily risk limit ($)
const TTL_SCALP_MIN = 60                      // Scalp TTL (minutes)
const TTL_SWING_MIN = 360                     // Swing TTL (minutes)
const TTL_POSITION_MIN = 1440                 // Position TTL (minutes)
```

#### Event Risk Management
```javascript
const EVENT_RISK_MULT = 0.5                  // Event risk multiplier
const EVENT_SL_MULT = 1.2                    // Event SL multiplier
const BLOCK_SCALP_IN_EVENT = true            // Block scalping in events
```

#### Take-Profit Configuration
```javascript
const TP_R = [1.0, 1.8, 3.0, 4.5]           // TP levels in R multiples
const TP_ALLOCATION = [0.25, 0.25, 0.25, 0.25] // TP allocations
```

## Utility Functions (U Object)

### Spreadsheet Operations

#### `U.ss()`
**Returns**: `Spreadsheet` - Active spreadsheet instance
```javascript
const spreadsheet = U.ss();
```

#### `U.getOrCreate(name, headers?)`
**Parameters**:
- `name` (string): Sheet name
- `headers` (Array<string>, optional): Header row

**Returns**: `Sheet` - Sheet object
```javascript
const sheet = U.getOrCreate('Data', ['Time', 'Price', 'Volume']);
```

#### `U.setMenu()`
Creates custom menu in Google Sheets UI
```javascript
U.setMenu(); // Creates "🚀 Quantum Trader" menu
```

### Date/Time Functions

#### `U.nowStr()`
**Returns**: `string` - Current timestamp in configured timezone
```javascript
const timestamp = U.nowStr(); // "2024-01-15 14:30:25"
```

#### `U.parseIso(s)`
**Parameters**: `s` (string) - ISO date string
**Returns**: `Date|null` - Parsed date or null
```javascript
const date = U.parseIso('2024-01-15T14:30:25Z');
```

#### `U.diffMin(a, b)`
**Parameters**: `a`, `b` (Date) - Date objects
**Returns**: `number` - Difference in minutes (a - b)
```javascript
const diff = U.diffMin(new Date(), pastDate); // 30
```

### Data Utilities

#### `U.props()`
**Returns**: `Properties` - Script properties service
```javascript
const props = U.props();
props.setProperty('key', 'value');
```

#### `U.cache()`
**Returns**: `Cache` - Script cache service
```javascript
const cache = U.cache();
cache.put('key', JSON.stringify(data), 300);
```

#### `U.readJsonSafe(s)`
**Parameters**: `s` (string) - JSON string
**Returns**: `Object|null` - Parsed object or null
```javascript
const obj = U.readJsonSafe(jsonString);
```

### Mathematical Functions

#### `U.clamp(x, a, b)`
**Parameters**: `x`, `a`, `b` (number) - Value, min, max
**Returns**: `number` - Clamped value
```javascript
const clamped = U.clamp(15, 0, 10); // 10
```

#### `U.sigmoid(z)`
**Parameters**: `z` (number) - Input value
**Returns**: `number` - Sigmoid output (0-1)
```javascript
const prob = U.sigmoid(2.5); // 0.924
```

#### `U.zScore(x, mean, std)`
**Parameters**: `x`, `mean`, `std` (number) - Value, mean, standard deviation
**Returns**: `number` - Z-score
```javascript
const z = U.zScore(110, 100, 15); // 0.667
```

### Statistical Functions

#### `U.sum(a)`
**Parameters**: `a` (Array<number>) - Array of numbers
**Returns**: `number` - Sum of values
```javascript
const total = U.sum([1, 2, 3, 4, 5]); // 15
```

#### `U.mean(a)`
**Parameters**: `a` (Array<number>) - Array of numbers
**Returns**: `number` - Mean value
```javascript
const average = U.mean([1, 2, 3, 4, 5]); // 3
```

#### `U.std(a)`
**Parameters**: `a` (Array<number>) - Array of numbers
**Returns**: `number` - Standard deviation
```javascript
const stdDev = U.std([1, 2, 3, 4, 5]); // 1.58
```

#### `U.corr(a, b)`
**Parameters**: `a`, `b` (Array<number>) - Arrays of numbers
**Returns**: `number` - Correlation coefficient (-1 to 1)
```javascript
const correlation = U.corr([1,2,3], [2,4,6]); // 1.0
```

### Helper Functions

#### `U.id(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `string` - Unique trade ID
```javascript
const tradeId = U.id('BTC'); // "QTP-1705328425123-BTC"
```

#### `U.toFixedDyn(p)`
**Parameters**: `p` (number) - Price value
**Returns**: `string` - Dynamically formatted price
```javascript
const formatted = U.toFixedDyn(45123.456); // "45123.5"
```

## Data Management

### WorkerClient Class

#### `WorkerClient.getHealth()`
**Returns**: `Object` - Health status from worker
**Throws**: `Error` - If health check fails
```javascript
const health = WorkerClient.getHealth();
// { status: 'ok', timestamp: '...', version: '1.0.0' }
```

#### `WorkerClient.getPack(symbols)`
**Parameters**: `symbols` (Array<string>) - Cryptocurrency symbols
**Returns**: `Object` - Market data pack
**Throws**: `Error` - If request fails
```javascript
const pack = WorkerClient.getPack(['BTC', 'ETH']);
// { ok: true, data: { BTC: {...}, ETH: {...} } }
```

### DataManager Class

#### `new DataManager()`
Creates new data manager instance
```javascript
const dm = new DataManager();
```

#### `dataManager.snapshot(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `Object|null` - Price snapshot
```javascript
const snap = dataManager.snapshot('BTC');
// { symbol: 'BTC', price: 45000, src: 'OKX', ts: '...', freshness: 'LIVE' }
```

#### `dataManager.okxBook(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `Object` - OKX order book data
```javascript
const book = dataManager.okxBook('BTC');
```

#### `dataManager.binanceBook(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `Object` - Binance order book data
```javascript
const book = dataManager.binanceBook('BTC');
```

#### `dataManager.okxTrades(sym, limit?)`
**Parameters**: 
- `sym` (string) - Symbol
- `limit` (number, optional) - Number of trades (default: 120)

**Returns**: `Object` - OKX trades data
```javascript
const trades = dataManager.okxTrades('BTC', 50);
```

#### `dataManager.binanceTrades(sym, limit?)`
**Parameters**: 
- `sym` (string) - Symbol
- `limit` (number, optional) - Number of trades (default: 200)

**Returns**: `Array` - Binance trades data
```javascript
const trades = dataManager.binanceTrades('BTC', 100);
```

#### `dataManager.funding(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `Object` - Funding rate data
```javascript
const funding = dataManager.funding('BTC');
```

#### `dataManager.openInterest(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `Object` - Open interest data
```javascript
const oi = dataManager.openInterest('BTC');
```

#### `dataManager.ohlc1m(sym, limit?)`
**Parameters**: 
- `sym` (string) - Symbol
- `limit` (number, optional) - Number of candles (default: 300)

**Returns**: `Object` - 1-minute OHLC data
```javascript
const ohlc = dataManager.ohlc1m('BTC', 100);
```

## Analytics

### Analytics Object Methods

#### `Analytics.bookCombined(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `Object|null` - Combined order book
```javascript
const book = Analytics.bookCombined('BTC');
// { src: 'OKX|BINANCE', asks: [...], bids: [...] }
```

#### `Analytics.wallsAndObi(sym, mid)`
**Parameters**: 
- `sym` (string) - Symbol
- `mid` (number) - Mid price

**Returns**: `Object` - Walls and OBI analysis
```javascript
const analysis = Analytics.wallsAndObi('BTC', 45000);
// { OBI: 0.15, floor: 44500, ceil: 46000, src: 'OKX|BINANCE' }
```

#### `Analytics.cvd(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `number` - Cumulative volume delta
```javascript
const cvd = Analytics.cvd('BTC'); // 125.5
```

#### `Analytics.funding(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `number` - Current funding rate
```javascript
const rate = Analytics.funding('BTC'); // -0.001
```

#### `Analytics.openInterest(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `Object` - Open interest with delta
```javascript
const oi = Analytics.openInterest('BTC');
// { oi: 1234567, delta: 1000 }
```

#### `Analytics.atr(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `number` - Average True Range
```javascript
const atr = Analytics.atr('BTC'); // 150.5
```

#### `Analytics.horizonByProj(px, floor, ceil)`
**Parameters**: 
- `px` (number) - Current price
- `floor` (number) - Support level
- `ceil` (number) - Resistance level

**Returns**: `string` - Trading horizon ('SCALP', 'SWING', 'POSITION')
```javascript
const horizon = Analytics.horizonByProj(45000, 44500, 46000); // 'SWING'
```

#### `Analytics.btcAdj(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `number` - Bitcoin correlation adjustment
```javascript
const adj = Analytics.btcAdj('ETH'); // 0.03
```

## Machine Learning Model

### Model Management

#### `ensureModelSheet()`
**Returns**: `Sheet` - Model weights sheet
```javascript
const modelSheet = ensureModelSheet();
```

#### `readWeights()`
**Returns**: `Object` - Map of feature weights
```javascript
const weights = readWeights();
// { bias: -0.1, OBI: 0.8, Funding: -0.5, ... }
```

#### `writeWeights(w)`
**Parameters**: `w` (Object) - Weight map
```javascript
writeWeights({ bias: -0.1, OBI: 0.85, Funding: -0.55 });
```

### Model Prediction

#### `modelScore(features, horizonTag)`
**Parameters**: 
- `features` (Object) - Feature vector
- `horizonTag` (string) - Trading horizon

**Returns**: `number` - Probability (0-1)
```javascript
const prob = modelScore({
  OBI: 0.15,
  funding: -0.001,
  dOI: 1000,
  cvd: 50,
  proj: 0.025,
  btcAdj: 0.03
}, 'SWING'); // 0.65
```

#### `modelOnlineUpdate(example)`
**Parameters**: `example` (Object) - Training example
```javascript
modelOnlineUpdate({
  feats: { OBI: 0.15, funding: -0.001, ... },
  label: 1,      // 1 = profitable, -1 = unprofitable
  prob: 0.65,    // Model prediction
  horizon: 'SWING'
});
```

## Trading Functions

### Signal Generation

#### `computeFeatures(sym, snap)`
**Parameters**: 
- `sym` (string) - Symbol
- `snap` (Object) - Price snapshot

**Returns**: `Object` - Feature vector
```javascript
const features = computeFeatures('BTC', snapshot);
// { OBI: 0.15, funding: -0.001, dOI: 1000, cvd: 50, ... }
```

#### `decideHorizon(px, floor, ceil)`
**Parameters**: 
- `px` (number) - Price
- `floor` (number) - Support
- `ceil` (number) - Resistance

**Returns**: `string` - Horizon ('SCALP', 'SWING', 'POSITION')
```javascript
const horizon = decideHorizon(45000, 44500, 46000); // 'SWING'
```

#### `decideSignal(prob, longMin, shortMax)`
**Parameters**: 
- `prob` (number) - Model probability
- `longMin` (number) - LONG threshold
- `shortMax` (number) - SHORT threshold

**Returns**: `string` - Signal ('LONG', 'SHORT', 'NEUTRAL')
```javascript
const signal = decideSignal(0.65, 0.55, 0.45); // 'LONG'
```

### Risk Management

#### `calcSL_TPs(side, px, atr, floor, ceil, eventSLmult)`
**Parameters**: 
- `side` (string) - Trade direction
- `px` (number) - Entry price
- `atr` (number) - Average True Range
- `floor` (number) - Support level
- `ceil` (number) - Resistance level
- `eventSLmult` (number) - Event SL multiplier

**Returns**: `Object` - Stop-loss and take-profit levels
```javascript
const levels = calcSL_TPs('LONG', 45000, 150, 44500, 46000, 1.0);
// { SL: 44350, TPs: [46000, 46800, 48000, 49200], R: 650 }
```

#### `canOpenMoreForSymbol(sym)`
**Parameters**: `sym` (string) - Symbol
**Returns**: `boolean` - Whether more positions can be opened
```javascript
const canOpen = canOpenMoreForSymbol('BTC'); // true/false
```

#### `currentEventPolicy()`
**Returns**: `Object` - Current event policy
```javascript
const policy = currentEventPolicy();
// { riskMult: 0.5, slMult: 1.2, blockScalp: true, active: true }
```

#### `dailyRiskUsedUSD()`
**Returns**: `number` - Daily risk used in USD
```javascript
const riskUsed = dailyRiskUsedUSD(); // 150.50
```

### Trade Execution

#### `openTrade(sym, side, snap, feats, prob, horizon, ttlMin, sl, tps, R, reason)`
**Parameters**: 
- `sym` (string) - Symbol
- `side` (string) - Direction ('LONG'/'SHORT')
- `snap` (Object) - Price snapshot
- `feats` (Object) - Features
- `prob` (number) - Probability
- `horizon` (string) - Horizon
- `ttlMin` (number) - TTL in minutes
- `sl` (number) - Stop-loss
- `tps` (Array) - Take-profits
- `R` (number) - Risk amount
- `reason` (string) - Opening reason

**Returns**: `string` - Trade ID
```javascript
const tradeId = openTrade('BTC', 'LONG', snapshot, features, 0.65, 'SWING',
                         360, 44350, [46000, 46800, 48000, 49200], 650,
                         'Strong bullish signal');
```

#### `processActive()`
Processes all active trades for SL/TP hits and TTL expiry
```javascript
processActive(); // Updates active trades sheet
```

## Sheet Management

### Settings Functions

#### `ensureSettings()`
**Returns**: `Sheet` - Settings sheet
```javascript
const settingsSheet = ensureSettings();
```

#### `readSettingMap()`
**Returns**: `Object` - Settings key-value map
```javascript
const settings = readSettingMap();
// { WORKER_BASE: '...', SYMBOLS: 'BTC,ETH', ... }
```

#### `getSymbolsList()`
**Returns**: `Array<string>` - List of symbols to trade
```javascript
const symbols = getSymbolsList(); // ['BTC', 'ETH', 'SOL']
```

### Core Sheet Functions

#### `ensureSheetsCore()`
Creates all required trading sheets
```javascript
ensureSheetsCore(); // Creates all trading sheets
```

#### `appendDerivativesLog(pack)`
**Parameters**: `pack` (Object) - Market data pack
```javascript
appendDerivativesLog(marketDataPack); // Logs price data
```

## Event Management

#### `ensureEventsSheet()`
**Returns**: `Sheet` - Events sheet
```javascript
const eventsSheet = ensureEventsSheet();
```

## Entry Points

### Menu Functions

#### `testConnectivity()`
Tests connection to Cloudflare Worker
```javascript
testConnectivity(); // Shows UI alert with status
```

#### `updateMain()`
Main trading loop - processes active trades and generates new signals
```javascript
updateMain(); // Runs complete trading cycle
```

#### `initQuantumTrader()`
One-time system initialization
```javascript
initQuantumTrader(); // Sets up all sheets and configuration
```

#### `installTriggers()`
Installs automated triggers
```javascript
installTriggers(); // Sets up time-based automation
```

#### `kpi_24h_summary_now()`
Generates 24-hour performance report
```javascript
kpi_24h_summary_now(); // Creates KPI summary
```

## Data Types

### Price Snapshot
```typescript
interface PriceSnapshot {
  symbol: string;
  price: number;
  src: string;
  ts: string;
  freshness: 'LIVE' | 'STALE';
}
```

### Feature Vector
```typescript
interface Features {
  OBI: number;           // Order book imbalance (-1 to 1)
  funding: number;       // Funding rate
  dOI: number;          // Open interest delta
  cvd: number;          // Cumulative volume delta
  proj: number;         // Projected move (0 to 1)
  btcAdj: number;       // BTC correlation adjustment
  atr: number;          // Average True Range
  floor?: number;       // Support level
  ceil?: number;        // Resistance level
}
```

### Trade Levels
```typescript
interface TradeLevels {
  SL: number;           // Stop-loss price
  TPs: number[];        // Take-profit levels [TP1, TP2, TP3, TP4]
  R: number;            // Risk amount (entry - SL)
}
```

### Event Policy
```typescript
interface EventPolicy {
  riskMult: number;     // Risk multiplier (0-1)
  slMult: number;       // SL multiplier (>= 1)
  blockScalp: boolean;  // Block scalping trades
  active: boolean;      // Whether event mode is active
}
```

### Order Book
```typescript
interface OrderBook {
  src: string;          // Source exchanges
  asks: [number, number][]; // [price, size] pairs
  bids: [number, number][]; // [price, size] pairs
}
```

### Market Analysis
```typescript
interface WallsAndOBI {
  OBI: number;          // Order book imbalance
  floor: number | null; // Support wall price
  ceil: number | null;  // Resistance wall price
  src: string;          // Data sources
}
```

## Error Handling

All functions that can fail should be wrapped in try-catch blocks:

```javascript
try {
  const result = someFunction();
  // Handle success
} catch (error) {
  console.error('Function failed:', error.message);
  // Handle error appropriately
}
```

## Rate Limiting

The system implements automatic rate limiting and caching:

- **Pack requests**: Limited by `PACK_RATE_LIMIT_MS`
- **Exchange APIs**: Cached with appropriate TTLs
- **Throttling**: Automatic backoff on quota exhaustion

## Best Practices

### Function Usage
1. Always check return values for null/undefined
2. Validate inputs before processing
3. Use appropriate error handling
4. Log important operations
5. Cache expensive operations

### Performance
1. Use batch operations for sheets
2. Minimize API calls with caching
3. Process arrays efficiently
4. Clean up temporary data

### Security
1. Never log sensitive data (API keys)
2. Validate external data
3. Use proper authentication
4. Sanitize user inputs

---

This API reference provides complete documentation for all public interfaces in the Crypto Quantum Trader Pro system. For detailed examples and usage patterns, refer to the specific component documentation files.