# Data Management Classes

This document covers the data management classes in the Crypto Quantum Trader Pro system: `WorkerClient`, `DataManager`, and `Analytics`. These classes handle external API communication, data caching, and market analysis.

## WorkerClient Class

The `WorkerClient` class provides a static interface for communicating with the Cloudflare Worker proxy, which acts as an intermediary to avoid CORS issues and API quotas.

### Class Overview

```javascript
class WorkerClient {
  static _headers()           // Private: Generate request headers
  static getHealth()          // Health check endpoint
  static getPack(symbols)     // Get market data pack
}
```

### Methods

#### `WorkerClient._headers()` (Private)
Generates the standard headers for all worker requests.

**Returns**: `Object` - Headers object with authentication

**Headers**:
- `Accept`: `'application/json'`
- `User-Agent`: `'AppsScript-QuantumTrader'`
- `x-api-key`: Value from `WORKER_KEY` constant

**Example**:
```javascript
// Internal usage only
const headers = WorkerClient._headers();
console.log(headers);
// {
//   'Accept': 'application/json',
//   'User-Agent': 'AppsScript-QuantumTrader',
//   'x-api-key': 'MySuperSecretKey123!@#'
// }
```

---

#### `WorkerClient.getHealth()`
Performs a health check on the Cloudflare Worker to verify connectivity and service status.

**Returns**: `Object` - Health status response from worker

**Throws**: `Error` - If health check fails or returns non-200 status

**Example**:
```javascript
try {
  const health = WorkerClient.getHealth();
  console.log('Worker health:', health);
  // Typical response:
  // {
  //   status: 'ok',
  //   timestamp: '2024-01-15T14:30:25.123Z',
  //   version: '1.0.0'
  // }
} catch (error) {
  console.error('Worker health check failed:', error.message);
}
```

**Usage in Menu Function**:
```javascript
function testConnectivity() {
  try {
    const health = WorkerClient.getHealth();
    const ui = SpreadsheetApp.getUi();
    ui.alert('✅ Connection OK', 
             `Worker is healthy\nStatus: ${health.status}\nTime: ${health.timestamp}`,
             ui.ButtonSet.OK);
  } catch (error) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Connection Failed', 
             `Error: ${error.message}`,
             ui.ButtonSet.OK);
  }
}
```

---

#### `WorkerClient.getPack(symbols)`
Fetches a "pack" of market data for multiple symbols in a single request.

**Parameters**:
- `symbols` (Array<string>): Array of cryptocurrency symbols (e.g., ['BTC', 'ETH', 'SOL'])

**Returns**: `Object` - Market data pack response

**Throws**: `Error` - If request fails or returns non-200 status

**Response Structure**:
```javascript
{
  ok: true,
  data: {
    'BTC': {
      price: 45123.45,
      source: 'OKX',
      timestampUtc: '2024-01-15T14:30:25.123Z',
      timestampMskIso: '2024-01-15T17:30:25.123+03:00'
    },
    'ETH': {
      price: 3456.78,
      source: 'Binance',
      timestampUtc: '2024-01-15T14:30:25.456Z',
      timestampMskIso: '2024-01-15T17:30:25.456+03:00'
    }
  }
}
```

**Example**:
```javascript
const symbols = ['BTC', 'ETH', 'SOL'];
try {
  const pack = WorkerClient.getPack(symbols);
  
  if (pack.ok) {
    Object.entries(pack.data).forEach(([symbol, data]) => {
      console.log(`${symbol}: $${data.price} (${data.source})`);
    });
  }
} catch (error) {
  console.error('Failed to fetch pack:', error.message);
}
```

## DataManager Class

The `DataManager` class provides a comprehensive interface for fetching and caching market data from multiple cryptocurrency exchanges. It implements intelligent caching to minimize API calls and avoid quota limits.

### Class Overview

