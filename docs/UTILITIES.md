# Utilities Reference (U Object)

The `U` object is a comprehensive utilities library that provides common functionality used throughout the Crypto Quantum Trader Pro system. It contains methods for spreadsheet operations, date/time handling, mathematical calculations, and statistical functions.

## Overview

```javascript
const U = {
  // Spreadsheet operations
  ss, getOrCreate, setMenu,
  
  // Date/time utilities
  nowStr, parseIso, diffMin,
  
  // Data utilities
  props, cache, readJsonSafe,
  
  // Mathematical functions
  clamp, sigmoid, zScore,
  
  // Statistical functions
  sum, mean, std, corr,
  
  // Helper functions
  id, toFixedDyn
};
```

## Spreadsheet Operations

### `U.ss()`
Returns the active Google Spreadsheet instance.

**Returns**: `Spreadsheet` - The active spreadsheet object

**Example**:
```javascript
const spreadsheet = U.ss();
const sheets = spreadsheet.getSheets();
console.log(`Spreadsheet has ${sheets.length} sheets`);
```

---

### `U.getOrCreate(name, headers)`
Gets an existing sheet by name or creates it if it doesn't exist. Optionally sets up headers.

**Parameters**:
- `name` (string): Name of the sheet
- `headers` (Array<string>, optional): Array of header strings for the first row

**Returns**: `Sheet` - The sheet object

**Behavior**:
- If sheet doesn't exist, creates a new one
- If headers are provided and don't match existing headers, clears sheet and sets new headers
- Automatically freezes the first row when headers are set

**Example**:
```javascript
// Create a simple sheet
const dataSheet = U.getOrCreate('Market Data');

// Create sheet with headers
const logSheet = U.getOrCreate('Trade Log', [
  'Timestamp', 'Symbol', 'Side', 'Price', 'Quantity', 'Status'
]);

// Headers are automatically frozen and formatted
```

**Advanced Usage**:
```javascript
// The function intelligently handles header updates
const sheet = U.getOrCreate('Analytics', ['Date', 'Symbol', 'Price']);

// Later, if you call with more headers, it will update:
U.getOrCreate('Analytics', ['Date', 'Symbol', 'Price', 'Volume', 'RSI']);
// Sheet is cleared and new headers are set
```

---

### `U.setMenu()`
Creates the custom menu in the Google Sheets UI with trading system commands.

**Menu Items**:
- **📡 Тест соединения** → `testConnectivity()`
- **🔄 Обновить (main)** → `updateMain()`
- **⚙️ Инициализация** → `initQuantumTrader()`
- **⏱️ Установить триггеры** → `installTriggers()`
- **📊 KPI (24h)** → `kpi_24h_summary_now()`

**Example**:
```javascript
// Call during initialization
U.setMenu();

// Menu appears as "🚀 Quantum Trader" in the Google Sheets menu bar
```

## Date/Time Utilities

### `U.nowStr()`
Returns the current timestamp formatted for the configured timezone.

**Returns**: `string` - Formatted timestamp in 'YYYY-MM-DD HH:mm:ss' format

**Example**:
```javascript
const timestamp = U.nowStr();
console.log(timestamp); // "2024-01-15 14:30:25"

// Used extensively in logging
const logEntry = [U.nowStr(), 'BTC', 'LONG', 45000];
```

---

### `U.parseIso(s)`
Parses an ISO date string into a Date object, with null safety.

**Parameters**:
- `s` (string): ISO date string

**Returns**: `Date|null` - Parsed date or null if invalid

**Example**:
```javascript
const date1 = U.parseIso('2024-01-15T14:30:25Z');
console.log(date1); // Date object

const date2 = U.parseIso('invalid-date');
console.log(date2); // null

const date3 = U.parseIso(null);
console.log(date3); // null
```

---

### `U.diffMin(a, b)`
Calculates the difference between two dates in minutes.

**Parameters**:
- `a` (Date): First date
- `b` (Date): Second date

**Returns**: `number` - Difference in minutes (a - b), floored to integer

