export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // API key check
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== 'MySuperSecretKey123!@#') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      switch (path) {
        case '/health':
          return await handleHealth();
        case '/pack':
          return await handlePack(url);
        case '/mux':
          return await handleMux(url);
        default:
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleHealth() {
  return new Response(JSON.stringify({
    ok: true,
    timestamp: new Date().toISOString(),
    worker: 'Quantum Trader Pro',
    version: '16.4s'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handlePack(url) {
  const symbols = url.searchParams.get('symbols')?.split(',') || ['BTC','ETH','SOL'];
  const result = { ok: true, data: {} };
  
  for (const symbol of symbols) {
    const sym = symbol.trim().toUpperCase();
    if (!sym) continue;
    
    try {
      const response = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}USDT`);
      if (response.ok) {
        const data = await response.json();
        result.data[sym] = {
          price: parseFloat(data.price),
          source: 'Binance',
          timestampUtc: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error(`Error processing ${sym}:`, error);
    }
  }
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleMux(url) {
  const symbol = url.searchParams.get('symbol')?.toUpperCase();
  const exchange = url.searchParams.get('exchange')?.toLowerCase();
  const type = url.searchParams.get('type');
  
  if (!symbol || !exchange || !type) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    let data = null;
    
    switch (type) {
      case 'book':
        if (exchange === 'binance') {
          const response = await fetch(`https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}USDT&limit=20`);
          if (response.ok) {
            data = await response.json();
          }
        }
        break;
        
      case 'trades':
        if (exchange === 'binance') {
          const limit = url.searchParams.get('limit') || '120';
          const response = await fetch(`https://fapi.binance.com/fapi/v1/aggTrades?symbol=${symbol}USDT&limit=${limit}`);
          if (response.ok) {
            data = await response.json();
          }
        }
        break;
        
      case 'funding':
        if (exchange === 'binance') {
          const response = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}USDT&limit=1`);
          if (response.ok) {
            data = await response.json();
          }
        }
        break;
        
      case 'oi':
        if (exchange === 'binance') {
          const response = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}USDT`);
          if (response.ok) {
            data = await response.json();
          }
        }
        break;
        
      case 'ohlc':
        if (exchange === 'binance') {
          const interval = url.searchParams.get('interval') || '1m';
          const limit = url.searchParams.get('limit') || '100';
          const response = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`);
          if (response.ok) {
            data = await response.json();
          }
        }
        break;
        
      default:
        return new Response(JSON.stringify({ error: 'Invalid type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (data) {
      return new Response(JSON.stringify({ ok: true, data }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'No data available' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}