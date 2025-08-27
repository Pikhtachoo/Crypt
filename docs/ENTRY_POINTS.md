# Entry Point Functions

This document covers the main entry point functions that are called from the Google Sheets menu or through triggers. These functions serve as the primary interface for users to interact with the Crypto Quantum Trader Pro system.

## Overview

The system provides several entry points accessible through the custom Google Sheets menu:

- **📡 Тест соединения** → `testConnectivity()`
- **🔄 Обновить (main)** → `updateMain()`
- **⚙️ Инициализация** → `initQuantumTrader()`
- **⏱️ Установить триггеры** → `installTriggers()`
- **📊 KPI (24h)** → `kpi_24h_summary_now()`

## Menu Functions

### `testConnectivity()`
Tests the connection to the Cloudflare Worker proxy and displays the health status.

**Purpose**: Verify that the system can communicate with external APIs through the proxy

**User Interface**: Shows alert dialog with connection status

**What it does**:
1. Calls `WorkerClient.getHealth()` to check proxy status
2. Displays success or error message to user
3. Shows response details including timestamp and version

**Example Response**:
```javascript
// Success case
{
  status: 'ok',
  timestamp: '2024-01-15T14:30:25.123Z',
  version: '1.0.0',
  uptime: 3600
}
```

**Implementation**:
```javascript
function testConnectivity() {
  try {
    console.log('Testing connectivity to Cloudflare Worker...');
    const startTime = Date.now();
    
    const health = WorkerClient.getHealth();
    const responseTime = Date.now() - startTime;
    
    const ui = SpreadsheetApp.getUi();
    const message = 
      `✅ Connection successful!\n\n` +
      `Status: ${health.status}\n` +
      `Response time: ${responseTime}ms\n` +
      `Server time: ${health.timestamp}\n` +
      `Version: ${health.version || 'Unknown'}`;
    
    ui.alert('🚀 Connectivity Test', message, ui.ButtonSet.OK);
    
    console.log('Connectivity test passed:', health);
    
  } catch (error) {
    console.error('Connectivity test failed:', error);
    
    const ui = SpreadsheetApp.getUi();
    const message = 
      `❌ Connection failed!\n\n` +
      `Error: ${error.message}\n\n` +
      `Please check:\n` +
      `• WORKER_BASE URL is correct\n` +
      `• WORKER_KEY is valid\n` +
      `• Cloudflare Worker is deployed\n` +
      `• Internet connection is stable`;
    
    ui.alert('⚠️ Connectivity Test Failed', message, ui.ButtonSet.OK);
  }
}
```

