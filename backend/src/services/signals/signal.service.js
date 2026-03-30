const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');
const { formatDate } = require('../../utils/date.util');
const config = require('../../config/env');
const { getSector } = require('../../utils/symbols.util');
const signalModel = require('../../models/signal.model');
const featureModel = require('../../models/feature.model');
const candleModel = require('../../models/candle.model');
const { calculateScoreWithBreakdown, buildExplanations } = require('../scoring/scoring.service');
const { nifty_50_symbols } = require('../../utils/symbols.util');
const signalOutcomeModel = require('../../models/signal_outcome.model');
const rejectedSignalModel = require('../../models/rejected_signal.model');
const { sendTelegramAlert } = require('../../utils/notify.util');

function resolveExecutionType(direction, accountType) {
  if (direction === 'LONG') {
    return { execution_type: 'EQUITY', is_executable: true };
  }
  if (direction === 'SHORT') {
    if (accountType === 'FNO') {
      return { execution_type: 'FUTURES', is_executable: true };
    }
    return { execution_type: 'NONE', is_executable: false };
  }
  return { execution_type: 'EQUITY', is_executable: true };
}

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

async function deduplicateAndGenerate(symbol, date, raw_signals, batch_signals = [], nifty_pcr = null, sentiment_adjustment = 0, vix_close = null) {
  if (!raw_signals || raw_signals.length === 0) return null;

  const direction = raw_signals[0].direction || 'LONG';
  const is_short = direction === 'SHORT';

  const existing_active = await signalModel.findActiveBySymbol(symbol);
  const has_duplicate = existing_active.some((s) => s.direction === direction);
  if (has_duplicate) {
    logger.info(`Signal for ${symbol} rejected: already has an active ${direction} signal`);
    await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: raw_signals[0].strategy, reject_stage: 'DUPLICATE', reject_reason: `Already has active ${direction} signal`, raw_confidence: null });
    return null;
  }

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
      await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: raw_signals.map(s => s.strategy).join('+'), reject_stage: 'MERGED_RISK_ZERO', reject_reason: `Non-positive risk (${risk}) after SL merge` });
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

  let soft_penalty = 0;

  if (feature && feature.vwap_distance_pct != null) {
    const vwap_dist = parseFloat(feature.vwap_distance_pct);
    const vwap_hard_long = config.vwap_hard_reject_long;
    const vwap_soft_long = config.vwap_soft_penalty_long;
    const vwap_hard_short = config.vwap_hard_reject_short;
    const vwap_soft_short = config.vwap_soft_penalty_short;

    if (direction === 'LONG' && vwap_dist > vwap_hard_long) {
      logger.info(`Signal for ${symbol} rejected: price ${vwap_dist.toFixed(2)}% above VWAP (hard limit: ${vwap_hard_long}%)`);
      await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'VWAP_FILTER', reject_reason: `Price ${vwap_dist.toFixed(2)}% above VWAP, hard limit ${vwap_hard_long}%` });
      return null;
    }
    if (direction === 'SHORT' && Math.abs(vwap_dist) > vwap_hard_short) {
      logger.info(`Signal for ${symbol} rejected: price ${Math.abs(vwap_dist).toFixed(2)}% below VWAP (hard limit: ${vwap_hard_short}%)`);
      await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'VWAP_FILTER', reject_reason: `Price ${Math.abs(vwap_dist).toFixed(2)}% below VWAP, hard limit ${vwap_hard_short}%` });
      return null;
    }

    if (direction === 'LONG' && vwap_dist > vwap_soft_long) {
      soft_penalty += -10;
      logger.info(`Signal for ${symbol} penalized: VWAP distance ${vwap_dist.toFixed(2)}% > ${vwap_soft_long}% (-10 confidence)`);
    }
    if (direction === 'SHORT' && Math.abs(vwap_dist) > vwap_soft_short) {
      soft_penalty += -10;
      logger.info(`Signal for ${symbol} penalized: VWAP distance ${Math.abs(vwap_dist).toFixed(2)}% > ${vwap_soft_short}% (-10 confidence)`);
    }
  }

  if (nifty_pcr != null && direction === 'LONG') {
    if (nifty_pcr > 1.8) {
      logger.info(`Signal for ${symbol} rejected: PCR ${nifty_pcr.toFixed(3)} > 1.8 — extreme bearish`);
      await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'PCR_FILTER', reject_reason: `PCR ${nifty_pcr.toFixed(3)} > 1.8 — extreme bearish options sentiment` });
      return null;
    }
    if (nifty_pcr > 1.4) {
      soft_penalty += -10;
      logger.info(`Signal for ${symbol} penalized: PCR ${nifty_pcr.toFixed(3)} in 1.4–1.8 range (-10 confidence)`);
    }
  }
  if (nifty_pcr != null && nifty_pcr < 0.7) {
    soft_penalty += -10;
    logger.info(`Signal for ${symbol} penalized: PCR ${nifty_pcr.toFixed(3)} < 0.7 — bull trap risk (-10 confidence)`);
  }

  const { score: raw_confidence, breakdown, feature: scoreFeature, indicator: scoreIndicator } = await calculateScoreWithBreakdown(symbol, date, direction);
  const confidence = Math.max(0, Math.min(100, raw_confidence + soft_penalty + sentiment_adjustment));

  if (sentiment_adjustment !== 0 || soft_penalty !== 0) {
    logger.info(`Signal for ${symbol} confidence adjusted: raw=${raw_confidence}, VWAP/PCR=${soft_penalty}, sentiment=${sentiment_adjustment}, final=${confidence}`);
  }

  if (confidence < config.min_confidence) {
    logger.info(`Signal for ${symbol} rejected: confidence ${confidence} below ${config.min_confidence}`);
    await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'CONFIDENCE_GATE', reject_reason: `Confidence ${confidence} below minimum ${config.min_confidence}`, raw_confidence: confidence, raw_rr: signal.risk_reward });
    return null;
  }

  let confidence_tier = 'LOW';
  if (confidence >= config.confidence_tier_high) {
    confidence_tier = 'HIGH';
  } else if (confidence >= config.confidence_tier_normal) {
    confidence_tier = 'NORMAL';
  }

  if (signal.risk_reward < config.min_risk_reward) {
    logger.info(`Signal for ${symbol} rejected: R:R ${signal.risk_reward} below ${config.min_risk_reward}`);
    await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'RR_GATE', reject_reason: `R:R ${signal.risk_reward} below minimum ${config.min_risk_reward}`, raw_confidence: confidence, raw_rr: signal.risk_reward });
    return null;
  }

  const total_active_db = await signalModel.countAllActive(direction);
  const total_active_batch = batch_signals.filter((s) => s.direction === direction).length;
  const total_active = total_active_db + total_active_batch;
  if (total_active >= config.max_active_signals) {
    logger.info(`Signal for ${symbol} rejected: active ${direction} signal cap reached (${total_active}/${config.max_active_signals})`);
    await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'ACTIVE_CAP', reject_reason: `Active ${direction} signal cap reached (${total_active}/${config.max_active_signals})`, raw_confidence: confidence });
    return null;
  }

  const sector = getSector(symbol);
  const sector_symbols = nifty_50_symbols.filter((s) => getSector(s) === sector);
  const sector_active_db = await signalModel.countActiveBySector(sector_symbols, direction);
  const sector_active_batch = batch_signals.filter(
    (s) => s.direction === direction && sector_symbols.includes(s.symbol)
  ).length;
  const sector_active = sector_active_db + sector_active_batch;
  if (sector_active >= config.max_sector_signals) {
    logger.info(`Signal for ${symbol} rejected: sector ${sector} ${direction} cap reached (${sector_active}/${config.max_sector_signals})`);
    await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'SECTOR_GATE', reject_reason: `Sector ${sector} ${direction} cap reached (${sector_active}/${config.max_sector_signals})`, raw_confidence: confidence });
    return null;
  }

  const sizing = computePositionSizing(signal.entry_price, signal.stop_loss, direction);
  if (!sizing || sizing.shares_to_buy <= 0) {
    logger.info(`Signal for ${symbol} rejected: position sizing resulted in 0 shares`);
    await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'POSITION_SIZING', reject_reason: 'Position sizing resulted in 0 shares', raw_confidence: confidence });
    return null;
  }

  let regime_size_multiplier = 1.0;
  const is_ranging = feature && feature.is_ranging != null ? parseInt(feature.is_ranging) : 0;
  if (is_ranging === 1) {
    regime_size_multiplier = 0.5;
  } else if (vix_close != null && vix_close > config.vix_threshold) {
    regime_size_multiplier = 0.7;
  }

  if (regime_size_multiplier < 1.0) {
    sizing.shares_to_buy = Math.floor(sizing.shares_to_buy * regime_size_multiplier);
    sizing.position_value = roundDecimal(sizing.shares_to_buy * signal.entry_price, 2);
    const risk_per_share = direction === 'SHORT'
      ? signal.stop_loss - signal.entry_price
      : signal.entry_price - signal.stop_loss;
    sizing.capital_risk_inr = roundDecimal(sizing.shares_to_buy * risk_per_share, 2);
    logger.info(`Signal for ${symbol} regime-scaled: multiplier=${regime_size_multiplier}, shares=${sizing.shares_to_buy}`);
  }

  if (sizing.shares_to_buy <= 0) {
    logger.info(`Signal for ${symbol} rejected: 0 shares after regime sizing (multiplier: ${regime_size_multiplier})`);
    await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'POSITION_SIZING', reject_reason: `0 shares after regime sizing (multiplier: ${regime_size_multiplier})`, raw_confidence: confidence });
    return null;
  }

  const explanation = buildExplanations(scoreFeature, scoreIndicator, null, null, direction);

  const { execution_type, is_executable } = resolveExecutionType(direction, config.account_type);

  return {
    symbol,
    date,
    signal_type: is_short ? 'SELL' : 'BUY',
    direction,
    execution_type,
    is_executable,
    confidence,
    confidence_tier,
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
    regime_size_multiplier,
    confidence_breakdown: breakdown,
    explanation,
  };
}