```javascript
class DataManager {
  constructor()                     // Initialize with empty cache
  
  // Core data methods
  snapshot(sym)                     // Get current price snapshot
  
  // Order book methods
  okxBook(sym)                     // OKX order book data
  binanceBook(sym)                 // Binance order book data
  
  // Trade data methods
  okxTrades(sym, limit)            // OKX recent trades
  binanceTrades(sym, limit)        // Binance recent trades
  
  // Funding and interest methods
  funding(sym)                     // Funding rate data
  openInterest(sym)                // Open interest data
  
  // OHLC methods
  ohlc1m(sym, limit)               // 1-minute candlestick data
  
  // Private methods
  _ensurePack(symList)             // Ensure pack data is fresh
}
```

### Instance Properties

- `_lastPack`: Cached pack data from last request
- `_lastAt`: Timestamp of last pack request

### Methods

#### `new DataManager()`
Creates a new DataManager instance with empty cache.

**Example**:
```javascript
const dataManager = new DataManager();
```

**Note**: The system uses a global singleton instance:
```javascript
var dataManager = new DataManager(); // Global instance
```

---

#### `dataManager.snapshot(sym)`
Gets the current price snapshot for a symbol, using cached pack data when available.

**Parameters**:
- `sym` (string): Cryptocurrency symbol (e.g., 'BTC', 'ETH')

**Returns**: `Object|null` - Price snapshot or null if unavailable

**Return Structure**:
```javascript
{
  symbol: 'BTC',
  price: 45123.45,
  src: 'OKX',
  ts: '2024-01-15T17:30:25.123+03:00',
  freshness: 'LIVE' // or 'STALE'
}
```

**Example**:
```javascript
const snapshot = dataManager.snapshot('BTC');
if (snapshot) {
  console.log(`${snapshot.symbol}: $${snapshot.price}`);
  console.log(`Source: ${snapshot.src}, Freshness: ${snapshot.freshness}`);
} else {
  console.log('No data available for BTC');
}
```

**Caching Behavior**:
- Automatically fetches fresh pack data if cache is older than 5 seconds
- Uses all configured symbols for pack requests
- Handles both live and stale data gracefully

---

#### `dataManager.okxBook(sym)`
Fetches order book data from OKX exchange with caching.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `Object` - OKX order book response

**API Endpoint**: `https://www.okx.com/api/v5/market/books`

**Response Structure**:
```javascript
{
  code: "0",
  data: [{
    asks: [
      ["45150.5", "0.5"],    // [price, size]
      ["45151.0", "1.2"],
      // ... up to BOOK_LEVELS
    ],
    bids: [
      ["45149.5", "0.8"],
      ["45149.0", "1.5"],
      // ... up to BOOK_LEVELS
    ],
    ts: "1705328425123"
  }]
}
```

**Example**:
```javascript
try {
  const book = dataManager.okxBook('BTC');
  if (book.data && book.data[0]) {
    const orderBook = book.data[0];
    const bestBid = orderBook.bids[0];
    const bestAsk = orderBook.asks[0];
    
    console.log(`Best bid: $${bestBid[0]} (${bestBid[1]} BTC)`);
    console.log(`Best ask: $${bestAsk[0]} (${bestAsk[1]} BTC)`);
    console.log(`Spread: $${(parseFloat(bestAsk[0]) - parseFloat(bestBid[0])).toFixed(2)}`);
  }
} catch (error) {
  console.error('Failed to fetch OKX book:', error.message);
}
```

---

#### `dataManager.binanceBook(sym)`
Fetches order book data from Binance exchange with caching.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `Object` - Binance order book response

**API Endpoint**: `https://fapi.binance.com/fapi/v1/depth`

**Response Structure**:
```javascript
{
  lastUpdateId: 12345678,
  E: 1705328425123,          // Event time
  T: 1705328425120,          // Transaction time
  bids: [
    ["45149.50", "0.80000"],  // [price, quantity]
    ["45149.00", "1.50000"],
    // ...
  ],
  asks: [
    ["45150.50", "0.50000"],
    ["45151.00", "1.20000"],
    // ...
  ]
}
```