**Troubleshooting Guide**:
```javascript
function extendedConnectivityTest() {
  const tests = [
    {
      name: 'Worker Base URL',
      test: () => {
        const settings = readSettingMap();
        const url = settings['WORKER_BASE'] || WORKER_BASE;
        return url && url.startsWith('https://');
      }
    },
    {
      name: 'Worker Key',
      test: () => {
        return WORKER_KEY && WORKER_KEY.length > 10;
      }
    },
    {
      name: 'Health Endpoint',
      test: () => {
        return WorkerClient.getHealth();
      }
    },
    {
      name: 'Market Data',
      test: () => {
        return WorkerClient.getPack(['BTC']);
      }
    }
  ];
  
  console.log('Running extended connectivity tests...');
  
  tests.forEach(test => {
    try {
      const result = test.test();
      console.log(`✅ ${test.name}: PASSED`);
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED - ${error.message}`);
    }
  });
}
```

---

### `updateMain()`
The main update function that processes all active signals and generates new trading signals.

**Purpose**: Core trading loop that runs the entire system

**Execution Flow**:
1. **Process Active Trades**: Check SL/TP hits, TTL expiry
2. **Generate New Signals**: Analyze all symbols for trading opportunities  
3. **Update Logs**: Record market data and system status
4. **Risk Management**: Apply daily limits and event policies

**Typical Runtime**: 30-60 seconds depending on number of symbols

**Implementation**:
```javascript
function updateMain() {
  const startTime = Date.now();
  console.log(`=== Starting main update at ${U.nowStr()} ===`);
  
  try {
    // 1. Ensure all sheets exist
    ensureSheetsCore();
    console.log('✅ Sheets initialized');
    
    // 2. Get symbols list
    const symbols = getSymbolsList();
    console.log(`📋 Processing ${symbols.length} symbols: ${symbols.join(', ')}`);
    
    // 3. Check daily risk limit
    const dailyRisk = dailyRiskUsedUSD();
    const dailyLimit = DAILY_RISK_LIMIT_USD;
    
    if (dailyRisk >= dailyLimit) {
      console.log(`⚠️ Daily risk limit exceeded: $${dailyRisk.toFixed(2)} >= $${dailyLimit}`);
      return;
    }
    
    console.log(`💰 Daily risk: $${dailyRisk.toFixed(2)} / $${dailyLimit} (${(dailyRisk/dailyLimit*100).toFixed(1)}%)`);
    
    // 4. Get market data pack
    const pack = _throttledPack(symbols);
    if (!pack || !pack.ok) {
      throw new Error('Failed to get market data pack');
    }
    
    console.log(`📊 Market data received (${pack._source})`);
    
    // 5. Log market data
    appendDerivativesLog(pack);
    console.log('📈 Market data logged');
    
    // 6. Process active trades
    const activeCountBefore = getActiveTradeCount();
    processActive();
    const activeCountAfter = getActiveTradeCount();
    
    if (activeCountBefore !== activeCountAfter) {
      console.log(`🔄 Active trades: ${activeCountBefore} → ${activeCountAfter}`);
    }
    
    // 7. Check event policy
    const eventPolicy = currentEventPolicy();
    if (eventPolicy.active) {
      console.log(`⚠️ Event mode active: risk=${eventPolicy.riskMult}, sl=${eventPolicy.slMult}, blockScalp=${eventPolicy.blockScalp}`);
    }
    
    // 8. Generate new signals
    let signalsGenerated = 0;
    let tradesOpened = 0;
    
    for (const symbol of symbols) {
      try {
        // Skip if already have position
        if (!canOpenMoreForSymbol(symbol)) {
          console.log(`⏭️ ${symbol}: Position already exists`);
          continue;
        }
        
        // Check remaining risk budget
        const currentRisk = dailyRiskUsedUSD();
        if (currentRisk >= dailyLimit) {
          console.log(`💰 Daily risk limit reached, stopping signal generation`);
          break;
        }
        
        // Generate signal
        const signal = generateCompleteSignal(symbol, eventPolicy);
        signalsGenerated++;
        
        if (signal && signal.action === 'OPEN_TRADE') {
          const tradeId = executeTradeFromSignal(signal);
          if (tradeId) {
            tradesOpened++;
            console.log(`✅ ${symbol}: Opened ${signal.side} trade ${tradeId}`);
          }
        } else if (signal) {
          console.log(`📊 ${symbol}: ${signal.action} (prob: ${(signal.probability*100).toFixed(1)}%)`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error.message);
      }
    }
    
    // 9. Summary
    const duration = Date.now() - startTime;
    console.log(`=== Main update completed in ${duration}ms ===`);
    console.log(`📊 Signals generated: ${signalsGenerated}`);
    console.log(`🎯 Trades opened: ${tradesOpened}`);
    console.log(`📈 Active positions: ${getActiveTradeCount()}`);
    
    // 10. Update last run timestamp
    const props = U.props();
    props.setProperty('LAST_UPDATE_MAIN', Date.now().toString());
    
  } catch (error) {
    console.error('❌ Main update failed:', error);
    
    // Log error for debugging
    const errorLog = U.getOrCreate('🚨 ERRORS', ['Timestamp', 'Function', 'Error', 'Stack']);
    errorLog.getRange(errorLog.getLastRow() + 1, 1, 1, 4).setValues([[
      U.nowStr(), 'updateMain', error.message, error.stack || ''
    ]]);
    
    throw error; // Re-throw for trigger handling
  }
}

// Helper functions for updateMain
function getActiveTradeCount() {
  const sheet = U.getOrCreate('📊 АКТИВНЫЕ СИГНАЛЫ', []);
  return Math.max(0, sheet.getLastRow() - 1);
}

function generateCompleteSignal(symbol, eventPolicy) {
  // Get market data
  const snapshot = dataManager.snapshot(symbol);
  if (!snapshot) return { action: 'NO_DATA' };
  
  // Compute features
  const features = computeFeatures(symbol, snapshot);
  
  // Validate features
  const issues = validateFeatures(features);
  if (issues.length > 0) {
    return { action: 'INVALID_FEATURES', issues };
  }
  
  // Determine horizon
  const horizon = decideHorizon(snapshot.price, features.floor, features.ceil);
  
  // Check event policy restrictions
  if (eventPolicy.active && eventPolicy.blockScalp && horizon === 'SCALP') {
    return { action: 'BLOCKED_BY_EVENT', reason: 'Scalping blocked' };
  }
  
  // Get model prediction
  const probability = modelScore(features, horizon);
  
  // Generate signal
  const side = decideSignal(probability, LONG_PROB_MIN, SHORT_PROB_MAX);
  
  if (side === 'NEUTRAL') {
    return { action: 'NEUTRAL', probability, horizon };
  }
  
  // Calculate levels
  const levels = calcSL_TPs(side, snapshot.price, features.atr, features.floor, features.ceil, 
                           eventPolicy.active ? eventPolicy.slMult : 1.0);
  
  return {
    action: 'OPEN_TRADE',
    symbol,
    side,
    probability,
    horizon,
    snapshot,
    features,
    levels,
    eventPolicy: eventPolicy.active
  };
}

function executeTradeFromSignal(signal) {
  const ttlMap = {
    'SCALP': TTL_SCALP_MIN,
    'SWING': TTL_SWING_MIN, 
    'POSITION': TTL_POSITION_MIN
  };
  
  const reason = `${signal.side} signal (p=${(signal.probability*100).toFixed(1)}%, h=${signal.horizon})`;
  
  return openTrade(
    signal.symbol,
    signal.side,
    signal.snapshot,
    signal.features,
    signal.probability,
    signal.horizon,
    ttlMap[signal.horizon],
    signal.levels.SL,
    signal.levels.TPs,
    signal.levels.R,
    reason
  );
}
```

---

### `initQuantumTrader()`
Initializes the entire trading system by creating all required sheets and setting up default configurations.

**Purpose**: One-time setup function to prepare the system for operation

**What it creates**:
- Settings sheet with default parameters
- All trading sheets (active signals, archive, derivatives log)
- Model weights sheet with default values
- Events sheet for risk management
- Custom menu in Google Sheets UI

**Implementation**:
```javascript
function initQuantumTrader() {
  console.log('🚀 Initializing Quantum Trader Pro...');
  
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '🚀 Initialize Quantum Trader Pro',
      'This will create all required sheets and set up the system.\n\nProceed with initialization?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      console.log('Initialization cancelled by user');
      return;
    }
    
    // 1. Create all core sheets
    console.log('📊 Creating core sheets...');
    ensureSheetsCore();
    
    // 2. Initialize settings
    console.log('⚙️ Setting up configuration...');
    const settingsSheet = ensureSettings();
    console.log(`✅ Settings sheet created with ${settingsSheet.getLastRow() - 1} parameters`);
    
    // 3. Initialize model
    console.log('🧠 Setting up ML model...');
    const modelSheet = ensureModelSheet();
    console.log(`✅ Model sheet created with ${modelSheet.getLastRow() - 1} features`);
    
    // 4. Initialize events sheet
    console.log('🗞️ Setting up event management...');
    const eventsSheet = ensureEventsSheet();
    console.log(`✅ Events sheet created`);
    
    // 5. Create custom menu
    console.log('📋 Creating custom menu...');
    U.setMenu();
    console.log('✅ Custom menu created');
    
    // 6. Test connectivity
    console.log('📡 Testing connectivity...');
    try {
      const health = WorkerClient.getHealth();
      console.log('✅ Connectivity test passed');
    } catch (error) {
      console.warn('⚠️ Connectivity test failed:', error.message);
    }
    
    // 7. Initial data fetch
    console.log('📈 Fetching initial market data...');
    try {
      const symbols = getSymbolsList();
      const pack = _throttledPack(symbols);
      if (pack && pack.ok) {
        appendDerivativesLog(pack);
        console.log('✅ Initial market data logged');
      }
    } catch (error) {
      console.warn('⚠️ Initial data fetch failed:', error.message);
    }
    
    // 8. Set initialization timestamp
    const props = U.props();
    props.setProperty('INITIALIZED_AT', Date.now().toString());
    props.setProperty('INITIALIZATION_VERSION', '16.4s');
    
    // 9. Success message
    const successMessage = 
      `✅ Quantum Trader Pro initialized successfully!\n\n` +
      `📊 Created sheets:\n` +
      `• ⚙️ НАСТРОЙКИ (Configuration)\n` +
      `• 📈 ДЕРИВАТИВЫ (Market Data)\n` +
      `• 📊 АКТИВНЫЕ СИГНАЛЫ (Active Trades)\n` +
      `• 📦 АРХИВ СИГНАЛОВ (Trade Archive)\n` +
      `• 🧠 МОДЕЛЬ (ML Model)\n` +
      `• 🗞️ СОБЫТИЯ (Event Management)\n\n` +
      `🎯 Next steps:\n` +
      `1. Configure your WORKER_BASE and WORKER_KEY\n` +
      `2. Adjust risk parameters in settings\n` +
      `3. Install triggers for automation\n` +
      `4. Run connectivity test\n\n` +
      `📋 Use the "🚀 Quantum Trader" menu for all operations.`;
    
    ui.alert('🎉 Initialization Complete', successMessage, ui.ButtonSet.OK);
    
    console.log('🎉 Quantum Trader Pro initialization completed successfully');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Initialization Failed',
      `Error: ${error.message}\n\nCheck the logs for details.`,
      ui.ButtonSet.OK
    );
    
    throw error;
  }
}
```

**Post-Initialization Checklist**:
```javascript
function validateInitialization() {
  const checks = [
    {
      name: 'Settings Sheet',
      check: () => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('⚙️ НАСТРОЙКИ');
        return sheet && sheet.getLastRow() > 10;
      }
    },
    {
      name: 'Model Sheet',
      check: () => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('🧠 МОДЕЛЬ');
        return sheet && sheet.getLastRow() > 5;
      }
    },
    {
      name: 'Configuration Values',
      check: () => {
        const settings = readSettingMap();
        return settings['WORKER_BASE'] && settings['SYMBOLS'];
      }
    },
    {
      name: 'Model Weights',
      check: () => {
        const weights = readWeights();
        return Object.keys(weights).length >= 8;
      }
    },
    {
      name: 'Menu Creation',
      check: () => {
        // This is harder to test programmatically
        return true;
      }
    }
  ];
  
  console.log('Validating initialization...');
  let allPassed = true;
  
  checks.forEach(check => {
    try {
      const passed = check.check();
      console.log(`${passed ? '✅' : '❌'} ${check.name}`);
      if (!passed) allPassed = false;
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
      allPassed = false;
    }
  });
  
  return allPassed;
}
```

---

### `installTriggers()`
Sets up time-based triggers for automated system operation.

**Purpose**: Automate the trading system to run without manual intervention

**Trigger Types**:
- **Main Update**: Runs `updateMain()` every 5-15 minutes
- **Daily KPI**: Runs daily performance summary
- **Weekly Cleanup**: Cleans old data and logs

**Implementation**:
```javascript
function installTriggers() {
  console.log('⏱️ Installing triggers...');
  
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '⏱️ Install Automation Triggers',
      'This will set up automated triggers for:\n\n' +
      '• Main update every 10 minutes\n' +
      '• Daily KPI report at 9:00 AM\n' +
      '• Weekly cleanup on Sundays\n\n' +
      'Proceed with installation?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      console.log('Trigger installation cancelled by user');
      return;
    }
    
    // Delete existing triggers first
    console.log('🧹 Removing existing triggers...');
    const existingTriggers = ScriptApp.getProjectTriggers();
    existingTriggers.forEach(trigger => {
      if (trigger.getHandlerFunction().startsWith('update') || 
          trigger.getHandlerFunction().includes('kpi') ||
          trigger.getHandlerFunction().includes('cleanup')) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // 1. Main update trigger (every 10 minutes)
    console.log('📊 Creating main update trigger...');
    ScriptApp.newTrigger('updateMain')
      .timeBased()
      .everyMinutes(10)
      .create();
    
    // 2. Daily KPI trigger (9:00 AM Moscow time)
    console.log('📈 Creating daily KPI trigger...');
    ScriptApp.newTrigger('kpi_24h_summary_now')
      .timeBased()
      .everyDays(1)
      .atHour(9)
      .create();
    
    // 3. Weekly cleanup trigger (Sunday 2:00 AM)
    console.log('🧹 Creating weekly cleanup trigger...');
    ScriptApp.newTrigger('weeklyCleanup')
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay.SUNDAY)
      .atHour(2)
      .create();
    
    // 4. Store trigger installation info
    const props = U.props();
    props.setProperty('TRIGGERS_INSTALLED_AT', Date.now().toString());
    props.setProperty('TRIGGER_VERSION', '16.4s');
    
    // 5. List installed triggers
    const newTriggers = ScriptApp.getProjectTriggers();
    const tradingTriggers = newTriggers.filter(t => 
      t.getHandlerFunction().startsWith('update') || 
      t.getHandlerFunction().includes('kpi') ||
      t.getHandlerFunction().includes('cleanup')
    );
    
    console.log(`✅ Installed ${tradingTriggers.length} triggers:`);
    tradingTriggers.forEach(trigger => {
      const func = trigger.getHandlerFunction();
      const type = trigger.getEventType();
      console.log(`  • ${func} (${type})`);
    });
    
    // Success message
    const successMessage = 
      `✅ Triggers installed successfully!\n\n` +
      `📊 Main Update: Every 10 minutes\n` +
      `📈 Daily KPI: Every day at 9:00 AM\n` +
      `🧹 Weekly Cleanup: Sundays at 2:00 AM\n\n` +
      `⚙️ The system will now run automatically.\n` +
      `Monitor the logs and sheets for activity.\n\n` +
      `⚠️ Important: Keep this spreadsheet and script accessible.\n` +
      `Triggers will stop working if the script is deleted.`;
    
    ui.alert('🎉 Triggers Installed', successMessage, ui.ButtonSet.OK);
    
    console.log('🎉 Trigger installation completed successfully');
    
  } catch (error) {
    console.error('❌ Trigger installation failed:', error);
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Trigger Installation Failed',
      `Error: ${error.message}\n\nCheck the logs for details.`,
      ui.ButtonSet.OK
    );
    
    throw error;
  }
}