**Example**:
```javascript
const now = new Date();
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

const diff = U.diffMin(now, fiveMinutesAgo);
console.log(diff); // 5

// Used for trade duration calculations
const tradeOpen = U.parseIso('2024-01-15T14:00:00Z');
const tradeClose = U.parseIso('2024-01-15T14:30:00Z');
const duration = U.diffMin(tradeClose, tradeOpen);
console.log(`Trade lasted ${duration} minutes`);
```

## Data Utilities

### `U.props()`
Returns the Google Apps Script Properties Service for persistent storage.

**Returns**: `Properties` - Script properties service

**Example**:
```javascript
const props = U.props();

// Store a value
props.setProperty('lastUpdate', Date.now().toString());

// Retrieve a value
const lastUpdate = props.getProperty('lastUpdate');

// Delete a property
props.deleteProperty('tempData');
```

---

### `U.cache()`
Returns the Google Apps Script Cache Service for temporary storage.

**Returns**: `Cache` - Script cache service

**Example**:
```javascript
const cache = U.cache();

// Store data with TTL
const marketData = { BTC: 45000, ETH: 3000 };
cache.put('market_snapshot', JSON.stringify(marketData), 300); // 5 minutes

// Retrieve data
const cached = cache.get('market_snapshot');
if (cached) {
  const data = JSON.parse(cached);
  console.log('BTC price:', data.BTC);
}
```

---

### `U.readJsonSafe(s)`
Safely parses a JSON string, returning null if parsing fails.

**Parameters**:
- `s` (string): JSON string to parse

**Returns**: `Object|null` - Parsed object or null if invalid

**Example**:
```javascript
const validJson = '{"symbol": "BTC", "price": 45000}';
const data1 = U.readJsonSafe(validJson);
console.log(data1.symbol); // "BTC"

const invalidJson = '{"symbol": "BTC", "price":}';
const data2 = U.readJsonSafe(invalidJson);
console.log(data2); // null

// Safe usage in cache retrieval
const cached = cache.get('market_data');
const data = U.readJsonSafe(cached);
if (data) {
  // Process valid data
  processMarketData(data);
} else {
  // Handle invalid or missing data
  console.log('No valid cached data found');
}
```

## Mathematical Functions

### `U.clamp(x, a, b)`
Constrains a value between minimum and maximum bounds.

**Parameters**:
- `x` (number): Value to clamp
- `a` (number): Minimum bound
- `b` (number): Maximum bound

**Returns**: `number` - Clamped value

**Example**:
```javascript
console.log(U.clamp(5, 0, 10));   // 5
console.log(U.clamp(-1, 0, 10));  // 0
console.log(U.clamp(15, 0, 10));  // 10

// Used in risk management
const riskPct = U.clamp(userInput, 0.1, 5.0); // Risk between 0.1% and 5%

// Position sizing with limits
const positionSize = U.clamp(calculatedSize, minSize, maxSize);
```

---

### `U.sigmoid(z)`
Calculates the sigmoid function: 1 / (1 + e^(-z))

**Parameters**:
- `z` (number): Input value

**Returns**: `number` - Sigmoid output between 0 and 1

**Example**:
```javascript
console.log(U.sigmoid(0));    // 0.5
console.log(U.sigmoid(5));    // 0.9933 (close to 1)
console.log(U.sigmoid(-5));   // 0.0067 (close to 0)

// Used in the machine learning model
const features = { OBI: 0.1, funding: -0.001, /* ... */ };
const z = calculateLinearCombination(features);
const probability = U.sigmoid(z);
console.log(`Trade probability: ${(probability * 100).toFixed(1)}%`);
```

---

### `U.zScore(x, mean, std)`
Calculates the z-score (standard score) of a value.

**Parameters**:
- `x` (number): Value to normalize
- `mean` (number): Mean of the distribution
- `std` (number): Standard deviation of the distribution

**Returns**: `number` - Z-score, or 0 if std is 0

**Example**:
```javascript
const prices = [100, 102, 98, 105, 97];
const mean = U.mean(prices);  // 100.4
const std = U.std(prices);    // 3.36

const currentPrice = 108;
const zScore = U.zScore(currentPrice, mean, std);
console.log(`Price z-score: ${zScore.toFixed(2)}`); // 2.26 (unusually high)

// Used for outlier detection
if (Math.abs(zScore) > 2) {
  console.log('Price is more than 2 standard deviations from mean');
}
```

