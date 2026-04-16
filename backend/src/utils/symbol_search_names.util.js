/**
 * Optional Google News RSS search names (full company names) for ambiguous tickers.
 * Falls back to stripped symbol when not listed.
 */
const SYMBOL_SEARCH_NAMES = {
  'TCS.NS': 'Tata Consultancy Services',
  'M&M.NS': 'Mahindra & Mahindra',
  'BHARTIARTL.NS': 'Bharti Airtel',
  'HDFCBANK.NS': 'HDFC Bank',
  'ICICIBANK.NS': 'ICICI Bank',
  'SBIN.NS': 'State Bank of India',
  'RELIANCE.NS': 'Reliance Industries',
  'INFY.NS': 'Infosys',
  'LT.NS': 'Larsen and Toubro',
  'ITC.NS': 'ITC Limited',
};

function getNewsSearchQuery(symbol) {
  const name = SYMBOL_SEARCH_NAMES[symbol];
  if (name) return name;
  return symbol.replace(/\.NS$/i, '');
}

module.exports = { SYMBOL_SEARCH_NAMES, getNewsSearchQuery };