**Example**:
```javascript
const book = dataManager.binanceBook('BTC');
console.log(`Binance order book last update: ${book.lastUpdateId}`);

const totalBidVolume = book.bids
  .slice(0, 10)
  .reduce((sum, [price, qty]) => sum + parseFloat(qty), 0);
  
console.log(`Top 10 bid levels volume: ${totalBidVolume.toFixed(4)} BTC`);
```

---

#### `dataManager.okxTrades(sym, limit)`
Fetches recent trade data from OKX exchange.

**Parameters**:
- `sym` (string): Cryptocurrency symbol
- `limit` (number, optional): Number of trades to fetch (default: 120, max: 120)

**Returns**: `Object` - OKX trades response

**Response Structure**:
```javascript
{
  code: "0",
  data: [
    {
      instId: "BTC-USDT-SWAP",
      tradeId: "123456789",
      px: "45150.5",           // Price
      sz: "0.001",             // Size
      side: "buy",             // "buy" or "sell"
      ts: "1705328425123"      // Timestamp
    },
    // ... more trades
  ]
}
```

**Example**:
```javascript
const trades = dataManager.okxTrades('BTC', 50);
if (trades.data) {
  let buyVolume = 0, sellVolume = 0;
  
  trades.data.forEach(trade => {
    const size = parseFloat(trade.sz);
    if (trade.side === 'buy') {
      buyVolume += size;
    } else {
      sellVolume += size;
    }
  });
  
  const cvd = buyVolume - sellVolume;
  console.log(`CVD from last 50 trades: ${cvd.toFixed(4)} BTC`);
}
```

---

#### `dataManager.binanceTrades(sym, limit)`
Fetches recent trade data from Binance exchange.

**Parameters**:
- `sym` (string): Cryptocurrency symbol
- `limit` (number, optional): Number of trades to fetch (default: 200, max: 1000)

**Returns**: `Array` - Array of Binance trade objects

**Response Structure**:
```javascript
[
  {
    id: 123456789,
    price: "45150.50",
    qty: "0.001000",
    quoteQty: "45.15050",
    time: 1705328425123,
    isBuyerMaker: false        // true if buyer was maker
  },
  // ... more trades
]
```

**Example**:
```javascript
const trades = dataManager.binanceTrades('BTC', 100);
const recentTrades = trades.slice(-20); // Last 20 trades

let takerBuyVolume = 0, takerSellVolume = 0;

recentTrades.forEach(trade => {
  const qty = parseFloat(trade.qty);
  if (trade.isBuyerMaker) {
    takerSellVolume += qty;  // Buyer was maker, so taker sold
  } else {
    takerBuyVolume += qty;   // Seller was maker, so taker bought
  }
});

console.log(`Taker buy: ${takerBuyVolume.toFixed(4)}, Taker sell: ${takerSellVolume.toFixed(4)}`);
```

---

#### `dataManager.funding(sym)`
Fetches current funding rate data from OKX.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `Object` - OKX funding rate response

**Response Structure**:
```javascript
{
  code: "0",
  data: [{
    instId: "BTC-USDT-SWAP",
    fundingRate: "-0.000123",    // Current funding rate
    nextFundingRate: "-0.000098", // Next funding rate
    fundingTime: "1705334400000"  // Next funding time
  }]
}
```

**Example**:
```javascript
const fundingData = dataManager.funding('BTC');
if (fundingData.data && fundingData.data[0]) {
  const rate = parseFloat(fundingData.data[0].fundingRate);
  const annualized = rate * 365 * 3; // 3 times per day
  
  console.log(`BTC funding rate: ${(rate * 100).toFixed(4)}%`);
  console.log(`Annualized: ${(annualized * 100).toFixed(2)}%`);
  
  if (rate > 0.001) {
    console.log('High positive funding - shorts paying longs');
  } else if (rate < -0.001) {
    console.log('High negative funding - longs paying shorts');
  }
}
```

---

