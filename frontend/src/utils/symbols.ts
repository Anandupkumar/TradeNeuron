export const NIFTY_50_SYMBOLS = [
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
] as const;

export type NiftySymbol = (typeof NIFTY_50_SYMBOLS)[number];

export const SECTOR_MAP: Record<NiftySymbol, string> = {
  'ADANIENT.NS': 'Conglomerate',
  'ADANIPORTS.NS': 'Infrastructure',
  'APOLLOHOSP.NS': 'Healthcare',
  'ASIANPAINT.NS': 'Consumer Goods',
  'AXISBANK.NS': 'Banking',
  'BAJAJ-AUTO.NS': 'Automobile',
  'BAJAJFINSV.NS': 'Financial Services',
  'BAJFINANCE.NS': 'Financial Services',
  'BHARTIARTL.NS': 'Telecom',
  'BPCL.NS': 'Oil & Gas',
  'BRITANNIA.NS': 'FMCG',
  'CIPLA.NS': 'Pharma',
  'COALINDIA.NS': 'Mining',
  'DIVISLAB.NS': 'Pharma',
  'DRREDDY.NS': 'Pharma',
  'EICHERMOT.NS': 'Automobile',
  'GRASIM.NS': 'Cement & Materials',
  'HCLTECH.NS': 'IT',
  'HDFCBANK.NS': 'Banking',
  'HDFCLIFE.NS': 'Insurance',
  'HEROMOTOCO.NS': 'Automobile',
  'HINDALCO.NS': 'Metals',
  'HINDUNILVR.NS': 'FMCG',
  'ICICIBANK.NS': 'Banking',
  'INDUSINDBK.NS': 'Banking',
  'INFY.NS': 'IT',
  'ITC.NS': 'FMCG',
  'JSWSTEEL.NS': 'Metals',
  'KOTAKBANK.NS': 'Banking',
  'LT.NS': 'Infrastructure',
  'LTIM.NS': 'IT',
  'M&M.NS': 'Automobile',
  'MARUTI.NS': 'Automobile',
  'NESTLEIND.NS': 'FMCG',
  'NTPC.NS': 'Power',
  'ONGC.NS': 'Oil & Gas',
  'POWERGRID.NS': 'Power',
  'RELIANCE.NS': 'Conglomerate',
  'SBILIFE.NS': 'Insurance',
  'SBIN.NS': 'Banking',
  'SHRIRAMFIN.NS': 'Financial Services',
  'SUNPHARMA.NS': 'Pharma',
  'TATACONSUM.NS': 'FMCG',
  'TATAMOTORS.NS': 'Automobile',
  'TATASTEEL.NS': 'Metals',
  'TCS.NS': 'IT',
  'TECHM.NS': 'IT',
  'TITAN.NS': 'Consumer Goods',
  'TRENT.NS': 'Retail',
  'ULTRACEMCO.NS': 'Cement & Materials',
};

export function getSector(symbol: string): string {
  return SECTOR_MAP[symbol as NiftySymbol] ?? 'Unknown';
}

export const encodeSymbol = (s: string) => encodeURIComponent(s);
export const decodeSymbol = (s: string) => decodeURIComponent(s);