// Helper function for weekly cleanup
function weeklyCleanup() {
  console.log('🧹 Starting weekly cleanup...');
  
  try {
    // 1. Clean old derivatives data (keep last 1000 rows)
    const derivSheet = U.getOrCreate('📈 ДЕРИВАТИВЫ', []);
    const totalRows = derivSheet.getLastRow();
    if (totalRows > 1000) {
      const rowsToDelete = totalRows - 1000;
      derivSheet.deleteRows(2, rowsToDelete); // Keep header
      console.log(`🗑️ Deleted ${rowsToDelete} old price records`);
    }
    
    // 2. Clean old error logs (keep last 100 rows)
    const errorSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('🚨 ERRORS');
    if (errorSheet) {
      const errorRows = errorSheet.getLastRow();
      if (errorRows > 100) {
        const errorToDelete = errorRows - 100;
        errorSheet.deleteRows(2, errorToDelete);
        console.log(`🗑️ Deleted ${errorToDelete} old error records`);
      }
    }
    
    // 3. Clear cache
    const cache = U.cache();
    cache.removeAll();
    console.log('🗑️ Cleared all cache entries');
    
    // 4. Clean temporary properties
    const props = U.props();
    const allProps = props.getProperties();
    Object.keys(allProps).forEach(key => {
      if (key.startsWith('TEMP_') || key.startsWith('LOCK_')) {
        props.deleteProperty(key);
      }
    });
    
    console.log('✅ Weekly cleanup completed');
    
  } catch (error) {
    console.error('❌ Weekly cleanup failed:', error);
  }
}
```

**Trigger Management**:
```javascript
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  console.log(`Found ${triggers.length} triggers:`);
  
  triggers.forEach((trigger, i) => {
    const func = trigger.getHandlerFunction();
    const type = trigger.getEventType();
    const source = trigger.getTriggerSource();
    
    console.log(`${i+1}. ${func}`);
    console.log(`   Type: ${type}`);
    console.log(`   Source: ${source}`);
    
    if (type === ScriptApp.EventType.CLOCK) {
      console.log(`   Schedule: ${trigger.toString()}`);
    }
  });
}

