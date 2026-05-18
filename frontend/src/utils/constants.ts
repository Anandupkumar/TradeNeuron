export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY ?? '';
export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'TradeNeuron';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '1.0.0';
export const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';

export const FEATURES = {
  shortSignals: import.meta.env.VITE_ENABLE_SHORT_SIGNALS === 'true',
  paperTrading: import.meta.env.VITE_ENABLE_PAPER_TRADING === 'true',
  backtest: import.meta.env.VITE_ENABLE_BACKTEST === 'true',
  reports: import.meta.env.VITE_ENABLE_REPORTS === 'true',
};

export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
};

export const ERROR_MESSAGES: Record<string, string> = {
  Unauthorized: 'Your API key is invalid or has been rotated. Please re-enter it.',
  'Failed to fetch': 'Could not reach the server. Check your connection.',
  'Network Error': 'Could not reach the server. Check your connection.',
  'Request failed with status code 404': 'The requested resource was not found.',
  'Request failed with status code 500': 'Server error. Try again later.',
};

export function friendlyError(raw: string): string {
  return ERROR_MESSAGES[raw] ?? raw;
}