#### `dataManager.openInterest(sym)`
Fetches open interest data from OKX.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `Object` - OKX open interest response

**Response Structure**:
```javascript
{
  code: "0",
  data: [{
    instId: "BTC-USDT-SWAP",
    oi: "123456.789",          // Open interest in contracts
    oiCcy: "1234567890.123"    // Open interest in base currency
  }]
}
```

**Example**:
```javascript
const oiData = dataManager.openInterest('BTC');
if (oiData.data && oiData.data[0]) {
  const oi = parseFloat(oiData.data[0].oi);
  const oiCcy = parseFloat(oiData.data[0].oiCcy);
  
  console.log(`BTC Open Interest: ${oi.toFixed(2)} contracts`);
  console.log(`BTC Open Interest: ${oiCcy.toFixed(2)} BTC`);
}
```

---

#### `dataManager.ohlc1m(sym, limit)`
Fetches 1-minute OHLC candlestick data from OKX.

**Parameters**:
- `sym` (string): Cryptocurrency symbol
- `limit` (number, optional): Number of candles (default: 300, max: 500)

**Returns**: `Object` - OKX candlestick response

**Response Structure**:
```javascript
{
  code: "0",
  data: [
    [
      "1705328400000",  // Timestamp
      "45150.5",        // Open
      "45180.2",        // High
      "45140.1",        // Low
      "45175.8",        // Close
      "12.345",         // Volume (base currency)
      "556789.123"      // Volume (quote currency)
    ],
    // ... more candles (newest first)
  ]
}
```

**Example**:
```javascript
const ohlcData = dataManager.ohlc1m('BTC', 100);
if (ohlcData.data) {
  const candles = ohlcData.data.reverse(); // Oldest first
  
  // Calculate simple moving average
  const closes = candles.map(candle => parseFloat(candle[4]));
  const sma20 = closes.slice(-20).reduce((sum, close) => sum + close, 0) / 20;
  
  console.log(`BTC 20-period SMA: $${sma20.toFixed(2)}`);
  
  // Calculate ATR
  let atrSum = 0;
  for (let i = 1; i < Math.min(15, candles.length); i++) {
    const high = parseFloat(candles[i][2]);
    const low = parseFloat(candles[i][3]);
    const prevClose = parseFloat(candles[i-1][4]);
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    atrSum += tr;
  }
  
  const atr14 = atrSum / 14;
  console.log(`BTC 14-period ATR: $${atr14.toFixed(2)}`);
}
```

## Analytics Object

The `Analytics` object provides high-level market analysis functions that combine data from multiple sources to generate trading insights.

### Object Overview

```javascript
const Analytics = {
  // Order book analysis
  bookCombined(sym),           // Combined multi-exchange order book
  wallsAndObi(sym, mid),       // Walls detection and order book imbalance
  
  // Trade analysis
  cvd(sym),                    // Cumulative volume delta
  
  // Funding and interest
  funding(sym),                // Current funding rate
  openInterest(sym),           // Open interest with delta
  
  // Technical indicators
  atr(sym),                    // Average True Range
  horizonByProj(px, floor, ceil), // Trading horizon determination
  
  // Correlation analysis
  btcAdj(sym)                  // Bitcoin correlation adjustment
};
```

### Methods

#### `Analytics.bookCombined(sym)`
Combines order book data from multiple exchanges into a unified view.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `Object|null` - Combined order book or null if no data

**Return Structure**:
```javascript
{
  src: 'OKX|BINANCE',          // Source exchanges
  asks: [                      // Sorted by price (ascending)
    [45150.5, 0.5],           // [price, size]
    [45151.0, 1.2],
    // ...
  ],
  bids: [                      // Sorted by price (descending)
    [45149.5, 0.8],
    [45149.0, 1.5],
    // ...
  ]
}
```