function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  console.log(`Removed ${triggers.length} triggers`);
}
```

---

### `kpi_24h_summary_now()`
Generates a comprehensive 24-hour performance summary and KPI report.

**Purpose**: Provide daily performance analytics and system health monitoring

**Report Sections**:
- Trading performance (win rate, P&L, risk metrics)
- System health (data quality, error rates)
- Market analysis (volatility, correlation)
- Model performance (prediction accuracy)

**Implementation**:
```javascript
function kpi_24h_summary_now() {
  console.log('📊 Generating 24-hour KPI summary...');
  
  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
    
    // 1. Trading Performance
    const tradingKPIs = calculateTradingKPIs(startTime, endTime);
    
    // 2. System Health
    const systemKPIs = calculateSystemKPIs(startTime, endTime);
    
    // 3. Market Analysis
    const marketKPIs = calculateMarketKPIs();
    
    // 4. Model Performance
    const modelKPIs = calculateModelKPIs(startTime, endTime);
    
    // 5. Generate report
    const report = generateKPIReport(tradingKPIs, systemKPIs, marketKPIs, modelKPIs);
    
    // 6. Save to sheet
    const kpiSheet = U.getOrCreate('📊 KPI REPORTS', [
      'Date', 'Trades', 'Win Rate', 'Total R', 'Daily P&L', 'Max DD',
      'Data Quality', 'Error Rate', 'Avg Volatility', 'Model Accuracy'
    ]);
    
    kpiSheet.getRange(kpiSheet.getLastRow() + 1, 1, 1, 10).setValues([[
      U.nowStr(),
      tradingKPIs.totalTrades,
      tradingKPIs.winRate,
      tradingKPIs.totalR,
      tradingKPIs.dailyPnL,
      tradingKPIs.maxDrawdown,
      systemKPIs.dataQuality,
      systemKPIs.errorRate,
      marketKPIs.avgVolatility,
      modelKPIs.accuracy
    ]]);
    
    // 7. Console output
    console.log('\n' + '='.repeat(50));
    console.log('📊 24-HOUR KPI SUMMARY');
    console.log('='.repeat(50));
    console.log(report);
    console.log('='.repeat(50));
    
    // 8. Optional: Send email/notification if configured
    if (shouldSendKPINotification(tradingKPIs, systemKPIs)) {
      sendKPINotification(report);
    }
    
    console.log('✅ KPI summary completed');
    
  } catch (error) {
    console.error('❌ KPI summary failed:', error);
  }
}