## Statistical Functions

### `U.sum(a)`
Calculates the sum of an array of numbers, safely handling non-numeric values.

**Parameters**:
- `a` (Array): Array of values

**Returns**: `number` - Sum of numeric values

**Example**:
```javascript
console.log(U.sum([1, 2, 3, 4, 5]));           // 15
console.log(U.sum([1, 'abc', 3, null, 5]));    // 9 (ignores non-numeric)
console.log(U.sum([]));                        // 0

// Used in volume calculations
const volumes = [100, 150, 200, 75, 125];
const totalVolume = U.sum(volumes);
console.log(`Total volume: ${totalVolume}`);
```

---

### `U.mean(a)`
Calculates the arithmetic mean (average) of an array.

**Parameters**:
- `a` (Array): Array of numbers

**Returns**: `number` - Mean value, or 0 if array is empty

**Example**:
```javascript
console.log(U.mean([1, 2, 3, 4, 5]));     // 3
console.log(U.mean([10, 20, 30]));        // 20
console.log(U.mean([]));                  // 0

// Used in technical analysis
const prices = [45000, 45100, 44900, 45200, 45050];
const avgPrice = U.mean(prices);
console.log(`Average price: $${avgPrice}`);

// Moving average calculation
function simpleMovingAverage(data, period) {
  if (data.length < period) return null;
  return U.mean(data.slice(-period));
}
```

---

### `U.std(a)`
Calculates the standard deviation of an array.

**Parameters**:
- `a` (Array): Array of numbers

**Returns**: `number` - Standard deviation, or 0 if array has fewer than 2 elements

**Example**:
```javascript
console.log(U.std([1, 2, 3, 4, 5]));      // 1.58
console.log(U.std([10, 10, 10]));         // 0 (no variation)
console.log(U.std([5]));                  // 0 (insufficient data)

// Used for volatility measurement
const returns = [0.02, -0.01, 0.03, -0.02, 0.01];
const volatility = U.std(returns);
console.log(`Return volatility: ${(volatility * 100).toFixed(2)}%`);

// Bollinger Bands calculation
function bollingerBands(prices, period, stdDev) {
  if (prices.length < period) return null;
  
  const recentPrices = prices.slice(-period);
  const mean = U.mean(recentPrices);
  const std = U.std(recentPrices);
  
  return {
    middle: mean,
    upper: mean + (std * stdDev),
    lower: mean - (std * stdDev)
  };
}
```

---

### `U.corr(a, b)`
Calculates the Pearson correlation coefficient between two arrays.

**Parameters**:
- `a` (Array): First array of numbers
- `b` (Array): Second array of numbers

**Returns**: `number` - Correlation coefficient between -1 and 1, or 0 if insufficient data

**Example**:
```javascript
const x = [1, 2, 3, 4, 5];
const y = [2, 4, 6, 8, 10];  // Perfect positive correlation
console.log(U.corr(x, y));   // 1.0

const z = [10, 8, 6, 4, 2];  // Perfect negative correlation
console.log(U.corr(x, z));   // -1.0

// Used for asset correlation analysis
const btcReturns = [0.02, -0.01, 0.03, -0.02, 0.01];
const ethReturns = [0.025, -0.008, 0.035, -0.018, 0.012];
const correlation = U.corr(btcReturns, ethReturns);
console.log(`BTC-ETH correlation: ${correlation.toFixed(3)}`);

// Portfolio diversification analysis
function analyzeCorrelations(assets) {
  const correlations = {};
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const key = `${assets[i].symbol}-${assets[j].symbol}`;
      correlations[key] = U.corr(assets[i].returns, assets[j].returns);
    }
  }
  return correlations;
}
```

## Helper Functions

### `U.id(sym)`
Generates a unique trade ID for a given symbol.

**Parameters**:
- `sym` (string): Symbol identifier

**Returns**: `string` - Unique ID in format 'QTP-{timestamp}-{symbol}'

