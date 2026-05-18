import { FEATURES } from './constants';

export const featureFlags = {
  canAccessPaperTrading: () => FEATURES.paperTrading,
  canAccessBacktest: () => FEATURES.backtest,
  canAccessReports: () => FEATURES.reports,

  showShortDirection: () => FEATURES.shortSignals,
  showDirectionFilter: () => FEATURES.shortSignals,
  showBearishRegime: () => FEATURES.shortSignals,

  includeShortSignals: () => FEATURES.shortSignals,
} as const;