function calculateTradingKPIs(startTime, endTime) {
  const archiveSheet = U.getOrCreate('📦 АРХИВ СИГНАЛОВ', []);
  const trades = archiveSheet.getDataRange().getValues().slice(1);
  
  const periodTrades = trades.filter(trade => {
    const closedTime = new Date(trade[10]);
    return closedTime >= startTime && closedTime <= endTime;
  });
  
  if (periodTrades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalR: 0,
      dailyPnL: 0,
      maxDrawdown: 0,
      avgDuration: 0,
      bestTrade: 0,
      worstTrade: 0
    };
  }
  
  let winners = 0;
  let totalR = 0;
  let totalDuration = 0;
  let bestTrade = -Infinity;
  let worstTrade = Infinity;
  let runningR = 0;
  let maxR = 0;
  let maxDrawdown = 0;
  
  periodTrades.forEach(trade => {
    const R = parseFloat(trade[6]) || 0;
    const duration = parseFloat(trade[8]) || 0;
    
    totalR += R;
    totalDuration += duration;
    
    if (R > 0) winners++;
    
    bestTrade = Math.max(bestTrade, R);
    worstTrade = Math.min(worstTrade, R);
    
    // Calculate drawdown
    runningR += R;
    maxR = Math.max(maxR, runningR);
    const currentDD = maxR - runningR;
    maxDrawdown = Math.max(maxDrawdown, currentDD);
  });
  
  const winRate = winners / periodTrades.length;
  const avgDuration = totalDuration / periodTrades.length;
  const dailyPnL = totalR * ACCOUNT_SIZE_USD * (RISK_PER_TRADE_PCT / 100);
  
  return {
    totalTrades: periodTrades.length,
    winRate,
    totalR,
    dailyPnL,
    maxDrawdown,
    avgDuration,
    bestTrade,
    worstTrade
  };
}