async function recordOutcome(signal, outcome, resolved_at) {
  try {
    const feature = await featureModel.findBySymbolAndDate(signal.symbol, formatDate(signal.date));
    await signalOutcomeModel.create({
      signal_id: signal.id,
      outcome,
      strategy: signal.strategy_source,
      features_json: feature || null,
      resolved_at,
    });
  } catch (error) {
    logger.warn(`Failed to record outcome for signal ${signal.id}: ${error.message}`);
  }
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
    let new_status = null;

    if (is_short) {
      if (high >= stop_loss) new_status = 'SL_HIT';
      else if (low <= target_price) new_status = 'TARGET_HIT';
    } else {
      if (low <= stop_loss) new_status = 'SL_HIT';
      else if (high >= target_price) new_status = 'TARGET_HIT';
    }

    if (!new_status) {
      const signal_date = new Date(signal.date);
      const current_date = new Date(candle.date);
      const days_held = Math.floor((current_date - signal_date) / (1000 * 60 * 60 * 24));
      if (days_held >= config.holding_period_days) new_status = 'EXPIRED';
    }

    if (new_status) {
      await signalModel.updateStatus(signal.id, new_status, today);

      if (!signal.is_executable) {
        logger.info(`Signal ${signal.id} (${signal.symbol}) status updated to ${new_status} but outcome not recorded: non-executable (${signal.execution_type})`);
        updated++;
        continue;
      }

      let outcome_status = new_status;
      if (new_status === 'EXPIRED') {
        const entry = parseFloat(signal.entry_price);
        const exit = parseFloat(candle.adjusted_close);
        const rough_pnl_pct = entry > 0 ? Math.abs(((exit - entry) / entry) * 100) : 0;
        if (rough_pnl_pct < config.expired_movement_threshold) {
          outcome_status = 'EXPIRED_PENALIZED';
        }
      }
      await recordOutcome(signal, outcome_status, today);

      if (new_status === 'TARGET_HIT') {
        await sendTelegramAlert(
          `🎯 <b>TARGET HIT</b> — ${signal.symbol}\n` +
          `Direction: ${signal.direction}\n` +
          `Entry: ₹${signal.entry_price} → Target: ₹${signal.target_price}\n` +
          `Strategy: ${signal.strategy_source}\n` +
          `Confidence: ${signal.confidence}%`
        );
      } else if (new_status === 'SL_HIT') {
        await sendTelegramAlert(
          `🛑 <b>STOP LOSS HIT</b> — ${signal.symbol}\n` +
          `Direction: ${signal.direction}\n` +
          `Entry: ₹${signal.entry_price} → SL: ₹${signal.stop_loss}\n` +
          `Strategy: ${signal.strategy_source}\n` +
          `Confidence: ${signal.confidence}%`
        );
      } else if (new_status === 'EXPIRED') {
        await sendTelegramAlert(
          `⏰ <b>EXPIRED</b> — ${signal.symbol}\n` +
          `Direction: ${signal.direction}\n` +
          `Entry: ₹${signal.entry_price}\n` +
          `Held: ${config.holding_period_days} days\n` +
          `Strategy: ${signal.strategy_source}`
        );
      }

      updated++;
    }
  }

  logger.info(`Signal status update: ${updated}/${active_signals.length} signals updated`);
  return updated;
}

module.exports = { deduplicateAndGenerate, updateSignalStatuses, computePositionSizing };
