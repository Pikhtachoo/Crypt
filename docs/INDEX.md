# Documentation Index

This is the complete documentation index for the Crypto Quantum Trader Pro v16.4s system.

## 📋 Quick Navigation

### Getting Started
- **[README.md](../README.md)** - Project overview, installation, and quick start guide
- **[CONFIGURATION.md](CONFIGURATION.md)** - Complete configuration reference
- **[USAGE_EXAMPLES.md](USAGE_EXAMPLES.md)** - Practical examples for all components

### Core Components
- **[UTILITIES.md](UTILITIES.md)** - U object utilities reference
- **[DATA_CLASSES.md](DATA_CLASSES.md)** - WorkerClient, DataManager, and Analytics classes
- **[MACHINE_LEARNING.md](MACHINE_LEARNING.md)** - ML model documentation
- **[TRADING_FUNCTIONS.md](TRADING_FUNCTIONS.md)** - Trading logic and risk management
- **[ENTRY_POINTS.md](ENTRY_POINTS.md)** - Menu functions and system entry points

### Reference
- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete API reference

## 📚 Documentation Structure

### 1. [README.md](../README.md)
**Main project documentation**
- System overview and architecture
- Installation and setup instructions
- Core concepts and trading logic
- Basic usage examples
- Performance monitoring
- Risk disclaimer

### 2. [CONFIGURATION.md](CONFIGURATION.md)
**Configuration and settings reference**
- Global constants documentation
- Runtime settings parameters
- Configuration best practices
- Environment variables
- Validation and tuning guides

### 3. [UTILITIES.md](UTILITIES.md)
**U object utilities documentation**
- Spreadsheet operations (ss, getOrCreate, setMenu)
- Date/time functions (nowStr, parseIso, diffMin)
- Data utilities (props, cache, readJsonSafe)
- Mathematical functions (clamp, sigmoid, zScore)
- Statistical functions (sum, mean, std, corr)
- Helper functions (id, toFixedDyn)

### 4. [DATA_CLASSES.md](DATA_CLASSES.md)
**Data management classes**
- **WorkerClient**: Cloudflare Worker communication
  - Health checks and connectivity testing
  - Market data pack retrieval
- **DataManager**: Exchange API management
  - Price snapshots and caching
  - Order book data (OKX, Binance)
  - Trade data and funding rates
  - OHLC and open interest data
- **Analytics**: Market analysis functions
  - Combined order book analysis
  - Wall detection and OBI calculation
  - CVD, funding, and correlation analysis

### 5. [MACHINE_LEARNING.md](MACHINE_LEARNING.md)
**ML model documentation**
- Model architecture (logistic regression)
- Feature engineering and validation
- Online learning implementation
- Model prediction and scoring
- Performance analysis and calibration
- Training examples and best practices

### 6. [TRADING_FUNCTIONS.md](TRADING_FUNCTIONS.md)
**Trading and risk management**
- Signal generation pipeline
- Feature computation and validation
- Horizon determination logic
- Risk management functions
- Stop-loss and take-profit calculation
- Position management and limits
- Event-based risk adjustments
- Trade execution and monitoring

### 7. [ENTRY_POINTS.md](ENTRY_POINTS.md)
**System entry points and menu functions**
- **testConnectivity()**: Connection testing
- **updateMain()**: Main trading loop
- **initQuantumTrader()**: System initialization
- **installTriggers()**: Automation setup
- **kpi_24h_summary_now()**: Performance reporting
- Diagnostic and monitoring functions

### 8. [API_REFERENCE.md](API_REFERENCE.md)
**Complete API reference**
- All constants and configuration values
- Function signatures and parameters
- Return types and data structures
- Error handling patterns
- Usage patterns and best practices

### 9. [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md)
**Comprehensive usage examples**
- Quick start examples
- Data management workflows
- Analytics implementation
- Machine learning usage
- Trading strategy examples
- Risk management scenarios
- Complete trading workflows
- Debugging and troubleshooting

## 🎯 Use Cases by Role

### For Developers
1. **Getting Started**: README.md → CONFIGURATION.md → USAGE_EXAMPLES.md
2. **API Integration**: API_REFERENCE.md → DATA_CLASSES.md
3. **Custom Features**: UTILITIES.md → MACHINE_LEARNING.md
4. **Debugging**: USAGE_EXAMPLES.md (Debugging section) → ENTRY_POINTS.md

### For Traders
1. **System Setup**: README.md → CONFIGURATION.md → ENTRY_POINTS.md
2. **Understanding Signals**: TRADING_FUNCTIONS.md → MACHINE_LEARNING.md
3. **Risk Management**: TRADING_FUNCTIONS.md (Risk Management section)
4. **Performance Analysis**: ENTRY_POINTS.md (KPI functions)

### For System Administrators
1. **Installation**: README.md → CONFIGURATION.md
2. **Monitoring**: ENTRY_POINTS.md → USAGE_EXAMPLES.md
3. **Troubleshooting**: USAGE_EXAMPLES.md (Debugging section)
4. **Maintenance**: CONFIGURATION.md → ENTRY_POINTS.md

