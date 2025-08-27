# Configuration Reference

This document provides detailed information about all configuration parameters in the Crypto Quantum Trader Pro system.

## Configuration Overview

The system uses a two-tier configuration approach:
1. **Global Constants**: Hard-coded defaults in the script
2. **Settings Sheet**: Runtime-configurable parameters stored in the `⚙️ НАСТРОЙКИ` sheet

## Global Constants

### Exchange & API Configuration

#### `TZ`
- **Type**: `string`
- **Default**: `'Europe/Moscow'`
- **Description**: Timezone for all timestamp operations and logging
- **Usage**: Used by `U.nowStr()` and all date formatting functions

#### `WORKER_BASE`
- **Type**: `string`
- **Default**: `'https://pikhta.pikhtovnikov-alieksandr.workers.dev'`
- **Description**: Base URL for the Cloudflare Worker proxy
- **Usage**: All API requests are routed through this proxy to avoid CORS and quota issues
- **Configuration**: Update this to your own Cloudflare Worker URL

#### `WORKER_KEY`
- **Type**: `string`
- **Default**: `'MySuperSecretKey123!@#'`
- **Description**: Authentication key for the Cloudflare Worker
- **Security**: ⚠️ **Change this to your own secret key**
- **Usage**: Sent as `x-api-key` header in all worker requests

#### `DEFAULT_SYMBOLS`
- **Type**: `Array<string>`
- **Default**: `['BTC','ETH','SOL','XRP','ADA']`
- **Description**: Default cryptocurrency symbols to track
- **Usage**: Used when symbols list is not configured in settings
- **Format**: Array of uppercase symbol strings without USDT suffix

### Rate Limiting & Caching

#### `PACK_RATE_LIMIT_MS`
- **Type**: `number`
- **Default**: `60000` (1 minute)
- **Description**: Minimum time between `/pack` endpoint requests
- **Purpose**: Prevents quota exhaustion and API rate limiting
- **Tuning**: Increase if experiencing quota issues, decrease for more frequent updates

#### `PACK_CACHE_TTL_SEC`
- **Type**: `number`
- **Default**: `55` seconds
- **Description**: Cache time-to-live for pack data
- **Usage**: Cached data is served if within TTL, reducing API calls
- **Relationship**: Should be slightly less than `PACK_RATE_LIMIT_MS`

#### `BOOK_TTL_SEC`
- **Type**: `number`
- **Default**: `60` seconds
- **Description**: Cache TTL for order book data
- **Impact**: Affects freshness of order book analysis

#### `TRADES_TTL_SEC`
- **Type**: `number`
- **Default**: `60` seconds
- **Description**: Cache TTL for trades data
- **Impact**: Affects CVD (Cumulative Volume Delta) calculations

#### `FUND_TTL_SEC`
- **Type**: `number`
- **Default**: `300` seconds (5 minutes)
- **Description**: Cache TTL for funding rate data
- **Reasoning**: Funding rates update less frequently than price data

#### `OI_TTL_SEC`
- **Type**: `number`
- **Default**: `120` seconds (2 minutes)
- **Description**: Cache TTL for open interest data
- **Impact**: Affects open interest delta calculations

#### `OHLC_TTL_SEC`
- **Type**: `number`
- **Default**: `60` seconds
- **Description**: Cache TTL for OHLC candlestick data
- **Impact**: Affects ATR (Average True Range) calculations

### Technical Analysis Parameters

#### `BOOK_LEVELS`
- **Type**: `number`
- **Default**: `20`
- **Description**: Number of order book levels to analyze on each side
- **Impact**: More levels = better wall detection but slower processing
- **Range**: Typically 10-50, limited by exchange API

#### `ATR_PERIOD_M1`
- **Type**: `number`
- **Default**: `14`
- **Description**: Period for ATR calculation on 1-minute timeframe
- **Standard**: 14 is the traditional ATR period
- **Impact**: Affects stop-loss and volatility measurements

#### `ATR_MIN_RATIO`
- **Type**: `number`
- **Default**: `0.005` (0.5%)
- **Description**: Minimum stop-loss as percentage of price
- **Purpose**: Prevents extremely tight stops in low-volatility conditions
- **Usage**: `SL = max(ATR, price * ATR_MIN_RATIO)`

#### `WALL_REL_MULT`
- **Type**: `number`
- **Default**: `3.0`
- **Description**: Multiplier for detecting anomalous order book walls
- **Logic**: Wall detected if `level_size > average_size * WALL_REL_MULT`
- **Tuning**: Higher values = fewer, stronger walls detected

#### `WALL_BUF_RATIO`
- **Type**: `number`
- **Default**: `0.0015` (0.15%)
- **Description**: Buffer distance beyond walls for stop-loss/take-profit placement
- **Purpose**: Accounts for slippage and wall movement
- **Usage**: `SL = wall_level ± (price * WALL_BUF_RATIO)`

### Trading Fees & Slippage