**Example**:
```javascript
const tradeId1 = U.id('BTC');
console.log(tradeId1); // "QTP-1705328425123-BTC"

const tradeId2 = U.id('ETH');
console.log(tradeId2); // "QTP-1705328425124-ETH"

// Used when opening new trades
const newTradeId = U.id(symbol);
console.log(`Opening new trade: ${newTradeId}`);
```

---

### `U.toFixedDyn(p)`
Formats a price with dynamic decimal places based on the value magnitude.

**Parameters**:
- `p` (number): Price or value to format

**Returns**: `string` - Formatted price string

**Formatting Rules**:
- `p >= 1000`: 1 decimal place
- `p >= 100`: 2 decimal places  
- `p >= 1`: 3 decimal places
- `p < 1`: 5 decimal places
- Non-finite values: empty string

**Example**:
```javascript
console.log(U.toFixedDyn(45123.456));   // "45123.5"
console.log(U.toFixedDyn(456.789));     // "456.79"
console.log(U.toFixedDyn(12.345));      // "12.345"
console.log(U.toFixedDyn(0.123456));    // "0.12346"
console.log(U.toFixedDyn(0.000123));    // "0.00012"
console.log(U.toFixedDyn(Infinity));    // ""

// Used for display formatting
const prices = [45123.456, 3456.789, 12.345, 0.123456];
prices.forEach(price => {
  console.log(`$${U.toFixedDyn(price)}`);
});
// Output:
// $45123.5
// $3456.79
// $12.345
// $0.12346
```

## Usage Patterns

### Error-Safe Operations
Many utility functions are designed to handle edge cases gracefully:

```javascript
// Safe array operations
const emptyArray = [];
const mixedArray = [1, 'text', null, 3, undefined, 5];

console.log(U.sum(emptyArray));      // 0 (not error)
console.log(U.mean(mixedArray));     // 3 (ignores non-numeric)
console.log(U.std(emptyArray));      // 0 (safe default)
```

### Chaining Operations
Utilities can be chained for complex calculations:

```javascript
function technicalAnalysis(prices) {
  if (!prices || prices.length < 20) return null;
  
  const recent = prices.slice(-20);
  const mean = U.mean(recent);
  const std = U.std(recent);
  const current = prices[prices.length - 1];
  
  return {
    average: U.toFixedDyn(mean),
    volatility: U.toFixedDyn(std),
    zScore: U.zScore(current, mean, std).toFixed(2),
    normalized: U.clamp(U.sigmoid((current - mean) / std), 0, 1)
  };
}
```

### Integration with Google Sheets
The utilities are designed for seamless Google Sheets integration:

```javascript
function updateAnalyticsSheet(symbol, data) {
  const sheet = U.getOrCreate('Analytics', [
    'Timestamp', 'Symbol', 'Price', 'Volume', 'Volatility'
  ]);
  
  const row = [
    U.nowStr(),
    symbol,
    U.toFixedDyn(data.price),
    data.volume,
    U.toFixedDyn(U.std(data.priceHistory))
  ];
  
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length)
       .setValues([row]);
}
```

### Performance Considerations

- **Caching**: Use `U.cache()` for frequently accessed data
- **Batch Operations**: Process arrays in batches for large datasets
- **Memory Management**: Clear unused properties with `U.props().deleteProperty()`

```javascript
// Efficient batch processing
function processPriceData(symbols) {
  const cache = U.cache();
  const results = {};
  
  symbols.forEach(symbol => {
    const cacheKey = `analysis_${symbol}`;
    let analysis = U.readJsonSafe(cache.get(cacheKey));
    
    if (!analysis) {
      analysis = performAnalysis(symbol);
      cache.put(cacheKey, JSON.stringify(analysis), 300);
    }
    
    results[symbol] = analysis;
  });
  
  return results;
}
```

## Best Practices

1. **Always use null-safe parsing**: Use `U.readJsonSafe()` instead of `JSON.parse()`
2. **Handle empty arrays**: Statistical functions return safe defaults for empty inputs
3. **Format numbers consistently**: Use `U.toFixedDyn()` for price display
4. **Cache expensive operations**: Use `U.cache()` for API responses and calculations
5. **Validate inputs**: Use `U.clamp()` to ensure values are within expected ranges

---

The `U` utilities object provides a robust foundation for all operations in the trading system, with built-in error handling and Google Sheets integration.