**Example**:
```javascript
const book = Analytics.bookCombined('BTC');
if (book) {
  console.log(`Combined book from: ${book.src}`);
  
  const bestBid = book.bids[0];
  const bestAsk = book.asks[0];
  const spread = bestAsk[0] - bestBid[0];
  const midPrice = (bestBid[0] + bestAsk[0]) / 2;
  
  console.log(`Mid price: $${midPrice.toFixed(2)}`);
  console.log(`Spread: $${spread.toFixed(2)}`);
  
  // Calculate total volume at top levels
  const topBidVol = book.bids.slice(0, 5).reduce((sum, [p, v]) => sum + v, 0);
  const topAskVol = book.asks.slice(0, 5).reduce((sum, [p, v]) => sum + v, 0);
  
  console.log(`Top 5 levels - Bids: ${topBidVol.toFixed(2)}, Asks: ${topAskVol.toFixed(2)}`);
}
```

---

#### `Analytics.wallsAndObi(sym, mid)`
Analyzes order book for large walls and calculates order book imbalance.

**Parameters**:
- `sym` (string): Cryptocurrency symbol
- `mid` (number): Mid price for wall detection

**Returns**: `Object` - Analysis results

**Return Structure**:
```javascript
{
  OBI: 0.15,                   // Order Book Imbalance (-1 to 1)
  floor: 44500,                // Support wall price (null if none)
  ceil: 46000,                 // Resistance wall price (null if none)
  src: 'OKX|BINANCE'           // Data sources
}
```

**OBI Calculation**:
```
OBI = (bidVolume - askVolume) / (bidVolume + askVolume)
```

**Wall Detection**:
- Walls are levels with volume > `WALL_REL_MULT` × average volume
- Floor: First wall below mid price in bids
- Ceil: First wall above mid price in asks

**Example**:
```javascript
const midPrice = 45000;
const analysis = Analytics.wallsAndObi('BTC', midPrice);

console.log(`Order Book Imbalance: ${analysis.OBI.toFixed(3)}`);

if (analysis.OBI > 0.1) {
  console.log('Strong bid pressure - bullish bias');
} else if (analysis.OBI < -0.1) {
  console.log('Strong ask pressure - bearish bias');
} else {
  console.log('Balanced order book');
}

if (analysis.floor) {
  console.log(`Support wall at $${analysis.floor}`);
  const supportDistance = ((midPrice - analysis.floor) / midPrice * 100);
  console.log(`Support is ${supportDistance.toFixed(2)}% below mid`);
}

if (analysis.ceil) {
  console.log(`Resistance wall at $${analysis.ceil}`);
  const resistanceDistance = ((analysis.ceil - midPrice) / midPrice * 100);
  console.log(`Resistance is ${resistanceDistance.toFixed(2)}% above mid`);
}
```

---

#### `Analytics.cvd(sym)`
Calculates Cumulative Volume Delta from recent trades.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `number` - CVD value (positive = buying pressure, negative = selling pressure)

**Calculation**:
- OKX: `buy_volume - sell_volume` based on `side` field
- Binance: Taker buy volume - taker sell volume based on `isBuyerMaker` field

**Example**:
```javascript
const cvd = Analytics.cvd('BTC');
console.log(`BTC CVD: ${cvd.toFixed(4)}`);

if (cvd > 10) {
  console.log('Strong buying pressure detected');
} else if (cvd < -10) {
  console.log('Strong selling pressure detected');
} else {
  console.log('Balanced buy/sell pressure');
}

// Normalize CVD for different symbols
function normalizeCVD(cvd, symbol) {
  const normalizers = { BTC: 100, ETH: 1000, SOL: 10000 };
  const normalizer = normalizers[symbol] || 1000;
  return cvd / normalizer;
}

const normalizedCVD = normalizeCVD(cvd, 'BTC');
console.log(`Normalized CVD: ${normalizedCVD.toFixed(3)}`);
```

---

#### `Analytics.funding(sym)`
Gets the current funding rate for a symbol.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `number` - Funding rate (e.g., 0.001 = 0.1%)

