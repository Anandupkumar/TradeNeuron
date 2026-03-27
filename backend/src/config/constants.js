const SCORING_WEIGHTS = {
  TREND: 30,
  RSI_PULLBACK: 20,
  BREAKOUT: 20,
};

const SHORT_SCORING_WEIGHTS = {
  TREND: 30,
  RSI_OVERBOUGHT: 20,
  BREAKDOWN: 20,
};

const VOLUME_TIER_SCORES = {
  extreme: 30,
  high: 20,
  elevated: 10,
  normal: 0,
};

const NSE_HOLIDAYS = require('./nse_holidays.json');

const NEGATIVE_KEYWORDS = [
  'fraud', 'scam', 'probe', 'arrested', 'sebi notice', 'sebi order',
  'default', 'bankruptcy', 'penalty', 'downgrade', 'rating downgrade',
  'loss widens', 'profit warning', 'earnings miss', 'revenue miss',
  'promoter selling', 'insider selling', 'pledge', 'debt default',
  'investigation', 'raid', 'suspension', 'delisting',
];

const RSI_ZONES = {
  OVERSOLD: { min: 0, max: 30 },
  PULLBACK: { min: 30, max: 45 },
  NEUTRAL: { min: 45, max: 65 },
  OVERBOUGHT: { min: 65, max: 100 },
};

const SOFT_FILTER = {
  BREAKOUT_CLOSE_POSITION_HARD: 0.6,
  BREAKOUT_CLOSE_POSITION_SOFT: 0.75,
  BREAKOUT_SOFT_PENALTY: 10,
  TREND_SLOPE_PENALTY: 15,
  BREAKDOWN_CLOSE_POSITION_THRESHOLD: 0.4,
};

const NEGATION_WORDS = [
  'clears', 'cleared', 'acquitted', 'not guilty',
  'no evidence', 'dismissed', 'drops', 'resolved',
  'overturned', 'exonerated', 'withdrawn',
];

module.exports = {
  SCORING_WEIGHTS,
  SHORT_SCORING_WEIGHTS,
  VOLUME_TIER_SCORES,
  SOFT_FILTER,
  NSE_HOLIDAYS,
  NEGATIVE_KEYWORDS,
  NEGATION_WORDS,
  RSI_ZONES,
};