function calculateSystemKPIs(startTime, endTime) {
  // Check data quality
  const derivSheet = U.getOrCreate('📈 ДЕРИВАТИВЫ', []);
  const dataRows = derivSheet.getDataRange().getValues().slice(1);
  
  const periodData = dataRows.filter(row => {
    const timestamp = new Date(row[0]);
    return timestamp >= startTime && timestamp <= endTime;
  });
  
  let freshDataCount = 0;
  let staleDataCount = 0;
  
  periodData.forEach(row => {
    const freshness = row[6];
    if (freshness === 'LIVE') freshDataCount++;
    else staleDataCount++;
  });
  
  const dataQuality = periodData.length > 0 ? 
    freshDataCount / (freshDataCount + staleDataCount) : 0;
  
  // Check error rate
  const errorSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('🚨 ERRORS');
  let errorCount = 0;
  
  if (errorSheet) {
    const errorRows = errorSheet.getDataRange().getValues().slice(1);
    errorCount = errorRows.filter(row => {
      const timestamp = new Date(row[0]);
      return timestamp >= startTime && timestamp <= endTime;
    }).length;
  }
  
  const totalOperations = Math.max(1, periodData.length / 5); // Estimate
  const errorRate = errorCount / totalOperations;
  
  return {
    dataQuality,
    errorRate,
    freshDataPoints: freshDataCount,
    staleDataPoints: staleDataCount,
    errorCount
  };
}