**Example**:
```javascript
const fundingRate = Analytics.funding('BTC');
const annualized = fundingRate * 365 * 3; // 3 times per day

console.log(`BTC funding rate: ${(fundingRate * 100).toFixed(4)}%`);
console.log(`Annualized rate: ${(annualized * 100).toFixed(2)}%`);

// Funding rate interpretation
if (fundingRate > 0.0005) {
  console.log('High positive funding - market is bullish, shorts pay longs');
} else if (fundingRate < -0.0005) {
  console.log('High negative funding - market is bearish, longs pay shorts');
} else {
  console.log('Neutral funding rate');
}
```

---

#### `Analytics.openInterest(sym)`
Gets open interest data with change tracking.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `Object` - Open interest data

**Return Structure**:
```javascript
{
  oi: 1234567.89,              // Current open interest
  delta: 12345.67              // Change since last check
}
```

**Example**:
```javascript
const oiData = Analytics.openInterest('BTC');
console.log(`BTC Open Interest: ${oiData.oi.toFixed(2)}`);
console.log(`OI Change: ${oiData.delta.toFixed(2)}`);

if (oiData.delta > 0) {
  console.log('Open interest increasing - new positions opening');
} else if (oiData.delta < 0) {
  console.log('Open interest decreasing - positions closing');
}

// Calculate OI change percentage
const oiChangePercent = (oiData.delta / (oiData.oi - oiData.delta)) * 100;
console.log(`OI change: ${oiChangePercent.toFixed(2)}%`);
```

---

#### `Analytics.atr(sym)`
Calculates Average True Range for volatility measurement.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `number` - ATR value in price units

**Calculation**:
- Uses 1-minute OHLC data
- Period: `ATR_PERIOD_M1` (default: 14)
- True Range = max(high-low, |high-prevClose|, |low-prevClose|)

**Example**:
```javascript
const atr = Analytics.atr('BTC');
const currentPrice = 45000;
const atrPercent = (atr / currentPrice) * 100;

console.log(`BTC ATR: $${atr.toFixed(2)}`);
console.log(`ATR as % of price: ${atrPercent.toFixed(2)}%`);

// Volatility classification
if (atrPercent > 3) {
  console.log('High volatility period');
} else if (atrPercent > 1.5) {
  console.log('Medium volatility period');
} else {
  console.log('Low volatility period');
}

// Use ATR for stop-loss calculation
const stopDistance = Math.max(atr, currentPrice * 0.005); // Min 0.5%
console.log(`Suggested stop distance: $${stopDistance.toFixed(2)}`);
```

---

#### `Analytics.horizonByProj(px, floor, ceil)`
Determines the appropriate trading horizon based on projected price movement.

**Parameters**:
- `px` (number): Current price
- `floor` (number): Support level (can be null)
- `ceil` (number): Resistance level (can be null)

**Returns**: `string` - Trading horizon: 'SCALP', 'SWING', or 'POSITION'

**Logic**:
- Distance to nearest wall as percentage of price
- ≤ 0.4%: SCALP
- ≤ 2.0%: SWING  
- \> 2.0%: POSITION

**Example**:
```javascript
const price = 45000;
const support = 44500;
const resistance = 46000;

const horizon = Analytics.horizonByProj(price, support, resistance);
console.log(`Trading horizon: ${horizon}`);

// Calculate distances
const upDistance = resistance - price;
const downDistance = price - support;
const minDistance = Math.min(upDistance, downDistance);
const distancePercent = (minDistance / price) * 100;

console.log(`Nearest wall distance: ${distancePercent.toFixed(2)}%`);

// Set appropriate parameters based on horizon
const horizonParams = {
  'SCALP': { ttl: 60, riskMult: 1.0 },
  'SWING': { ttl: 360, riskMult: 1.0 },
  'POSITION': { ttl: 1440, riskMult: 0.8 }
};

const params = horizonParams[horizon];
console.log(`TTL: ${params.ttl} minutes, Risk multiplier: ${params.riskMult}`);
```

---

#### `Analytics.btcAdj(sym)`
Calculates Bitcoin correlation adjustment for altcoins.