#### `TAKER_FEE_PER_SIDE`
- **Type**: `number`
- **Default**: `0.0006` (0.06%)
- **Description**: Taker fee per side (entry + exit = 2 sides)
- **Usage**: Used in profit calculations and break-even analysis
- **Exchange**: Based on typical futures trading fees

#### `SLIPPAGE_BPS_BASE`
- **Type**: `number`
- **Default**: `5` basis points (0.05%)
- **Description**: Base slippage assumption for market orders
- **Impact**: Affects expected execution prices

### Model Parameters

#### `LONG_PROB_MIN`
- **Type**: `number`
- **Default**: `0.55`
- **Description**: Minimum probability threshold for LONG signals
- **Range**: 0.5 to 1.0
- **Tuning**: Higher = fewer but higher-confidence LONG signals

#### `SHORT_PROB_MAX`
- **Type**: `number`
- **Default**: `0.45`
- **Description**: Maximum probability threshold for SHORT signals
- **Range**: 0.0 to 0.5
- **Tuning**: Lower = fewer but higher-confidence SHORT signals

#### `LR` (Learning Rate)
- **Type**: `number`
- **Default**: `0.03`
- **Description**: Learning rate for online model updates
- **Impact**: Higher = faster adaptation but more noise
- **Range**: Typically 0.001 to 0.1

#### `L2` (L2 Regularization)
- **Type**: `number`
- **Default**: `0.001`
- **Description**: L2 regularization parameter to prevent overfitting
- **Impact**: Higher = more regularization, simpler model
- **Range**: Typically 0.0001 to 0.01

### Risk Management

#### `ACCOUNT_SIZE_USD`
- **Type**: `number`
- **Default**: `10000`
- **Description**: Total account size in USD for position sizing
- **Usage**: `position_size = (account_size * risk_pct) / stop_distance`
- **Configuration**: Set to your actual account size

#### `RISK_PER_TRADE_PCT`
- **Type**: `number`
- **Default**: `1.0` (1%)
- **Description**: Maximum risk per trade as percentage of account
- **Conservative**: 0.5-1%
- **Aggressive**: 2-3%
- **Usage**: Determines position size for each trade

#### `DAILY_RISK_LIMIT_USD`
- **Type**: `number`
- **Default**: `200`
- **Description**: Soft daily loss limit in USD
- **Purpose**: Prevents excessive losses on bad days
- **Logic**: System may reduce activity when limit approached

### Trading Horizons & TTL

#### `TTL_SCALP_MIN`
- **Type**: `number`
- **Default**: `60` minutes
- **Description**: Time-to-live for scalping trades
- **Reasoning**: Scalp trades should resolve quickly

#### `TTL_SWING_MIN`
- **Type**: `number`
- **Default**: `360` minutes (6 hours)
- **Description**: Time-to-live for swing trades
- **Reasoning**: Swing trades have longer time horizon

#### `TTL_POSITION_MIN`
- **Type**: `number`
- **Default**: `1440` minutes (24 hours)
- **Description**: Time-to-live for position trades
- **Reasoning**: Position trades are long-term

### Event Risk Management

#### `EVENT_RISK_MULT`
- **Type**: `number`
- **Default**: `0.5`
- **Description**: Risk multiplier during events (reduces position size)
- **Logic**: `actual_risk = base_risk * EVENT_RISK_MULT`
- **Purpose**: Reduces exposure during high-volatility periods

#### `EVENT_SL_MULT`
- **Type**: `number`
- **Default**: `1.2`
- **Description**: Stop-loss multiplier during events (tighter stops)
- **Logic**: `event_sl = normal_sl * EVENT_SL_MULT`
- **Purpose**: Reduces risk per trade during events

#### `BLOCK_SCALP_IN_EVENT`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to block scalping during events
- **Reasoning**: Scalping is riskier during high volatility

### Take-Profit Configuration

#### `TP_R`
- **Type**: `Array<number>`
- **Default**: `[1.0, 1.8, 3.0, 4.5]`
- **Description**: Take-profit levels in R multiples (R = stop distance)
- **Example**: If stop is 1% away, TP levels are at 1%, 1.8%, 3%, 4.5%
- **Strategy**: Allows scaling out of positions

#### `TP_ALLOCATION`
- **Type**: `Array<number>`
- **Default**: `[0.25, 0.25, 0.25, 0.25]`
- **Description**: Allocation percentages for each TP level
- **Constraint**: Must sum to 1.0
- **Strategy**: Equal allocation across all TP levels

## Settings Sheet Parameters

The following parameters can be configured at runtime through the `⚙️ НАСТРОЙКИ` sheet:

### Core Settings

| Key | Default | Description |
|-----|---------|-------------|
| `TZ` | `Europe/Moscow` | Timezone for logging |
| `WORKER_BASE` | `(from constant)` | Cloudflare Worker URL |
| `SYMBOLS` | `BTC,ETH,SOL,XRP,ADA` | Comma-separated symbols |
| `PACK_RATE_LIMIT_MS` | `60000` | Pack request rate limit |
| `BOOK_LEVELS` | `20` | Order book depth |
| `ATR_PERIOD_M1` | `14` | ATR calculation period |
| `ATR_MIN_RATIO` | `0.005` | Minimum SL ratio |
| `WALL_REL_MULT` | `3.0` | Wall detection multiplier |
| `WALL_BUF_RATIO` | `0.0015` | Wall buffer ratio |

