const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');
const { formatDate } = require('../../utils/date.util');
const config = require('../../config/env');
const paperTradeModel = require('../../models/paper_trade.model');
const candleModel = require('../../models/candle.model');
const signalModel = require('../../models/signal.model');

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
      shares_to_buy: signal.shares_to_buy || null,
      execution_type: signal.execution_type || 'EQUITY',
      status: 'OPEN',
    });
    created++;
  }

  logger.info(`Created ${created} paper trades`);
  return created;
}

function calculateNetPnl(entry_price, exit_price) {
  const slippage = config.slippage_pct / 100;
  const brokerage = config.brokerage_pct / 100;

  const effective_entry = entry_price * (1 + slippage + brokerage);
  const effective_exit = exit_price * (1 - slippage - brokerage);
  const pnl_pct = ((effective_exit - effective_entry) / effective_entry) * 100;

  return roundDecimal(pnl_pct, 4);
}

function computeGrossPnlInr(entry_price, exit_price, shares_to_buy, direction) {
  if (!shares_to_buy || shares_to_buy <= 0) return null;
  if (direction === 'SHORT') {
    return roundDecimal(shares_to_buy * (entry_price - exit_price), 2);
  }
  return roundDecimal(shares_to_buy * (exit_price - entry_price), 2);
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

    const today = formatDate(candle.date);
    const low = parseFloat(candle.low);
    const high = parseFloat(candle.high);
    const close = parseFloat(candle.adjusted_close);
    const stop_loss = parseFloat(trade.stop_loss);
    const target_price = parseFloat(trade.target_price);
    const entry_price = actual_entry != null ? actual_entry : parseFloat(trade.entry_price);
    const shares = trade.shares_to_buy ? parseInt(trade.shares_to_buy, 10) : 0;

    let exit_price = null;
    let exit_reason = null;

    if (direction === 'SHORT') {
      if (high >= stop_loss) {
        exit_price = stop_loss;
        exit_reason = 'SL_HIT';
      } else if (low <= target_price) {
        exit_price = target_price;
        exit_reason = 'TARGET_HIT';
      }
    } else {
      if (low <= stop_loss) {
        exit_price = stop_loss;
        exit_reason = 'SL_HIT';
      } else if (high >= target_price) {
        exit_price = target_price;
        exit_reason = 'TARGET_HIT';
      }
    }

    if (!exit_price) {
      const entry_date = new Date(trade.entry_date);
      const current_date = new Date(candle.date);
      const days_held = Math.floor((current_date - entry_date) / (1000 * 60 * 60 * 24));

      if (days_held >= config.holding_period_days) {
        exit_price = close;
        exit_reason = 'EXPIRED';
      } else {
        continue;
      }
    }

    let pnl_pct = calculateNetPnl(entry_price, exit_price);
    const gross_pnl_inr = computeGrossPnlInr(entry_price, exit_price, shares, direction);

    if (exit_reason === 'EXPIRED' && Math.abs(pnl_pct) < config.expired_movement_threshold) {
      const movement_ratio = 1 - Math.abs(pnl_pct) / config.expired_movement_threshold;
      const penalty = config.expired_min_penalty + (config.expired_max_penalty - config.expired_min_penalty) * movement_ratio;
      logger.info(`Paper trade ${trade.symbol}: expired with negligible movement (${pnl_pct.toFixed(4)}%), applying penalty ${penalty.toFixed(2)}%`);
      pnl_pct = roundDecimal(pnl_pct + penalty, 4);
      exit_reason = 'EXPIRED_PENALIZED';
    }

    await paperTradeModel.updateClose(trade.id, today, exit_price, exit_reason, pnl_pct, gross_pnl_inr);
    updated++;
  }

  logger.info(`Paper trade update: ${updated}/${open_trades.length} trades closed`);
  return updated;
}

async function getPaperTradingSummary() {
  return paperTradeModel.getSummary();
}

module.exports = { createPaperTrades, updatePaperTrades, calculateNetPnl, computeGrossPnlInr, getPaperTradingSummary };
