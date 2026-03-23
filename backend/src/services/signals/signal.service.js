const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');
const { formatDate } = require('../../utils/date.util');
const config = require('../../config/env');
const { getSector } = require('../../utils/symbols.util');
const signalModel = require('../../models/signal.model');
const featureModel = require('../../models/feature.model');
const candleModel = require('../../models/candle.model');
const { calculateScore } = require('../scoring/scoring.service');
const { nifty_50_symbols } = require('../../utils/symbols.util');

function computePositionSizing(entry_price, stop_loss, direction) {
  const risk_per_share = direction === 'SHORT'
    ? stop_loss - entry_price
    : entry_price - stop_loss;

  if (risk_per_share <= 0) return null;

  const risk_per_trade_inr = config.total_capital_inr * (config.risk_pct_per_trade / 100);
  let shares_to_buy = Math.floor(risk_per_trade_inr / risk_per_share);

  const max_pct = direction === 'SHORT'
    ? config.max_position_pct_short
    : config.max_position_pct;
  const max_position_value = config.total_capital_inr * (max_pct / 100);

  let position_value = shares_to_buy * entry_price;
  if (position_value > max_position_value) {
    shares_to_buy = Math.floor(max_position_value / entry_price);
    position_value = shares_to_buy * entry_price;
  }

  const capital_risk_inr = shares_to_buy * risk_per_share;

  return {
    shares_to_buy,
    position_value: roundDecimal(position_value, 2),
    capital_risk_inr: roundDecimal(capital_risk_inr, 2),
  };
}

async function deduplicateAndGenerate(symbol, date, raw_signals) {
  if (!raw_signals || raw_signals.length === 0) return null;

  const direction = raw_signals[0].direction || 'LONG';
  const is_short = direction === 'SHORT';

  let signal;

  if (raw_signals.length === 1) {
    signal = raw_signals[0];
  } else {
    const entry_price = raw_signals[0].entry_price;
    let stop_loss;
    if (is_short) {
      stop_loss = Math.min(...raw_signals.map((s) => s.stop_loss));
    } else {
      stop_loss = Math.max(...raw_signals.map((s) => s.stop_loss));
    }

    const risk = is_short
      ? stop_loss - entry_price
      : entry_price - stop_loss;

    if (risk <= 0) {
      logger.info(`Merged signal for ${symbol} discarded: non-positive risk after SL merge`);
      return null;
    }

    const target_price = is_short
      ? roundDecimal(entry_price - 2.0 * risk, 2)
      : roundDecimal(entry_price + 2.0 * risk, 2);
    const risk_reward = roundDecimal(
      is_short
        ? (entry_price - target_price) / risk
        : (target_price - entry_price) / risk,
      2
    );

    const all_strategies = raw_signals.map((s) => s.strategy);
    const all_reasons = [...new Set(raw_signals.flatMap((s) => s.reasons))];

    signal = {
      symbol,
      date,
      entry_price,
      stop_loss: roundDecimal(stop_loss, 2),
      target_price,
      risk_reward,
      strategy: all_strategies.join('+'),
      reasons: all_reasons,
      direction,
    };
  }

  const feature = await featureModel.findBySymbolAndDate(symbol, date);
  if (feature && (feature.is_liquid === 0 || feature.is_liquid === false)) {
    logger.info(`Signal for ${symbol} rejected: insufficient liquidity`);
    return null;
  }

  const confidence = await calculateScore(symbol, date);
  if (confidence < config.min_confidence) {
    logger.info(`Signal for ${symbol} rejected: confidence ${confidence} below ${config.min_confidence}`);
    return null;
  }

  if (signal.risk_reward < config.min_risk_reward) {
    logger.info(`Signal for ${symbol} rejected: R:R ${signal.risk_reward} below ${config.min_risk_reward}`);
    return null;
  }

  const total_active = await signalModel.countAllActive(direction);
  if (total_active >= config.max_active_signals) {
    logger.info(`Signal for ${symbol} rejected: active ${direction} signal cap reached (${total_active}/${config.max_active_signals})`);
    return null;
  }

  const sector = getSector(symbol);
  const sector_symbols = nifty_50_symbols.filter((s) => getSector(s) === sector);
  const sector_active = await signalModel.countActiveBySector(sector_symbols, direction);
  if (sector_active >= config.max_sector_signals) {
    logger.info(`Signal for ${symbol} rejected: sector ${sector} ${direction} cap reached (${sector_active}/${config.max_sector_signals})`);
    return null;
  }

  const sizing = computePositionSizing(signal.entry_price, signal.stop_loss, direction);
  if (!sizing || sizing.shares_to_buy <= 0) {
    logger.info(`Signal for ${symbol} rejected: position sizing resulted in 0 shares`);
    return null;
  }

  return {
    symbol,
    date,
    signal_type: is_short ? 'SELL' : 'BUY',
    direction,
    confidence,
    entry_price: signal.entry_price,
    stop_loss: signal.stop_loss,
    target_price: signal.target_price,
    risk_reward: signal.risk_reward,
    reasons: signal.reasons,
    status: 'ACTIVE',
    strategy_source: signal.strategy,
    shares_to_buy: sizing.shares_to_buy,
    position_value: sizing.position_value,
    capital_risk_inr: sizing.capital_risk_inr,
  };
}

async function updateSignalStatuses() {
  const active_signals = await signalModel.findActive();
  let updated = 0;

  for (const signal of active_signals) {
    const candle = await candleModel.findLatestBySymbol(signal.symbol);
    if (!candle) continue;

    const today = formatDate(candle.date);
    const low = parseFloat(candle.low);
    const high = parseFloat(candle.high);
    const stop_loss = parseFloat(signal.stop_loss);
    const target_price = parseFloat(signal.target_price);
    const is_short = signal.direction === 'SHORT';

    if (is_short) {
      if (high >= stop_loss) {
        await signalModel.updateStatus(signal.id, 'SL_HIT', today);
        updated++;
      } else if (low <= target_price) {
        await signalModel.updateStatus(signal.id, 'TARGET_HIT', today);
        updated++;
      } else {
        const signal_date = new Date(signal.date);
        const current_date = new Date(candle.date);
        const days_held = Math.floor((current_date - signal_date) / (1000 * 60 * 60 * 24));
        if (days_held >= config.holding_period_days) {
          await signalModel.updateStatus(signal.id, 'EXPIRED', today);
          updated++;
        }
      }
    } else {
      if (low <= stop_loss) {
        await signalModel.updateStatus(signal.id, 'SL_HIT', today);
        updated++;
      } else if (high >= target_price) {
        await signalModel.updateStatus(signal.id, 'TARGET_HIT', today);
        updated++;
      } else {
        const signal_date = new Date(signal.date);
        const current_date = new Date(candle.date);
        const days_held = Math.floor((current_date - signal_date) / (1000 * 60 * 60 * 24));
        if (days_held >= config.holding_period_days) {
          await signalModel.updateStatus(signal.id, 'EXPIRED', today);
          updated++;
        }
      }
    }
  }

  logger.info(`Signal status update: ${updated}/${active_signals.length} signals updated`);
  return updated;
}

module.exports = { deduplicateAndGenerate, updateSignalStatuses, computePositionSizing };
