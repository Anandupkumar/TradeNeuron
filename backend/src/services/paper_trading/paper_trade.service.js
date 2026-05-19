const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');
const { formatDate } = require('../../utils/date.util');
const config = require('../../config/env');
const paperTradeModel = require('../../models/paper_trade.model');
const candleModel = require('../../models/candle.model');
const signalModel = require('../../models/signal.model');
const signalOutcomeModel = require('../../models/signal_outcome.model');
const { evaluateSignalExit } = require('../../utils/exit_policy.util');
const { applyExpiredPenalty } = require('../../utils/exit_accounting.util');
const { classifyTradeLifecycle } = require('../../utils/trade_lifecycle.util');

async function createPaperTrades(signals) {
  let created = 0;

  for (const signal of signals) {
    if (!signal.is_executable) {
      logger.info(
        `Paper trade skipped for ${signal.symbol}: ` +
        `execution_type=${signal.execution_type}, direction=${signal.direction}`
      );
      continue;
    }

    const next_candle = await candleModel.findNextCandle(signal.symbol, signal.date);
    const actual_entry = next_candle ? parseFloat(next_candle.open) : null;

    await paperTradeModel.create({
      signal_id: signal.id,
      symbol: signal.symbol,
      direction: signal.direction || 'LONG',
      entry_date: signal.date,
      entry_price: signal.entry_price,
      actual_entry_price: actual_entry,
      stop_loss: signal.stop_loss,
      target_price: signal.target_price,
      exit_policy: signal.exit_policy || null,
      max_hold_days: signal.max_hold_days || null,
      shares_to_buy: signal.shares_to_buy || null,
      execution_type: signal.execution_type || 'EQUITY',
      status: 'OPEN',
      lifecycle_state: 'ACTIVE',
      lifecycle_note: 'Paper trade created',
    });
    created++;
  }

  logger.info(`Created ${created} paper trades`);
  return created;
}

function calculateNetPnl(entry_price, exit_price, direction = 'LONG') {
  const cost = (config.slippage_pct + config.brokerage_pct) / 100;

  if (direction === 'SHORT') {
    const effective_sell = entry_price * (1 - cost);
    const effective_buyback = exit_price * (1 + cost);
    return roundDecimal(((effective_sell - effective_buyback) / effective_sell) * 100, 4);
  }

  const effective_entry = entry_price * (1 + cost);
  const effective_exit = exit_price * (1 - cost);
  return roundDecimal(((effective_exit - effective_entry) / effective_entry) * 100, 4);
}

function computeGrossPnlInr(entry_price, exit_price, shares_to_buy, direction) {
  if (!shares_to_buy || shares_to_buy <= 0) return null;
  if (direction === 'SHORT') {
    return roundDecimal(shares_to_buy * (entry_price - exit_price), 2);
  }
  return roundDecimal(shares_to_buy * (exit_price - entry_price), 2);
}

// Phase A / Fix 1: share-weighted multi-leg PnL. Each leg pays its own slippage+brokerage
// because in real execution the partial and the final are distinct fills.
function computeMultiLegPnl(entry_price, evaluation, shares, direction) {
  if (!evaluation || !evaluation.partial_fired) {
    return {
      pnl_pct: calculateNetPnl(entry_price, evaluation.exit_price, direction),
      gross_pnl_inr: computeGrossPnlInr(entry_price, evaluation.exit_price, shares, direction),
    };
  }

  const partial_fraction = parseFloat(evaluation.partial_fraction) || 0.5;
  const partial_shares = Math.max(0, Math.floor((shares || 0) * partial_fraction));
  const final_shares = Math.max(0, (shares || 0) - partial_shares);
  const partial_price = parseFloat(evaluation.partial_exit_price);
  const final_price = parseFloat(evaluation.final_leg_price != null ? evaluation.final_leg_price : evaluation.exit_price);

  const partial_net_pct = calculateNetPnl(entry_price, partial_price, direction);
  const final_net_pct = calculateNetPnl(entry_price, final_price, direction);

  // Share-weighted blended net %.
  const total_shares = partial_shares + final_shares;
  const pnl_pct = total_shares > 0
    ? roundDecimal((partial_net_pct * partial_shares + final_net_pct * final_shares) / total_shares, 4)
    : roundDecimal((partial_net_pct + final_net_pct) / 2, 4);

  const partial_gross = computeGrossPnlInr(entry_price, partial_price, partial_shares, direction) || 0;
  const final_gross = computeGrossPnlInr(entry_price, final_price, final_shares, direction) || 0;
  const gross_pnl_inr = shares > 0 ? roundDecimal(partial_gross + final_gross, 2) : null;

  return {
    pnl_pct,
    gross_pnl_inr,
    partial_shares,
    partial_pnl_pct: partial_net_pct,
    partial_realized_pnl_inr: partial_gross,
  };
}