**Parameters**:
- `sym` (string): Cryptocurrency symbol

**Returns**: `number` - Correlation adjustment factor (-0.12 to 0.12)

**Logic**:
- Returns 0 for BTC itself
- Calculates correlation between symbol and BTC returns
- Uses last 200 price points from derivatives log
- Adjustment = correlation × 0.12 (clamped to ±0.12)

**Example**:
```javascript
const btcAdj = Analytics.btcAdj('ETH');
console.log(`ETH-BTC correlation adjustment: ${btcAdj.toFixed(3)}`);

if (btcAdj > 0.05) {
  console.log('Strong positive correlation with BTC');
} else if (btcAdj < -0.05) {
  console.log('Strong negative correlation with BTC');
} else {
  console.log('Low correlation with BTC');
}

// Use in model scoring
const baseScore = 0.6;
const adjustedScore = baseScore + btcAdj;
console.log(`Score adjusted for BTC correlation: ${adjustedScore.toFixed(3)}`);
```

## Usage Patterns

### Data Pipeline Example
```javascript
function analyzeMarket(symbol) {
  // 1. Get current price
  const snapshot = dataManager.snapshot(symbol);
  if (!snapshot) return null;
  
  // 2. Analyze order book
  const bookAnalysis = Analytics.wallsAndObi(symbol, snapshot.price);
  
  // 3. Get technical indicators
  const atr = Analytics.atr(symbol);
  const cvd = Analytics.cvd(symbol);
  const funding = Analytics.funding(symbol);
  const oiData = Analytics.openInterest(symbol);
  
  // 4. Determine trading horizon
  const horizon = Analytics.horizonByProj(snapshot.price, bookAnalysis.floor, bookAnalysis.ceil);
  
  // 5. Get correlation adjustment
  const btcAdj = Analytics.btcAdj(symbol);
  
  return {
    symbol,
    price: snapshot.price,
    horizon,
    features: {
      OBI: bookAnalysis.OBI,
      cvd: cvd,
      funding: funding,
      dOI: oiData.delta,
      atr: atr,
      btcAdj: btcAdj
    },
    levels: {
      support: bookAnalysis.floor,
      resistance: bookAnalysis.ceil
    },
    freshness: snapshot.freshness
  };
}
```

### Error Handling Best Practices
```javascript
function safeDataFetch(symbol) {
  const results = {
    snapshot: null,
    book: null,
    trades: null,
    funding: null,
    errors: []
  };
  
  try {
    results.snapshot = dataManager.snapshot(symbol);
  } catch (error) {
    results.errors.push(`Snapshot: ${error.message}`);
  }
  
  try {
    results.book = Analytics.bookCombined(symbol);
  } catch (error) {
    results.errors.push(`Book: ${error.message}`);
  }
  
  try {
    results.trades = Analytics.cvd(symbol);
  } catch (error) {
    results.errors.push(`Trades: ${error.message}`);
  }
  
  try {
    results.funding = Analytics.funding(symbol);
  } catch (error) {
    results.errors.push(`Funding: ${error.message}`);
  }
  
  return results;
}
```

### Performance Monitoring
```javascript
function benchmarkDataFetching(symbols) {
  const start = Date.now();
  const results = {};
  
  symbols.forEach(symbol => {
    const symbolStart = Date.now();
    
    try {
      results[symbol] = {
        snapshot: dataManager.snapshot(symbol),
        analysis: Analytics.wallsAndObi(symbol, 0), // Will get price from snapshot
        timing: Date.now() - symbolStart
      };
    } catch (error) {
      results[symbol] = {
        error: error.message,
        timing: Date.now() - symbolStart
      };
    }
  });
  
  const totalTime = Date.now() - start;
  console.log(`Total time: ${totalTime}ms for ${symbols.length} symbols`);
  
  return results;
}
```

---

The data management classes provide a robust foundation for market data acquisition and analysis, with built-in caching, error handling, and multi-exchange support.