## 🔍 Quick Reference

### Key Functions by Category

#### Data Management
- `dataManager.snapshot(sym)` - Get current price
- `Analytics.bookCombined(sym)` - Combined order book
- `Analytics.wallsAndObi(sym, mid)` - Wall analysis
- `Analytics.cvd(sym)` - Volume delta

#### Machine Learning
- `computeFeatures(sym, snap)` - Feature engineering
- `modelScore(features, horizon)` - Get probability
- `modelOnlineUpdate(example)` - Update weights

#### Trading
- `decideSignal(prob, longMin, shortMax)` - Generate signal
- `calcSL_TPs(side, px, atr, floor, ceil, mult)` - Calculate levels
- `openTrade(...)` - Execute trade
- `processActive()` - Manage positions

#### Risk Management
- `currentEventPolicy()` - Get event settings
- `dailyRiskUsedUSD()` - Check daily risk
- `canOpenMoreForSymbol(sym)` - Position limits

#### System
- `updateMain()` - Main trading loop
- `testConnectivity()` - Test connections
- `initQuantumTrader()` - Initialize system

### Common Data Structures

#### Price Snapshot
```javascript
{
  symbol: 'BTC',
  price: 45000,
  src: 'OKX',
  ts: '2024-01-15T17:30:25+03:00',
  freshness: 'LIVE'
}
```

#### Feature Vector
```javascript
{
  OBI: 0.15,          // Order book imbalance
  funding: -0.001,    // Funding rate
  dOI: 1000,         // Open interest delta
  cvd: 50,           // Cumulative volume delta
  proj: 0.025,       // Projected move
  btcAdj: 0.03,      // BTC correlation
  atr: 150           // Average True Range
}
```

#### Trade Levels
```javascript
{
  SL: 44350,         // Stop-loss price
  TPs: [46000, 46800, 48000, 49200], // Take-profits
  R: 650             // Risk amount
}
```

## 🛠️ Development Workflow

### Setting Up Development Environment
1. Read [README.md](../README.md) for system overview
2. Follow [CONFIGURATION.md](CONFIGURATION.md) for setup
3. Run `initQuantumTrader()` to initialize
4. Test with examples from [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md)

### Adding New Features
1. Review [API_REFERENCE.md](API_REFERENCE.md) for existing APIs
2. Use [UTILITIES.md](UTILITIES.md) for common operations
3. Follow patterns from [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md)
4. Update documentation accordingly

### Debugging Issues
1. Use diagnostic functions from [ENTRY_POINTS.md](ENTRY_POINTS.md)
2. Follow debugging examples in [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md)
3. Check configuration in [CONFIGURATION.md](CONFIGURATION.md)
4. Review data flow in [DATA_CLASSES.md](DATA_CLASSES.md)

## 📊 System Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Google Sheets │    │  Cloudflare     │    │   Exchanges     │
│   (Interface)   │◄──►│  Worker (Proxy) │◄──►│  (OKX, Binance) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Entry Points  │    │  Data Manager   │    │   Analytics     │
│  (Menu/Triggers)│◄──►│   (Caching)     │◄──►│  (Indicators)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Trading       │    │   ML Model      │    │  Risk Mgmt      │
│   Functions     │◄──►│  (Prediction)   │◄──►│  (Limits)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Utilities     │
│   (U Object)    │
└─────────────────┘
```

## 🔄 Data Flow

1. **Market Data**: Exchanges → Worker → DataManager → Analytics
2. **Features**: Analytics → computeFeatures() → Feature Vector
3. **Prediction**: Features → ML Model → Probability Score
4. **Signal**: Probability → decideSignal() → Trading Signal
5. **Execution**: Signal → Risk Checks → openTrade() → Position
6. **Monitoring**: Position → processActive() → Updates/Exits

## 📈 Performance Considerations

- **Caching**: All external data is cached with appropriate TTLs
- **Rate Limiting**: Built-in throttling prevents quota exhaustion
- **Batch Operations**: Sheet operations are batched for efficiency
- **Error Handling**: Comprehensive error handling and recovery
- **Resource Management**: Automatic cleanup and memory management

## 🔐 Security Notes

- **API Keys**: Never log or expose WORKER_KEY
- **Data Validation**: All external data is validated
- **Error Sanitization**: Error messages are sanitized
- **Access Control**: Functions validate inputs and permissions

## 📞 Support and Maintenance

### Regular Maintenance Tasks
- Monitor system health with diagnostic functions
- Review and update configuration parameters
- Analyze performance metrics and KPIs
- Update model weights based on performance
- Clean up old data and logs

### Troubleshooting Resources
- Error logs in `🚨 ERRORS` sheet
- System diagnostics in [ENTRY_POINTS.md](ENTRY_POINTS.md)
- Debugging examples in [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md)
- Performance profiling tools

---

**Version**: 16.4s  
**Last Updated**: January 2024  
**License**: Proprietary  

**⚠️ Risk Disclaimer**: This system is for educational and research purposes. Cryptocurrency trading involves substantial risk. Use at your own risk.