async function updatePaperTrades() {
  const open_trades = await paperTradeModel.findOpen();
  let updated = 0;

  for (const trade of open_trades) {
    const candle = await candleModel.findLatestBySymbol(trade.symbol);
    if (!candle) continue;

    const signal = trade.signal_id ? await signalModel.findById(trade.signal_id) : null;
    const direction = signal ? (signal.direction || 'LONG') : 'LONG';

    // Populate actual_entry_price from next-day open if not yet set
    let actual_entry = trade.actual_entry_price != null ? parseFloat(trade.actual_entry_price) : null;
    if (actual_entry == null) {
      const next_candle = await candleModel.findNextCandle(trade.symbol, trade.entry_date);
      if (next_candle) {
        actual_entry = parseFloat(next_candle.open);
        await paperTradeModel.updateActualEntry(trade.id, actual_entry);
      }
    }

    const all_candles = await candleModel.findBySymbolAndDateRange(
      trade.symbol,
      formatDate(trade.entry_date),
      formatDate(candle.date)
    );
    const future_candles = all_candles.filter((row) => formatDate(row.date) > formatDate(trade.entry_date));
    const entry_price = actual_entry != null ? actual_entry : parseFloat(trade.entry_price);
    const shares = trade.shares_to_buy ? parseInt(trade.shares_to_buy, 10) : 0;
    // Phase C / Fix 6 pre-wire: pass trailing context for vol-compression exit when enabled.
    const trailing_candles = config.vol_compression_exit_enabled
      ? await candleModel.findTrailingBefore(
          trade.symbol,
          formatDate(trade.entry_date),
          config.vol_compression_trailing_window
        ).catch(() => null)
      : null;

    const evaluation = evaluateSignalExit({
      direction,
      entry_price: trade.entry_price,
      stop_loss: trade.stop_loss,
      target_price: trade.target_price,
      exit_policy: trade.exit_policy || (signal ? signal.exit_policy : null),
      max_hold_days: trade.max_hold_days || (signal ? signal.max_hold_days : null) || config.holding_period_days,
      strategy_source: signal ? signal.strategy_source : null,
    }, future_candles, {
      entry_price_override: entry_price,
      trailing_candles: trailing_candles || undefined,
    });

    // Record partial leg even if the trade has not yet closed (open question #2:
    // in-flight retrofit — existing OPEN trades pick up partial-exit logic from
    // the next pipeline tick forward).
    if (evaluation.partial_fired && !trade.partial_exit_price) {
      const partial_fraction = parseFloat(evaluation.partial_fraction) || 0.5;
      const partial_shares = Math.max(0, Math.floor(shares * partial_fraction));
      const partial_price = parseFloat(evaluation.partial_exit_price);
      const partial_net_pct = calculateNetPnl(entry_price, partial_price, direction);
      const partial_gross = computeGrossPnlInr(entry_price, partial_price, partial_shares, direction);
      const partial_idx = Math.max(0, (evaluation.partial_exit_day || 1) - 1);
      const partial_resolved_at = future_candles[partial_idx]
        ? formatDate(future_candles[partial_idx].date)
        : null;
      await paperTradeModel.recordPartialLeg(trade.id, {
        partial_exit_price: partial_price,
        partial_exit_date: partial_resolved_at,
        partial_shares_booked: partial_shares,
        partial_realized_pnl_inr: partial_gross,
        partial_pnl_pct: partial_net_pct,
        sl_moved_to_breakeven: !!evaluation.sl_moved_to_breakeven,
      });
    }

    const lifecycle = classifyTradeLifecycle(trade, evaluation, future_candles, {
      direction,
      entry_price,
      exit_policy: trade.exit_policy || (signal ? signal.exit_policy : null),
      max_hold_days: trade.max_hold_days || (signal ? signal.max_hold_days : null) || config.holding_period_days,
    });
    if (!evaluation.exit_reason) {
      await paperTradeModel.updateLifecycleState(
        trade.id,
        lifecycle.lifecycle_state,
        lifecycle.lifecycle_note
      );
    }

    if (!evaluation.exit_reason) continue;

    const exit_price = evaluation.exit_price;
    let exit_reason = evaluation.exit_reason;
    const resolved_idx = Math.max(0, (evaluation.days || 1) - 1);
    const resolved_candle = future_candles[resolved_idx] || future_candles[future_candles.length - 1] || candle;
    const today = formatDate(resolved_candle.date);

    const pnl = computeMultiLegPnl(entry_price, evaluation, shares, direction);
    let pnl_pct = pnl.pnl_pct;
    const gross_pnl_inr = pnl.gross_pnl_inr;

    const penalty_result = applyExpiredPenalty(exit_reason, pnl_pct);
    if (penalty_result.penalty_applied) {
      logger.info(`Paper trade ${trade.symbol}: expired with negligible movement (${pnl_pct.toFixed(4)}%), applying penalty ${penalty_result.penalty_pct.toFixed(2)}%`);
      pnl_pct = penalty_result.pnl_pct;
      exit_reason = penalty_result.exit_reason;
    }

    await paperTradeModel.updateClose(trade.id, today, exit_price, exit_reason, pnl_pct, gross_pnl_inr);
    await paperTradeModel.updateTelemetry(trade.id, evaluation);
    await signalOutcomeModel.updatePaperTradeComparison(trade.signal_id, {
      actual_entry_price: actual_entry,
      entry_slippage_pct: evaluation.entry_gap_pct,
      pnl_pct,
      exit_reason,
    });
    updated++;
  }

  logger.info(`Paper trade update: ${updated}/${open_trades.length} trades closed`);
  return updated;
}

async function getPaperTradingSummary() {
  return paperTradeModel.getSummary();
}

module.exports = { createPaperTrades, updatePaperTrades, calculateNetPnl, computeGrossPnlInr, getPaperTradingSummary };
