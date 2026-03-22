const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

const symbols = [
  'ADANIENT.NS', 'ADANIPORTS.NS', 'APOLLOHOSP.NS', 'ASIANPAINT.NS', 'AXISBANK.NS',
  'BAJAJ-AUTO.NS', 'BAJAJFINSV.NS', 'BAJFINANCE.NS', 'BHARTIARTL.NS', 'BPCL.NS',
  'BRITANNIA.NS', 'CIPLA.NS', 'COALINDIA.NS', 'DIVISLAB.NS', 'DRREDDY.NS',
  'EICHERMOT.NS', 'GRASIM.NS', 'HCLTECH.NS', 'HDFCBANK.NS', 'HDFCLIFE.NS',
  'HEROMOTOCO.NS', 'HINDALCO.NS', 'HINDUNILVR.NS', 'ICICIBANK.NS', 'INDUSINDBK.NS',
  'INFY.NS', 'ITC.NS', 'JSWSTEEL.NS', 'KOTAKBANK.NS', 'LT.NS',
  'LTIM.NS', 'M&M.NS', 'MARUTI.NS', 'NESTLEIND.NS', 'NTPC.NS',
  'ONGC.NS', 'POWERGRID.NS', 'RELIANCE.NS', 'SBILIFE.NS', 'SBIN.NS',
  'SHRIRAMFIN.NS', 'SUNPHARMA.NS', 'TATACONSUM.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS',
  'TCS.NS', 'TECHM.NS', 'TITAN.NS', 'TRENT.NS', 'ULTRACEMCO.NS',
  '^NSEI' // NIFTY index
];

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log(`Starting OHLCV data fetch for ${symbols.length} symbols...`);

  // Date range: last 6 months
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 3);
  
  const queryOptions = {
    period1: startDate,
    period2: endDate,
    interval: '1d'
  };

  const results = {
    succeeded: 0,
    failedOrIncomplete: 0,
    problematicSymbols: []
  };

  for (const symbol of symbols) {
    try {
      console.log(`\nFetching ${symbol}...`);
      const data = await yahooFinance.historical(symbol, queryOptions);
      
      if (!data || data.length === 0) {
        console.log(`  -> ❌ No data returned.`);
        results.failedOrIncomplete++;
        results.problematicSymbols.push({ symbol, reason: 'No data returned' });
      } else {
        const totalCandles = data.length;
        const first = data[0].date;
        const last = data[data.length - 1].date;
        
        let missingOrNull = 0;
        for (const candle of data) {
          if (
            candle.open == null || 
            candle.high == null || 
            candle.low == null || 
            candle.close == null || 
            candle.volume == null
          ) {
            missingOrNull++;
          }
        }
        
        console.log(`  -> Total candles: ${totalCandles}`);
        console.log(`  -> First candle: ${first ? new Date(first).toISOString().split('T')[0] : 'N/A'}`);
        console.log(`  -> Last candle: ${last ? new Date(last).toISOString().split('T')[0] : 'N/A'}`);
        console.log(`  -> Missing/Null OHLCV values: ${missingOrNull}`);
        
        if (missingOrNull > 0) {
          console.log(`  -> ⚠️  Incomplete data found.`);
          results.failedOrIncomplete++;
          results.problematicSymbols.push({ symbol, reason: `Has ${missingOrNull} missing/null OHLCV values` });
        } else {
          console.log(`  -> ✅  Success!`);
          results.succeeded++;
        }
      }
    } catch (err) {
      console.log(`  -> 💥 Error: ${err.message}`);
      results.failedOrIncomplete++;
      results.problematicSymbols.push({ symbol, reason: `Error: ${err.message}` });
    }
    
    // Throttling to avoid rate limit
    await delay(300);
  }
  
  console.log('\n========================================');
  console.log('                 SUMMARY                ');
  console.log('========================================');
  console.log(`Total symbols processed: ${symbols.length}`);
  console.log(`Success (complete data): ${results.succeeded}`);
  console.log(`Failed / Incomplete data: ${results.failedOrIncomplete}`);
  
  if (results.problematicSymbols.length > 0) {
    console.log('\nProblematic Symbols:');
    results.problematicSymbols.forEach(p => {
      console.log(` - ${p.symbol}: ${p.reason}`);
    });
  } else {
    console.log('\nNo problematic symbols found. All OK!');
  }
}

run();
