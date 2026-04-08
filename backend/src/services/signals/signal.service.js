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
const strategyConfigModel = require('../../models/strategy_config.model');

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

async function buildCandidate(symbol, date, raw_signals, batch_signals = [], nifty_pcr = null, sentiment_adjustment = 0, vix_close = null) {
  if (!raw_signals || raw_signals.length === 0) return null;

  const use_pool = config.frequency_controller_enabled;
  const default_min_conf = use_pool ? config.pool_min_confidence : config.min_confidence;
  const min_rr = use_pool ? config.pool_min_risk_reward : config.min_risk_reward;

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

  const primaryStrategy = signal.strategy.includes('BREAKDOWN')
    ? 'BREAKDOWN'
    : signal.strategy.split('+')[0];

  const strategyConfig = await strategyConfigModel.getByName(primaryStrategy);
  const min_conf = strategyConfig?.min_confidence ?? default_min_conf;

  const feature = await featureModel.findBySymbolAndDate(symbol, date);

  let vwap_effect = 0;
  let pcr_effect = 0;

  if (feature && feature.vwap_distance_pct != null) {
    const vwap_dist = parseFloat(feature.vwap_distance_pct);
    const is_breakout = feature.is_breakout === 1 || feature.is_breakout === true;
    const is_uptrend = feature.is_uptrend === 1 || feature.is_uptrend === true;
    const rvol = feature.rvol != null ? parseFloat(feature.rvol) : 0;
    const ema50_slope = feature.ema50_slope != null ? parseFloat(feature.ema50_slope) : 0;
    const is_breakout_confirmed = is_breakout && rvol >= config.vwap_breakout_rvol_min;
    const strong_uptrend = is_uptrend && ema50_slope > config.min_ema50_slope;
    const strongDowntrend = !is_uptrend && ema50_slope < -config.min_ema50_slope;

    if (direction === 'LONG') {
      if (vwap_dist > config.vwap_hard_reject_long) {
        logger.info(`Signal for ${symbol} rejected: price ${vwap_dist.toFixed(2)}% above VWAP (hard limit: ${config.vwap_hard_reject_long}%)`);
        await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'VWAP_FILTER', reject_reason: `Price ${vwap_dist.toFixed(2)}% above VWAP, hard limit ${config.vwap_hard_reject_long}%`, raw_confidence: null, raw_rr: signal.risk_reward });
        return null;
      } else if (vwap_dist > config.vwap_soft_penalty_long) {
        if (is_breakout_confirmed || strong_uptrend) {
          logger.info(`Signal for ${symbol} VWAP override: dist=${vwap_dist.toFixed(2)}%, breakout=${is_breakout_confirmed}, uptrend=${strong_uptrend} — no penalty`);
        } else if (vwap_dist > config.vwap_trend_override_zone) {
          vwap_effect = -config.vwap_soft_penalty_moderate;
          logger.info(`Signal for ${symbol} penalized: VWAP distance ${vwap_dist.toFixed(2)}% > ${config.vwap_trend_override_zone}% stretched (-${config.vwap_soft_penalty_moderate})`);
        } else {
          vwap_effect = -config.vwap_soft_penalty_moderate;
          logger.info(`Signal for ${symbol} penalized: VWAP distance ${vwap_dist.toFixed(2)}% above soft threshold, no trend/breakout override (-${config.vwap_soft_penalty_moderate})`);
        }
      } else if (vwap_dist < -config.vwap_soft_penalty_long) {
        if (strong_uptrend) {
          vwap_effect = -3;
          logger.info(`Signal for ${symbol} penalized mildly: below VWAP (${vwap_dist.toFixed(2)}%) but strong uptrend — pullback entry (-3)`);
        } else {
          vwap_effect = -config.vwap_soft_penalty_below;
          logger.info(`Signal for ${symbol} penalized: ${vwap_dist.toFixed(2)}% below VWAP, weak stock (-${config.vwap_soft_penalty_below})`);
        }
      } else {
        vwap_effect = config.vwap_score_near;
        logger.info(`Signal for ${symbol} bonus: near VWAP (${vwap_dist.toFixed(2)}%) — ideal entry (+${config.vwap_score_near})`);
      }
    }

    if (direction === 'SHORT') {
      if (primaryStrategy === 'BREAKDOWN') {
        if (Math.abs(vwap_dist) > 20) {
          logger.warn(`Signal for ${symbol} rejected: VWAP distance ${vwap_dist.toFixed(2)}% is a data anomaly (>20%)`);
          await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'VWAP_FILTER', reject_reason: `VWAP distance ${vwap_dist.toFixed(2)}% exceeds 20% anomaly ceiling`, raw_confidence: null, raw_rr: signal.risk_reward });
          return null;
        }

        if (vwap_dist <= -5) {
          vwap_effect = 10;
        } else if (vwap_dist <= -2) {
          vwap_effect = 5;
        } else {
          vwap_effect = -5;
        }

        if (strongDowntrend && vwap_dist <= -5) {
          vwap_effect += 5;
        }
      } else {
        const abs_dist = Math.abs(vwap_dist);
        if (abs_dist > config.vwap_hard_reject_short) {
          logger.info(`Signal for ${symbol} rejected: price ${abs_dist.toFixed(2)}% from VWAP (hard limit: ${config.vwap_hard_reject_short}%)`);
          await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'VWAP_FILTER', reject_reason: `Price ${abs_dist.toFixed(2)}% from VWAP, hard limit ${config.vwap_hard_reject_short}%`, raw_confidence: null, raw_rr: signal.risk_reward });
          return null;
        } else if (vwap_dist > config.vwap_soft_penalty_short) {
          vwap_effect = config.vwap_score_near;
          logger.info(`Signal for ${symbol} bonus: price above VWAP (${vwap_dist.toFixed(2)}%) — good short entry (+${config.vwap_score_near})`);
        } else if (vwap_dist < -config.vwap_soft_penalty_short) {
          if (strongDowntrend) {
            logger.info(`Signal for ${symbol} VWAP override (SHORT): dist=${vwap_dist.toFixed(2)}%, strong downtrend — no penalty`);
          } else {
            vwap_effect = -config.vwap_soft_penalty_below;
            logger.info(`Signal for ${symbol} penalized: ${vwap_dist.toFixed(2)}% below VWAP, overextended short (-${config.vwap_soft_penalty_below})`);
          }
        }
      }

      logger.info({ symbol, strategy: primaryStrategy, vwap_dist, vwap_effect, strongDowntrend, reason: 'VWAP_EVALUATION' });
    }

    vwap_effect = Math.max(-config.vwap_max_bonus_cap, Math.min(config.vwap_max_bonus_cap, vwap_effect));
  }

  if (nifty_pcr != null && direction === 'LONG') {
    if (nifty_pcr > 1.8) {
      logger.info(`Signal for ${symbol} rejected: PCR ${nifty_pcr.toFixed(3)} > 1.8 — extreme bearish`);
      await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'PCR_FILTER', reject_reason: `PCR ${nifty_pcr.toFixed(3)} > 1.8 — extreme bearish options sentiment` });
      return null;
    }
    if (nifty_pcr > 1.4) {
      pcr_effect = -10;
      logger.info(`Signal for ${symbol} penalized: PCR ${nifty_pcr.toFixed(3)} in 1.4–1.8 range (-10 confidence)`);
    }
  }
  if (nifty_pcr != null && nifty_pcr < 0.7) {
    pcr_effect = -10;
    logger.info(`Signal for ${symbol} penalized: PCR ${nifty_pcr.toFixed(3)} < 0.7 — bull trap risk (-10 confidence)`);
  }

  const effects = { vwap: vwap_effect, pcr: pcr_effect, sentiment: sentiment_adjustment };
  const soft_penalty = effects.vwap + effects.pcr + effects.sentiment;

  const { score: raw_confidence, breakdown, feature: scoreFeature, indicator: scoreIndicator } = await calculateScoreWithBreakdown(symbol, date, direction);
  const confidence = Math.max(0, Math.min(100, raw_confidence + soft_penalty));

  if (soft_penalty !== 0) {
    logger.info(`Signal for ${symbol} confidence adjusted: raw=${raw_confidence}, vwap=${effects.vwap}, pcr=${effects.pcr}, sentiment=${effects.sentiment}, total=${soft_penalty}, final=${confidence}`);
  }

  if (confidence < min_conf) {
    logger.info(`Signal for ${symbol} rejected: confidence ${confidence} below ${min_conf}${use_pool ? ' (pool floor)' : ''}`);
    await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'CONFIDENCE_GATE', reject_reason: `Confidence ${confidence} below minimum ${min_conf}`, raw_confidence: confidence, raw_rr: signal.risk_reward });
    return null;
  }

  let confidence_tier = 'LOW';
  if (confidence >= config.confidence_tier_high) {
    confidence_tier = 'HIGH';
  } else if (confidence >= config.confidence_tier_normal) {
    confidence_tier = 'NORMAL';
  }

  if (signal.risk_reward < min_rr) {
    logger.info(`Signal for ${symbol} rejected: R:R ${signal.risk_reward} below ${min_rr}${use_pool ? ' (pool floor)' : ''}`);
    await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'RR_GATE', reject_reason: `R:R ${signal.risk_reward} below minimum ${min_rr}`, raw_confidence: confidence, raw_rr: signal.risk_reward });
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
  if (!sizing) {
    logger.info(`Signal for ${symbol} rejected: position sizing returned null (non-positive risk_per_share)`);
    await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: signal.strategy, reject_stage: 'POSITION_SIZING', reject_reason: 'Position sizing returned null (non-positive risk_per_share)', raw_confidence: confidence });
    return null;
  }
  if (sizing.shares_to_buy < 1) {
    sizing.shares_to_buy = 1;
    const risk_per_share = direction === 'SHORT'
      ? signal.stop_loss - signal.entry_price
      : signal.entry_price - signal.stop_loss;
    sizing.position_value = roundDecimal(signal.entry_price, 2);
    sizing.capital_risk_inr = roundDecimal(risk_per_share, 2);
    logger.info({ symbol, strategy: primaryStrategy, reason: 'POSITION_SIZING_FLOOR_APPLIED' });
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

  if (sizing.shares_to_buy < 1) {
    sizing.shares_to_buy = 1;
    const risk_per_share_floor = direction === 'SHORT'
      ? signal.stop_loss - signal.entry_price
      : signal.entry_price - signal.stop_loss;
    sizing.position_value = roundDecimal(signal.entry_price, 2);
    sizing.capital_risk_inr = roundDecimal(risk_per_share_floor, 2);
    logger.info({ symbol, strategy: primaryStrategy, regime_size_multiplier, reason: 'POSITION_SIZING_FLOOR_APPLIED_AFTER_REGIME' });
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

async function selectTopSignals(candidates, date) {
  if (candidates.length === 0) return [];

  const weekly_count = await signalModel.countByWeek(date);
  const remaining_slots = config.target_weekly_signals - weekly_count;
  const daily_limit = Math.min(config.max_signals_per_day, Math.max(0, remaining_slots));

  logger.info(`Frequency controller: weekly=${weekly_count}/${config.target_weekly_signals}, remaining=${remaining_slots}, daily_limit=${daily_limit}, candidates=${candidates.length}`);

  if (daily_limit <= 0) {
    logger.info(`Frequency controller: weekly target reached — all ${candidates.length} candidates deferred`);
    for (const c of candidates) {
      await rejectedSignalModel.insertRejected({
        symbol: c.symbol,
        date: c.date,
        strategy_source: c.strategy_source,
        reject_stage: 'FREQUENCY_CAP',
        reject_reason: `Weekly target ${config.target_weekly_signals} reached (${weekly_count} this week)`,
        raw_confidence: c.confidence,
        raw_rr: c.risk_reward,
      });
    }
    return [];
  }

  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.risk_reward - a.risk_reward;
  });

  const selected = candidates.slice(0, daily_limit);
  const deferred = candidates.slice(daily_limit);

  if (deferred.length > 0) {
    logger.info(`Frequency controller: selected top ${selected.length}, deferred ${deferred.length} candidates`);
    for (const c of deferred) {
      await rejectedSignalModel.insertRejected({
        symbol: c.symbol,
        date: c.date,
        strategy_source: c.strategy_source,
        reject_stage: 'FREQUENCY_CAP',
        reject_reason: `Ranked #${candidates.indexOf(c) + 1} but daily limit is ${daily_limit} (confidence=${c.confidence}, R:R=${c.risk_reward})`,
        raw_confidence: c.confidence,
        raw_rr: c.risk_reward,
      });
    }
  }

  return selected;
}

async function deduplicateAndGenerate(symbol, date, raw_signals, batch_signals = [], nifty_pcr = null, sentiment_adjustment = 0, vix_close = null) {
  return buildCandidate(symbol, date, raw_signals, batch_signals, nifty_pcr, sentiment_adjustment, vix_close);
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

module.exports = { deduplicateAndGenerate, buildCandidate, selectTopSignals, updateSignalStatuses, computePositionSizing };