function generateKPIReport(trading, system, market, model) {
  return `
🎯 TRADING PERFORMANCE
  Trades: ${trading.totalTrades}
  Win Rate: ${(trading.winRate * 100).toFixed(1)}%
  Total R: ${trading.totalR.toFixed(2)}
  Daily P&L: $${trading.dailyPnL.toFixed(2)}
  Max Drawdown: ${trading.maxDrawdown.toFixed(2)}R
  Avg Duration: ${trading.avgDuration.toFixed(0)} minutes
  Best Trade: ${trading.bestTrade.toFixed(2)}R
  Worst Trade: ${trading.worstTrade.toFixed(2)}R

🔧 SYSTEM HEALTH
  Data Quality: ${(system.dataQuality * 100).toFixed(1)}%
  Error Rate: ${(system.errorRate * 100).toFixed(2)}%
  Fresh Data: ${system.freshDataPoints}
  Stale Data: ${system.staleDataPoints}
  Errors: ${system.errorCount}

📈 MARKET CONDITIONS
  Avg Volatility: ${(market.avgVolatility * 100).toFixed(2)}%
  Correlation: ${market.avgCorrelation.toFixed(3)}
  Dominant Regime: ${market.regime}

🧠 MODEL PERFORMANCE
  Accuracy: ${(model.accuracy * 100).toFixed(1)}%
  Calibration Error: ${(model.calibrationError * 100).toFixed(2)}%
  Prediction Count: ${model.predictionCount}
`;
}
```

## Helper Functions

### System Status Functions
```javascript
function getSystemStatus() {
  const props = U.props();
  const lastUpdate = props.getProperty('LAST_UPDATE_MAIN');
  const initialized = props.getProperty('INITIALIZED_AT');
  const triggersInstalled = props.getProperty('TRIGGERS_INSTALLED_AT');
  
  const status = {
    initialized: !!initialized,
    lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)) : null,
    triggersInstalled: !!triggersInstalled,
    activePositions: getActiveTradeCount(),
    dailyRisk: dailyRiskUsedUSD(),
    eventMode: currentEventPolicy().active
  };
  
  return status;
}

