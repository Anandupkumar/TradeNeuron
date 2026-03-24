const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const { logger } = require('../../middlewares/logger.middleware');

const NSE_BASE = 'https://www.nseindia.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
};

async function fetchOptionChain(symbol = 'NIFTY') {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar, withCredentials: true, timeout: 15000 }));

  await client.get(NSE_BASE, { headers: HEADERS });
  await new Promise((r) => setTimeout(r, 1000));

  const url = `${NSE_BASE}/api/option-chain-indices?symbol=${symbol}`;
  const response = await client.get(url, {
    headers: { ...HEADERS, Referer: `${NSE_BASE}/option-chain` },
  });

  return response.data;
}

function computePCR(option_chain_data) {
  if (!option_chain_data || !option_chain_data.records || !option_chain_data.records.data) {
    return null;
  }

  let total_put_oi = 0;
  let total_call_oi = 0;

  for (const row of option_chain_data.records.data) {
    if (row.PE && row.PE.openInterest) total_put_oi += row.PE.openInterest;
    if (row.CE && row.CE.openInterest) total_call_oi += row.CE.openInterest;
  }

  if (total_call_oi === 0) return null;
  return total_put_oi / total_call_oi;
}

async function fetchPCR(symbol = 'NIFTY') {
  try {
    const chain = await fetchOptionChain(symbol);
    const pcr = computePCR(chain);
    logger.info(`PCR for ${symbol}: ${pcr != null ? pcr.toFixed(3) : 'N/A'}`);
    return pcr;
  } catch (error) {
    logger.warn(`PCR fetch failed for ${symbol}: ${error.message}`);
    return null;
  }
}

module.exports = { fetchOptionChain, computePCR, fetchPCR };
