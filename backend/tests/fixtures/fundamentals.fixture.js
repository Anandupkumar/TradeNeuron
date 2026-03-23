const healthy_fundamental = {
  symbol: 'RELIANCE.NS',
  fetched_date: '2026-03-20',
  debt_to_equity: 0.85,
  eps_growth_yoy: 0.12,
  revenue_growth: 0.08,
  promoter_pledge: 10,
  is_healthy: true,
};

const unhealthy_fundamental = {
  symbol: 'TATASTEEL.NS',
  fetched_date: '2026-03-20',
  debt_to_equity: 3.5,
  eps_growth_yoy: -0.15,
  revenue_growth: -0.08,
  promoter_pledge: 55,
  is_healthy: false,
};

const yahoo_summary_response = {
  financialData: {
    debtToEquity: 0.85,
    revenueGrowth: 0.08,
  },
  defaultKeyStatistics: {
    earningsQuarterlyGrowth: 0.12,
  },
  majorHoldersBreakdown: {
    insidersPercentHeld: 0.1,
  },
};

module.exports = {
  healthy_fundamental,
  unhealthy_fundamental,
  yahoo_summary_response,
};
