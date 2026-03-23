const SCORING_WEIGHTS = {
  TREND: 30,
  RSI_PULLBACK: 20,
  VOLUME_SPIKE: 30,
  BREAKOUT: 20,
};

// NSE holiday calendars keyed by year.
// Must be updated every December for the next year.
const NSE_HOLIDAYS = {
  2024: [
    '2024-01-26', '2024-03-08', '2024-03-25', '2024-03-29',
    '2024-04-11', '2024-04-14', '2024-04-17', '2024-04-21',
    '2024-05-01', '2024-05-23', '2024-06-17', '2024-07-17',
    '2024-08-15', '2024-09-16', '2024-10-01', '2024-10-02',
    '2024-11-01', '2024-11-15', '2024-12-25',
  ],
  2025: [
    '2025-02-26', '2025-03-14', '2025-03-31', '2025-04-10',
    '2025-04-14', '2025-04-18', '2025-05-01', '2025-05-12',
    '2025-06-06', '2025-07-06', '2025-08-15', '2025-08-16',
    '2025-08-27', '2025-10-01', '2025-10-02', '2025-10-20',
    '2025-10-21', '2025-11-05', '2025-12-25',
  ],
  2026: [
    '2026-01-26', '2026-03-10', '2026-03-17', '2026-03-30',
    '2026-04-02', '2026-04-03', '2026-04-14', '2026-05-01',
    '2026-06-05', '2026-07-06', '2026-08-15', '2026-08-16',
    '2026-09-04', '2026-10-02', '2026-10-20', '2026-10-21',
    '2026-11-04', '2026-12-25',
  ],
};

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

const NEGATION_WORDS = [
  'clears', 'cleared', 'acquitted', 'not guilty',
  'no evidence', 'dismissed', 'drops', 'resolved',
  'overturned', 'exonerated', 'withdrawn',
];

module.exports = {
  SCORING_WEIGHTS,
  NSE_HOLIDAYS,
  NEGATIVE_KEYWORDS,
  NEGATION_WORDS,
  RSI_ZONES,
};