### Model Settings

| Key | Default | Description |
|-----|---------|-------------|
| `LONG_PROB_MIN` | `0.55` | LONG signal threshold |
| `SHORT_PROB_MAX` | `0.45` | SHORT signal threshold |
| `LR` | `0.03` | Learning rate |
| `L2` | `0.001` | L2 regularization |

### Risk Settings

| Key | Default | Description |
|-----|---------|-------------|
| `ACCOUNT_SIZE_USD` | `10000` | Account size |
| `RISK_PER_TRADE_PCT` | `1.0` | Risk per trade % |
| `DAILY_RISK_LIMIT_USD` | `200` | Daily risk limit |
| `TTL_SCALP_MIN` | `60` | Scalp trade TTL |
| `TTL_SWING_MIN` | `360` | Swing trade TTL |
| `TTL_POSITION_MIN` | `1440` | Position trade TTL |

### Event Risk Settings

| Key | Default | Description |
|-----|---------|-------------|
| `EVENT_RISK_MULT` | `0.5` | Event risk multiplier |
| `EVENT_SL_MULT` | `1.2` | Event SL multiplier |
| `BLOCK_SCALP_IN_EVENT` | `true` | Block scalping in events |

### Feature Toggles

| Key | Default | Description |
|-----|---------|-------------|
| `USE_BOOK` | `true` | Enable order book analysis |
| `USE_TRADES` | `true` | Enable trades/CVD analysis |
| `USE_OI_FUND` | `true` | Enable OI/funding analysis |
| `USE_OHLC` | `true` | Enable OHLC/ATR analysis |

## Configuration Best Practices

### Initial Setup
1. **Set your own `WORKER_KEY`** - Never use the default
2. **Configure `ACCOUNT_SIZE_USD`** to match your actual account
3. **Adjust `RISK_PER_TRADE_PCT`** based on your risk tolerance
4. **Set appropriate `SYMBOLS`** for your trading preferences

### Performance Tuning
1. **Increase cache TTLs** if you have API quota issues
2. **Reduce `BOOK_LEVELS`** for faster processing
3. **Adjust rate limits** based on your API tier

### Risk Management
1. **Start with conservative risk settings** (0.5% per trade)
2. **Set realistic daily limits** (2-5% of account)
3. **Use event management** for high-impact news periods

### Model Tuning
1. **Adjust probability thresholds** based on backtest results
2. **Monitor learning rate** - reduce if model is unstable
3. **Increase L2 regularization** if overfitting occurs

## Environment Variables

If using the system outside of Google Sheets, these environment variables can be set:

```javascript
// Example environment configuration
const CONFIG = {
  TZ: process.env.TZ || 'Europe/Moscow',
  WORKER_BASE: process.env.WORKER_BASE || 'https://your-worker.workers.dev',
  WORKER_KEY: process.env.WORKER_KEY || 'your-secret-key',
  ACCOUNT_SIZE_USD: parseFloat(process.env.ACCOUNT_SIZE_USD) || 10000,
  RISK_PER_TRADE_PCT: parseFloat(process.env.RISK_PER_TRADE_PCT) || 1.0
};
```

## Configuration Validation

The system includes built-in validation for critical parameters:

```javascript
function validateConfig() {
  const settings = readSettingMap();
  
  // Validate required settings
  if (!settings.WORKER_BASE) {
    throw new Error('WORKER_BASE must be configured');
  }
  
  // Validate numeric ranges
  const riskPct = parseFloat(settings.RISK_PER_TRADE_PCT);
  if (riskPct <= 0 || riskPct > 10) {
    throw new Error('RISK_PER_TRADE_PCT must be between 0 and 10');
  }
  
  // Validate probability thresholds
  const longMin = parseFloat(settings.LONG_PROB_MIN);
  const shortMax = parseFloat(settings.SHORT_PROB_MAX);
  if (longMin <= shortMax) {
    throw new Error('LONG_PROB_MIN must be greater than SHORT_PROB_MAX');
  }
  
  return true;
}
```

## Dynamic Configuration Updates

Settings can be updated at runtime without restarting the system:

```javascript
// Update a setting programmatically
function updateSetting(key, value) {
  const sh = ensureSettings();
  const range = sh.getDataRange();
  const values = range.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === key) {
      sh.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  
  // Add new setting if not found
  sh.getRange(sh.getLastRow() + 1, 1, 1, 3)
    .setValues([[key, value, 'Runtime added']]);
}

// Example usage
updateSetting('RISK_PER_TRADE_PCT', 0.75);
```

---

**Note**: Always test configuration changes in a safe environment before applying to live trading.