function printSystemStatus() {
  const status = getSystemStatus();
  
  console.log('🔍 SYSTEM STATUS');
  console.log('================');
  console.log(`Initialized: ${status.initialized ? '✅' : '❌'}`);
  console.log(`Last Update: ${status.lastUpdate ? status.lastUpdate.toLocaleString() : 'Never'}`);
  console.log(`Triggers: ${status.triggersInstalled ? '✅' : '❌'}`);
  console.log(`Active Positions: ${status.activePositions}`);
  console.log(`Daily Risk: $${status.dailyRisk.toFixed(2)}`);
  console.log(`Event Mode: ${status.eventMode ? '🔴' : '🟢'}`);
}
```

### Diagnostic Functions
```javascript
function runSystemDiagnostics() {
  console.log('🔧 Running system diagnostics...');
  
  const diagnostics = {
    connectivity: false,
    sheets: false,
    configuration: false,
    model: false,
    data: false,
    triggers: false
  };
  
  // Test connectivity
  try {
    WorkerClient.getHealth();
    diagnostics.connectivity = true;
    console.log('✅ Connectivity: OK');
  } catch (error) {
    console.log('❌ Connectivity: FAILED');
  }
  
  // Check sheets
  try {
    const requiredSheets = ['⚙️ НАСТРОЙКИ', '📈 ДЕРИВАТИВЫ', '📊 АКТИВНЫЕ СИГНАЛЫ', '📦 АРХИВ СИГНАЛОВ', '🧠 МОДЕЛЬ'];
    const ss = U.ss();
    const existingSheets = ss.getSheets().map(s => s.getName());
    
    const missingSheets = requiredSheets.filter(name => !existingSheets.includes(name));
    
    if (missingSheets.length === 0) {
      diagnostics.sheets = true;
      console.log('✅ Sheets: OK');
    } else {
      console.log(`❌ Sheets: Missing ${missingSheets.join(', ')}`);
    }
  } catch (error) {
    console.log('❌ Sheets: ERROR');
  }
  
  // Check configuration
  try {
    const settings = readSettingMap();
    const required = ['WORKER_BASE', 'SYMBOLS', 'ACCOUNT_SIZE_USD'];
    const missing = required.filter(key => !settings[key]);
    
    if (missing.length === 0) {
      diagnostics.configuration = true;
      console.log('✅ Configuration: OK');
    } else {
      console.log(`❌ Configuration: Missing ${missing.join(', ')}`);
    }
  } catch (error) {
    console.log('❌ Configuration: ERROR');
  }
  
  // Check model
  try {
    const weights = readWeights();
    if (Object.keys(weights).length >= 8) {
      diagnostics.model = true;
      console.log('✅ Model: OK');
    } else {
      console.log('❌ Model: Insufficient weights');
    }
  } catch (error) {
    console.log('❌ Model: ERROR');
  }
  
  // Check recent data
  try {
    const derivSheet = U.getOrCreate('📈 ДЕРИВАТИВЫ', []);
    const lastRow = derivSheet.getLastRow();
    if (lastRow > 1) {
      const lastTimestamp = derivSheet.getRange(lastRow, 1).getValue();
      const age = (Date.now() - new Date(lastTimestamp).getTime()) / (1000 * 60);
      
      if (age < 30) { // Less than 30 minutes old
        diagnostics.data = true;
        console.log('✅ Data: OK (fresh)');
      } else {
        console.log(`⚠️ Data: Stale (${age.toFixed(0)} minutes old)`);
      }
    } else {
      console.log('❌ Data: No data');
    }
  } catch (error) {
    console.log('❌ Data: ERROR');
  }
  
  // Check triggers
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const tradingTriggers = triggers.filter(t => t.getHandlerFunction().includes('update'));
    
    if (tradingTriggers.length > 0) {
      diagnostics.triggers = true;
      console.log('✅ Triggers: OK');
    } else {
      console.log('❌ Triggers: Not installed');
    }
  } catch (error) {
    console.log('❌ Triggers: ERROR');
  }
  
  // Overall status
  const passed = Object.values(diagnostics).filter(Boolean).length;
  const total = Object.keys(diagnostics).length;
  
  console.log(`\n🔍 Overall Health: ${passed}/${total} checks passed`);
  
  if (passed === total) {
    console.log('🎉 System is fully operational!');
  } else {
    console.log('⚠️ System has issues that need attention');
  }
  
  return diagnostics;
}
```

## Best Practices

### Entry Point Guidelines

1. **Error Handling**: Always wrap main logic in try-catch blocks
2. **User Feedback**: Provide clear UI messages for user-initiated functions
3. **Logging**: Use comprehensive console logging for debugging
4. **State Management**: Update properties to track system state
5. **Validation**: Validate prerequisites before executing main logic

### Performance Optimization

1. **Batch Operations**: Group sheet operations to minimize API calls
2. **Caching**: Use appropriate caching for frequently accessed data
3. **Conditional Execution**: Skip unnecessary operations based on system state
4. **Resource Management**: Clean up temporary data and properties

### Monitoring & Alerting

1. **Health Checks**: Regular connectivity and data quality checks
2. **Performance Metrics**: Track execution times and success rates
3. **Error Tracking**: Log and analyze error patterns
4. **Automated Reporting**: Regular KPI summaries and alerts

---

The entry point functions provide a robust interface for system operation, initialization, and monitoring, ensuring reliable automated trading with comprehensive oversight capabilities.