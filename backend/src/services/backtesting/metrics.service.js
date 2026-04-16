const { roundDecimal } = require('../../utils/math.util');

function calculateMetrics(trades) {
  const total_signals = trades.length;
  const wins = trades.filter((t) => t.result === 'WIN').length;
  const losses = trades.filter((t) => t.result === 'LOSS').length;
  const neutral = trades.filter((t) => t.result === 'NEUTRAL').length;

  const win_rate_pct = total_signals > 0 ? roundDecimal((wins / total_signals) * 100, 2) : 0;

  const returns = trades.map((t) => t.net_return);
  const avg_return_pct = returns.length > 0
    ? roundDecimal(returns.reduce((s, r) => s + r, 0) / returns.length, 4)
    : 0;
  const expectancy_pct = avg_return_pct;

  const max_drawdown_pct = calculateMaxDrawdown(returns);

  const sharpe_ratio = calculateSharpeRatio(returns);

  const winning_sum = returns.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const losing_sum = Math.abs(returns.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const profit_factor = losing_sum > 0 ? roundDecimal(winning_sum / losing_sum, 4) : null;

  const holding_days = trades.map((t) => t.days);
  const avg_holding_days = holding_days.length > 0
    ? roundDecimal(holding_days.reduce((s, d) => s + d, 0) / holding_days.length, 2)
    : null;

  const avg_mfe_pct = trades.length > 0
    ? roundDecimal(trades.reduce((sum, trade) => sum + (parseFloat(trade.mfe_pct) || 0), 0) / trades.length, 4)
    : 0;
  const avg_mae_pct = trades.length > 0
    ? roundDecimal(trades.reduce((sum, trade) => sum + (parseFloat(trade.mae_pct) || 0), 0) / trades.length, 4)
    : 0;
  const gap_open_losses = trades.filter((trade) => trade.gap_open === true).length;
  const avg_entry_gap_pct = trades.length > 0
    ? roundDecimal(trades.reduce((sum, trade) => sum + (parseFloat(trade.entry_gap_pct) || 0), 0) / trades.length, 4)
    : 0;

  const exit_reason_distribution = {};
  for (const trade of trades) {
    const reason = trade.exit_reason || 'UNKNOWN';
    exit_reason_distribution[reason] = (exit_reason_distribution[reason] || 0) + 1;
  }

  return {
    total_signals,
    wins,
    losses,
    neutral,
    win_rate_pct,
    avg_return_pct,
    expectancy_pct,
    max_drawdown_pct,
    sharpe_ratio,
    profit_factor,
    avg_holding_days,
    avg_mfe_pct,
    avg_mae_pct,
    gap_open_losses,
    avg_entry_gap_pct,
    exit_reason_distribution,
  };
}

function calculateMaxDrawdown(returns) {
  if (returns.length === 0) return 0;

  let cumulative = 0;
  let peak = 0;
  let max_drawdown = 0;

  for (const r of returns) {
    cumulative += r;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (drawdown > max_drawdown) max_drawdown = drawdown;
  }

  return roundDecimal(max_drawdown, 4);
}

function calculateSharpeRatio(returns) {
  if (returns.length < 2) return null;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const std_dev = Math.sqrt(variance);

  if (std_dev === 0) return null;
  return roundDecimal((mean / std_dev) * Math.sqrt(252), 4);
}

module.exports = { calculateMetrics, calculateMaxDrawdown, calculateSharpeRatio };
