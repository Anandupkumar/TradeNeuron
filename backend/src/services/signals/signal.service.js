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
const fundamentalModel = require('../../models/fundamental.model');
const confidenceCalibrationModel = require('../../models/confidence_calibration.model');
const paperTradeModel = require('../../models/paper_trade.model');
const blockedSignalEventModel = require('../../models/blocked_signal_event.model');
const { getSectorAverageRelativeStrength } = require('../fundamentals/sector_context.service');
const { tradingDaysUntilNext, countTradingDaysAfterUntil } = require('../../utils/date.util');
const {
  attachExitPolicy,
  recomputeExitPlan,
  evaluateSignalExit,
  deriveConservativeTarget,
} = require('../../utils/exit_policy.util');
const { applyExpiredPenalty } = require('../../utils/exit_accounting.util');
const { computeRankingScore } = require('../../utils/ranking.util');
// Correlation service is lazy-required in computePositionSizing so Phase B (the module
// itself) can ship later without breaking Phase A boot.

function vwDistPct(feature) {
  if (!feature) return null;
  const raw = feature.vwma_distance_pct ?? feature.vwap_distance_pct;
  return raw != null ? parseFloat(raw) : null;
}

function isNearVwma(feature) {
  if (!feature) return false;
  const a = feature.is_near_vwma === 1 || feature.is_near_vwma === true;
  const b = feature.is_near_vwap === 1 || feature.is_near_vwap === true;
  return !!(a || b);
}

function bucketConfidence(value) {
  if (value == null) return null;
  const numeric = parseFloat(value);
  if (Number.isNaN(numeric)) return null;
  return Math.floor(numeric / 5) * 5;
}

function bucketRelativeStrength(value) {
  const rs = value != null ? parseFloat(value) : null;
  if (rs == null || Number.isNaN(rs)) return 'UNKNOWN';
  if (rs >= 10) return 'VERY_STRONG';
  if (rs >= 5) return 'STRONG';
  if (rs <= -10) return 'VERY_WEAK';
  if (rs <= -5) return 'WEAK';
  return 'NEUTRAL';
}

function assessTargetReachability(signal) {
  const entry = parseFloat(signal.entry_price);
  const target = parseFloat(signal.target_price);
  const max_hold_days = parseInt(signal.max_hold_days || config.holding_period_days, 10);
  const atr = signal.exit_policy && signal.exit_policy.atr_value != null
    ? parseFloat(signal.exit_policy.atr_value)
    : null;

  if (!(entry > 0) || !(target > 0) || !(atr > 0) || !(max_hold_days > 0)) {
    return { warning: false, flags: [] };
  }

  const target_distance = Math.abs(target - entry);
  const projected_move = atr * Math.sqrt(max_hold_days);
  if (target_distance > projected_move * 1.5) {
    return {
      warning: true,
      flags: ['TARGET_REACHABILITY_WARNING'],
      projected_move: roundDecimal(projected_move, 2),
      target_distance: roundDecimal(target_distance, 2),
    };
  }

  return { warning: false, flags: [] };
}

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

async function recordBlockedEvent(candidate, blocked_reason, active_trade = null) {
  try {
    await blockedSignalEventModel.create({
      symbol: candidate.symbol,
      date: candidate.date,
      strategy_source: candidate.strategy_source || candidate.strategy,
      direction: candidate.direction || null,
      blocked_reason,
      blocked_confidence: candidate.confidence != null ? candidate.confidence : candidate.raw_confidence,
      blocked_rr: candidate.risk_reward,
      active_trade_id: active_trade ? active_trade.id : null,
      active_trade_symbol: active_trade ? active_trade.symbol : null,
      active_trade_lifecycle_state: active_trade ? active_trade.lifecycle_state : null,
    });
  } catch (error) {
    logger.warn(`Blocked signal telemetry failed for ${candidate.symbol}: ${error.message}`);
  }
}

async function findStaleOpenTrade() {
  try {
    const open_trades = await paperTradeModel.findOpen();
    return open_trades.find((trade) => trade.lifecycle_state === 'STALE') || null;
  } catch (error) {
    logger.warn(`Failed to inspect stale open trades: ${error.message}`);
    return null;
  }
}

function computePositionSizing(entry_price, stop_loss, direction, opts = {}) {
  const risk_per_share = direction === 'SHORT'
    ? stop_loss - entry_price
    : entry_price - stop_loss;

  if (risk_per_share <= 0) return null;

  const correlation_divisor = opts.correlation_divisor != null && config.correlation_position_scaling_enabled
    ? Math.max(1, opts.correlation_divisor)
    : 1;
  const drawdown_scale = opts.drawdown_scale != null && config.drawdown_risk_scaling_enabled
    ? opts.drawdown_scale
    : 1;
  // Phase C / Fix 7: per-strategy continuous risk budget. Clamped to [min, max] before being applied.
  const strategy_multiplier = opts.strategy_multiplier != null && config.risk_budget_enabled
    ? Math.max(
        config.risk_budget_min_multiplier,
        Math.min(config.risk_budget_max_multiplier, parseFloat(opts.strategy_multiplier))
      )
    : 1;

  let risk_per_trade_inr = (config.total_capital_inr * (config.risk_pct_per_trade / 100)) / correlation_divisor;
  risk_per_trade_inr *= drawdown_scale;
  risk_per_trade_inr *= strategy_multiplier;

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

async function buildCandidate(
  symbol,
  date,
  raw_signals,
  batch_signals = [],
  nifty_pcr = null,
  sentiment_adjustment = 0,
  vix_close = null,
  market_regime = null
) {
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

  if (config.earnings_blackout_enabled) {
    const fund = await fundamentalModel.findLatestBySymbol(symbol);
    const ed = fund?.next_earnings_date;
    if (ed) {
      const earn = new Date(ed);
      const today = new Date(date);
      let blackout = false;
      if (earn > today) {
        const daysTo = tradingDaysUntilNext(date, ed);
        if (daysTo >= 1 && daysTo <= 2) blackout = true;
      } else {
        const daysSince = countTradingDaysAfterUntil(ed, date);
        if (daysSince >= 0 && daysSince <= 1) blackout = true;
      }
      if (blackout) {
        logger.info(`Signal for ${symbol} rejected: earnings blackout window (next=${ed})`);
        await rejectedSignalModel.insertRejected({
          symbol, date, strategy_source: raw_signals[0].strategy, reject_stage: 'EARNINGS_BLACKOUT',
          reject_reason: `Earnings blackout near ${ed}`, raw_confidence: null,
        });
        return null;
      }
    }
  }

  const prepared_signals = raw_signals.map((raw) => attachExitPolicy(raw));
  let signal;

  if (prepared_signals.length === 1) {
    signal = prepared_signals[0];
  } else {
    const entry_price = prepared_signals[0].entry_price;
    let stop_loss;
    if (is_short) {
      stop_loss = Math.min(...prepared_signals.map((s) => s.stop_loss));
    } else {
      stop_loss = Math.max(...prepared_signals.map((s) => s.stop_loss));
    }

    const risk = is_short
      ? stop_loss - entry_price
      : entry_price - stop_loss;

    if (risk <= 0) {
      logger.info(`Merged signal for ${symbol} discarded: non-positive risk after SL merge`);
      await rejectedSignalModel.insertRejected({ symbol, date, strategy_source: prepared_signals.map((s) => s.strategy).join('+'), reject_stage: 'MERGED_RISK_ZERO', reject_reason: `Non-positive risk (${risk}) after SL merge` });
      return null;
    }

    const target_price = deriveConservativeTarget(prepared_signals, direction);

    const all_strategies = prepared_signals.map((s) => s.strategy);
    const all_reasons = [...new Set(prepared_signals.flatMap((s) => s.reasons))];

    signal = attachExitPolicy({
      symbol,
      date,
      entry_price,
      stop_loss: roundDecimal(stop_loss, 2),
      target_price,
      strategy: all_strategies.join('+'),
      exit_policy: {
        kind: 'LEVEL_TARGET',
        target_source: 'MERGED_CONSERVATIVE',
        max_hold_days: Math.max(...prepared_signals.map((s) => s.max_hold_days || config.holding_period_days)),
      },
      reasons: all_reasons,
      direction,
    });
  }

  if (config.futures_sl_buffer_enabled && is_short && config.account_type === 'FNO') {
    const new_sl = roundDecimal(parseFloat(signal.stop_loss) * config.futures_sl_buffer_factor, 2);
    signal = recomputeExitPlan(signal, new_sl);
  }

  const primaryStrategy = signal.strategy.includes('BREAKDOWN')
    ? 'BREAKDOWN'
    : signal.strategy.split('+')[0];

  const strategyConfig = await strategyConfigModel.getByName(primaryStrategy);
  const min_conf = strategyConfig?.min_confidence ?? default_min_conf;

  const feature = await featureModel.findBySymbolAndDate(symbol, date);

  let vwap_effect = 0;
  let pcr_effect = 0;

  const vw_dist_val = vwDistPct(feature);
  if (feature && vw_dist_val != null) {
    const vwap_dist = vw_dist_val;
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

  const { score: model_score, breakdown, feature: scoreFeature, indicator: scoreIndicator } = await calculateScoreWithBreakdown(symbol, date, direction);
  const pre_calib_confidence = Math.max(0, Math.min(100, model_score + soft_penalty));

  if (soft_penalty !== 0) {
    logger.info(`Signal for ${symbol} confidence adjusted: raw=${model_score}, vwap=${effects.vwap}, pcr=${effects.pcr}, sentiment=${effects.sentiment}, total=${soft_penalty}, pre_calib=${pre_calib_confidence}`);
  }

  let confidence = pre_calib_confidence;
  let confidence_calibrated_flag = false;

  if (config.confidence_calibration_enabled) {
    const bucket = Math.floor(pre_calib_confidence / 5) * 5;
    // Phase B / Fix 3: per-strategy x per-direction calibration with fallback.
    const cal_args = config.calibration_per_strategy_enabled
      ? [bucket, primaryStrategy, direction]
      : [bucket];
    const cal = await confidenceCalibrationModel.findLatestForBucket(...cal_args);
    if (cal && cal.total_signals >= config.calibration_min_bucket_samples) {
      const pw = config.calibration_prior_weight;
      const n = cal.total_signals;
      const awr = parseFloat(cal.actual_win_rate);
      confidence = Math.round((pre_calib_confidence * pw + awr * n) / (pw + n));
      confidence = Math.max(0, Math.min(100, confidence));
      confidence_calibrated_flag = true;
      if (cal.slice_level) {
        logger.info(`Signal for ${symbol} calibrated: bucket=${bucket}, slice=${cal.slice_level}, n=${n}, awr=${awr}, pre=${pre_calib_confidence} → ${confidence}`);
      }
    }
  }

  const sector_name = getSector(symbol);
  const sector_avg = await getSectorAverageRelativeStrength(date, sector_name);

  if (config.sector_trend_penalty_enabled) {
    if (sector_avg != null) {
      if (direction === 'LONG' && sector_avg < 0) {
        confidence = Math.max(0, confidence - config.sector_trend_penalty_points);
        logger.info(`Signal for ${symbol} sector penalty: sector avg RS ${sector_avg.toFixed(2)} (weak) — -${config.sector_trend_penalty_points}`);
      }
      if (direction === 'SHORT' && sector_avg > 0) {
        confidence = Math.max(0, confidence - config.sector_trend_penalty_points);
        logger.info(`Signal for ${symbol} sector penalty: sector avg RS ${sector_avg.toFixed(2)} (strong) — -${config.sector_trend_penalty_points}`);
      }
    }
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
    const stale_trade = await findStaleOpenTrade();
    await recordBlockedEvent({
      symbol, date, strategy_source: signal.strategy, direction, confidence, risk_reward: signal.risk_reward,
    }, stale_trade ? 'STALE_CAPITAL' : 'MAX_ACTIVE_TRADES', stale_trade);
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
    const stale_trade = await findStaleOpenTrade();
    await recordBlockedEvent({
      symbol, date, strategy_source: signal.strategy, direction, confidence, risk_reward: signal.risk_reward,
    }, stale_trade ? 'STALE_CAPITAL' : 'SECTOR_CAP', stale_trade);
    return null;
  }

  const dd_frac = await paperTradeModel.getPortfolioDrawdownFraction();
  let drawdown_scale = 1;
  if (config.drawdown_risk_scaling_enabled) {
    if (dd_frac > config.drawdown_threshold_high) drawdown_scale = config.drawdown_scale_severe;
    else if (dd_frac > config.drawdown_threshold_mid) drawdown_scale = config.drawdown_scale_moderate;
  }

  // Phase B / Fix 5: 20D return-correlation divisor replaces sector proxy when enabled.
  // Both values are logged for the first month so we can A/B the model before fully retiring the proxy.
  let correlation_divisor = sector_active + 1;
  let correlated_count = null;
  if (config.correlation_model_enabled) {
    try {
      // eslint-disable-next-line global-require
      const correlationService = require('../risk/correlation.service');
      const active_rows = await signalModel.findActive();
      const active_symbols = [...new Set(
        active_rows
          .filter((row) => row.symbol !== symbol && (direction ? row.direction === direction : true))
          .map((row) => row.symbol)
      )];
      const batch_symbols = [...new Set(
        batch_signals
          .filter((b) => b.symbol !== symbol && (direction ? b.direction === direction : true))
          .map((b) => b.symbol)
      )];
      const candidate_pool = [...new Set([...active_symbols, ...batch_symbols])];
      correlated_count = await correlationService.countHighlyCorrelatedActive(
        symbol,
        candidate_pool,
        config.correlation_divisor_threshold,
        { lookback_days: config.correlation_lookback_days, as_of_date: date }
      );
      correlation_divisor = 1 + (correlated_count != null ? correlated_count : sector_active);
    } catch (error) {
      logger.warn(`Correlation divisor computation failed for ${symbol}: ${error.message} — falling back to sector proxy`);
    }
  }
  logger.info(`Position sizing ${symbol} ${direction}: correlation_divisor=${correlation_divisor}, correlated_count=${correlated_count ?? 'n/a'}, sector_active=${sector_active}`);

  // Phase C / Fix 7: per-strategy continuous risk budget multiplier from strategy_config.
  let strategy_multiplier = 1;
  if (config.risk_budget_enabled && strategyConfig && strategyConfig.risk_budget_multiplier != null) {
    strategy_multiplier = parseFloat(strategyConfig.risk_budget_multiplier) || 1;
  }

  const sizing = computePositionSizing(signal.entry_price, signal.stop_loss, direction, {
    correlation_divisor,
    drawdown_scale,
    strategy_multiplier,
  });
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

  if (config.portfolio_risk_cap_enabled) {
    const batch_risk = batch_signals.reduce((acc, b) => acc + (parseFloat(b.capital_risk_inr) || 0), 0);
    const active_risk = await signalModel.sumActiveCapitalRisk();
    const max_total = config.total_capital_inr * (config.max_portfolio_risk_pct / 100);
    if (active_risk + batch_risk + sizing.capital_risk_inr > max_total) {
      logger.info(`Signal for ${symbol} rejected: portfolio risk cap (${active_risk + batch_risk + sizing.capital_risk_inr} > ${max_total})`);
      await rejectedSignalModel.insertRejected({
        symbol, date, strategy_source: signal.strategy, reject_stage: 'PORTFOLIO_RISK_CAP',
        reject_reason: `Portfolio capital at risk would exceed ${config.max_portfolio_risk_pct}% of capital`,
        raw_confidence: confidence, raw_rr: signal.risk_reward,
      });
      const stale_trade = await findStaleOpenTrade();
      await recordBlockedEvent({
        symbol, date, strategy_source: signal.strategy, direction, confidence, risk_reward: signal.risk_reward,
      }, stale_trade ? 'STALE_CAPITAL' : 'PORTFOLIO_RISK_CAP', stale_trade);
      return null;
    }
  }

  if (config.directional_exposure_enabled && is_short) {
    const long_r = await signalModel.sumActiveCapitalRiskByDirection('LONG');
    const short_r = await signalModel.sumActiveCapitalRiskByDirection('SHORT');
    const batch_long = batch_signals.filter((x) => x.direction === 'LONG').reduce((a, x) => a + (parseFloat(x.capital_risk_inr) || 0), 0);
    const batch_short = batch_signals.filter((x) => x.direction === 'SHORT').reduce((a, x) => a + (parseFloat(x.capital_risk_inr) || 0), 0);
    const new_short_risk = sizing.capital_risk_inr;
    const total_risk = long_r + short_r + batch_long + batch_short + new_short_risk;
    const short_share = total_risk > 0 ? (short_r + batch_short + new_short_risk) / total_risk : 0;
    if (short_share > config.max_short_risk_share) {
      sizing.shares_to_buy = Math.max(1, Math.floor(sizing.shares_to_buy * 0.85));
      const rps = direction === 'SHORT'
        ? signal.stop_loss - signal.entry_price
        : signal.entry_price - signal.stop_loss;
      sizing.position_value = roundDecimal(sizing.shares_to_buy * signal.entry_price, 2);
      sizing.capital_risk_inr = roundDecimal(sizing.shares_to_buy * rps, 2);
      logger.info(`Signal for ${symbol} directional exposure: short share ${short_share.toFixed(2)} — reduced shares to ${sizing.shares_to_buy}`);
    }
  }

  let entry_degraded = false;
  if (config.entry_freshness_enabled) {
    const eval_candle = await candleModel.findBySymbolAndDate(symbol, date);
    if (eval_candle) {
      const drift = Math.abs(parseFloat(eval_candle.adjusted_close) - parseFloat(signal.entry_price))
        / parseFloat(signal.entry_price);
      const gap_against = is_short
        ? parseFloat(eval_candle.open) < parseFloat(signal.entry_price)
        : parseFloat(eval_candle.open) > parseFloat(signal.entry_price);
      if (drift > config.entry_degraded_drift_pct / 100 && gap_against) {
        entry_degraded = true;
        sizing.shares_to_buy = Math.max(1, Math.floor(sizing.shares_to_buy * 0.9));
        const rps2 = direction === 'SHORT'
          ? signal.stop_loss - signal.entry_price
          : signal.entry_price - signal.stop_loss;
        sizing.position_value = roundDecimal(sizing.shares_to_buy * signal.entry_price, 2);
        sizing.capital_risk_inr = roundDecimal(sizing.shares_to_buy * rps2, 2);
        logger.info(`Signal for ${symbol} entry_degraded: drift=${(drift * 100).toFixed(2)}%`);
      }
    }
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
  const reachability = assessTargetReachability(signal);
  const { ranking_score, ranking_components } = computeRankingScore({
    confidence,
    feature,
    sector_average_rs: sector_avg,
    direction,
    strategy_source: signal.strategy,
  });

  return {
    symbol,
    date,
    signal_type: is_short ? 'SELL' : 'BUY',
    direction,
    execution_type,
    is_executable,
    confidence,
    raw_confidence: pre_calib_confidence,
    confidence_calibrated: confidence_calibrated_flag,
    entry_degraded,
    market_regime: market_regime || null,
    ranking_score,
    ranking_components,
    confidence_tier,
    entry_price: signal.entry_price,
    stop_loss: signal.stop_loss,
    target_price: signal.target_price,
    risk_reward: signal.risk_reward,
    exit_policy: signal.exit_policy,
    max_hold_days: signal.max_hold_days,
    target_reachability_warning: reachability.warning,
    signal_flags: reachability.flags,
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

// Phase A / Fix 2: Dynamic frequency threshold.
// Three modes:
//   HARD_CAP           — legacy (slice by daily_limit, everyone beyond = FREQUENCY_CAP)
//   DYNAMIC_THRESHOLD  — weekly fill raises the confidence floor; no cross-day suppression
//   HYBRID             — dynamic floor + soft absolute cap at target_weekly_signals * hybrid_soft_cap_multiplier
async function selectTopSignals(candidates, date, market_regime = 'BULLISH') {
  if (candidates.length === 0) return [];

  const weekly_count = await signalModel.countByWeek(date);
  const remaining_slots = config.target_weekly_signals - weekly_count;

  let eff_max_per_day = config.max_signals_per_day;
  if (config.regime_frequency_enabled && market_regime) {
    const mult_map = {
      BULLISH: config.freq_mult_bullish,
      BEARISH: config.freq_mult_bearish,
      SIDEWAYS: config.freq_mult_sideways,
      HIGH_VOLATILITY: config.freq_mult_high_vol,
    };
    const m = mult_map[market_regime] ?? 1;
    eff_max_per_day = Math.max(0, Math.floor(config.max_signals_per_day * m));
  }

  candidates.sort((a, b) => {
    const ranking_a = parseFloat(a.ranking_score != null ? a.ranking_score : a.confidence) || 0;
    const ranking_b = parseFloat(b.ranking_score != null ? b.ranking_score : b.confidence) || 0;
    if (ranking_b !== ranking_a) return ranking_b - ranking_a;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.risk_reward - a.risk_reward;
  });

  const mode = (config.frequency_mode || 'HARD_CAP').toUpperCase();

  if (mode === 'HARD_CAP') {
    const daily_limit = Math.min(eff_max_per_day, Math.max(0, remaining_slots));
    logger.info(`Frequency controller [HARD_CAP]: weekly=${weekly_count}/${config.target_weekly_signals}, remaining=${remaining_slots}, daily_limit=${daily_limit}, regime=${market_regime}, candidates=${candidates.length}`);

    if (daily_limit <= 0) {
      for (const c of candidates) {
        await rejectedSignalModel.insertRejected({
          symbol: c.symbol, date: c.date, strategy_source: c.strategy_source,
          reject_stage: 'FREQUENCY_CAP',
          reject_reason: `Weekly target ${config.target_weekly_signals} reached (${weekly_count} this week)`,
          raw_confidence: c.confidence, raw_rr: c.risk_reward,
        });
        await recordBlockedEvent(c, 'MAX_SIGNALS_PER_DAY');
      }
      return [];
    }

    const selected = candidates.slice(0, daily_limit);
    const deferred = candidates.slice(daily_limit);
    for (const c of deferred) {
      await rejectedSignalModel.insertRejected({
        symbol: c.symbol, date: c.date, strategy_source: c.strategy_source,
        reject_stage: 'FREQUENCY_CAP',
        reject_reason: `Ranked #${candidates.indexOf(c) + 1} but daily limit is ${daily_limit}`,
        raw_confidence: c.confidence, raw_rr: c.risk_reward,
      });
      await recordBlockedEvent(c, 'MAX_SIGNALS_PER_DAY');
    }
    return selected;
  }

  // DYNAMIC_THRESHOLD or HYBRID share the same floor computation.
  const target_weekly = Math.max(1, config.target_weekly_signals);
  const week_fill = Math.max(0, Math.min(1.5, weekly_count / target_weekly));
  const dynamic_floor = Math.min(
    config.dynamic_floor_max,
    config.min_confidence + week_fill * config.dynamic_floor_slope_points
  );
  const day_of_week = new Date(date).getDay();
  logger.info(`Frequency controller [${mode}]: weekly=${weekly_count}/${target_weekly}, week_fill=${week_fill.toFixed(2)}, dynamic_floor=${dynamic_floor.toFixed(1)}, dow=${day_of_week}, regime=${market_regime}, candidates=${candidates.length}`);

  const passing = [];
  const deferred = [];
  for (const c of candidates) {
    const score = parseFloat(c.ranking_score != null ? c.ranking_score : c.confidence) || 0;
    if (score >= dynamic_floor) passing.push(c);
    else deferred.push(c);
  }

  for (const c of deferred) {
    const score = parseFloat(c.ranking_score != null ? c.ranking_score : c.confidence) || 0;
    await rejectedSignalModel.insertRejected({
      symbol: c.symbol, date: c.date, strategy_source: c.strategy_source,
      reject_stage: 'FREQUENCY_DYNAMIC_FLOOR',
      reject_reason: `Ranking/confidence ${score.toFixed(1)} below dynamic floor ${dynamic_floor.toFixed(1)} (week_fill=${week_fill.toFixed(2)})`,
      raw_confidence: c.confidence, raw_rr: c.risk_reward,
    });
    await recordBlockedEvent(c, 'DYNAMIC_CONFIDENCE_FLOOR');
  }

  // Enforce absolute daily cap regardless of mode (protects against pathological 20-passing days).
  let limited = passing;
  if (eff_max_per_day > 0 && passing.length > eff_max_per_day) {
    const spill = passing.slice(eff_max_per_day);
    limited = passing.slice(0, eff_max_per_day);
    for (const c of spill) {
      await rejectedSignalModel.insertRejected({
        symbol: c.symbol, date: c.date, strategy_source: c.strategy_source,
        reject_stage: 'FREQUENCY_CAP',
        reject_reason: `Passed dynamic floor but exceeded daily cap ${eff_max_per_day}`,
        raw_confidence: c.confidence, raw_rr: c.risk_reward,
      });
      await recordBlockedEvent(c, 'MAX_SIGNALS_PER_DAY');
    }
  }

  // HYBRID: also enforce a soft weekly absolute ceiling.
  if (mode === 'HYBRID') {
    const hybrid_cap = Math.max(0, Math.floor(target_weekly * config.hybrid_soft_cap_multiplier) - weekly_count);
    if (limited.length > hybrid_cap) {
      const spill = limited.slice(hybrid_cap);
      limited = limited.slice(0, hybrid_cap);
      for (const c of spill) {
        await rejectedSignalModel.insertRejected({
          symbol: c.symbol, date: c.date, strategy_source: c.strategy_source,
          reject_stage: 'FREQUENCY_CAP',
          reject_reason: `HYBRID soft weekly cap reached (${Math.floor(target_weekly * config.hybrid_soft_cap_multiplier)} vs current ${weekly_count})`,
          raw_confidence: c.confidence, raw_rr: c.risk_reward,
        });
        await recordBlockedEvent(c, 'MAX_SIGNALS_PER_DAY');
      }
    }
  }

  logger.info(`Frequency controller [${mode}]: ${candidates.length} candidates → ${limited.length} selected (deferred=${deferred.length})`);
  return limited;
}

async function deduplicateAndGenerate(symbol, date, raw_signals, batch_signals = [], nifty_pcr = null, sentiment_adjustment = 0, vix_close = null, market_regime = null) {
  return buildCandidate(symbol, date, raw_signals, batch_signals, nifty_pcr, sentiment_adjustment, vix_close, market_regime);
}

// Multi-leg aware mapping. signals.status stays at the simple 4-state lifecycle
// (ACTIVE / TARGET_HIT / SL_HIT / EXPIRED). Granular leg detail is persisted on
// paper_trades.exit_reason and signal_outcomes.outcome.
// Mapping policy:
//   - Any clean target hit (including PARTIAL_THEN_TARGET) → TARGET_HIT
//   - Any pure stop without a partial leg → SL_HIT
//   - Any multi-leg variant that closed the remainder at BE / trail / expiry → EXPIRED
//     (the partial already locked at the intermediate — remainder outcome is mixed,
//      so a TARGET_HIT lifecycle label would overstate it.)
//   - VOL_COMPRESSION, EXPIRED, EXPIRED_PENALIZED → EXPIRED
function resolveSignalStatus(exit_reason) {
  if (exit_reason === 'TARGET_HIT' || exit_reason === 'PARTIAL_THEN_TARGET') return 'TARGET_HIT';
  if (exit_reason === 'SL_HIT' || exit_reason === 'TRAILING_STOP_HIT' || exit_reason === 'GAP_STOP') {
    return 'SL_HIT';
  }
  return 'EXPIRED';
}

function resolveOutcomeDate(signal_date, future_candles, evaluation, fallback_date) {
  if (!future_candles || future_candles.length === 0) return fallback_date;
  if (evaluation.gap_open) {
    return formatDate(future_candles[0].date);
  }
  const idx = Math.max(0, (evaluation.days || 1) - 1);
  const candle = future_candles[idx] || future_candles[future_candles.length - 1];
  return candle ? formatDate(candle.date) : fallback_date;
}

async function recordOutcome(signal, evaluation, resolved_at, paper_trade = null) {
  try {
    const feature = await featureModel.findBySymbolAndDate(signal.symbol, formatDate(signal.date));
    const rs_value = feature && feature.relative_strength_vs_nifty != null
      ? parseFloat(feature.relative_strength_vs_nifty)
      : null;
    const expected_entry = parseFloat(signal.entry_price);
    const actual_entry = paper_trade && paper_trade.actual_entry_price != null
      ? parseFloat(paper_trade.actual_entry_price)
      : null;
    const entry_slippage_pct = actual_entry != null && expected_entry > 0
      ? roundDecimal(((actual_entry - expected_entry) / expected_entry) * 100, 4)
      : null;
    await signalOutcomeModel.create({
      signal_id: signal.id,
      outcome: evaluation.exit_reason,
      strategy: signal.strategy_source,
      raw_confidence: signal.raw_confidence != null ? signal.raw_confidence : signal.confidence,
      confidence_bucket: bucketConfidence(signal.raw_confidence != null ? signal.raw_confidence : signal.confidence),
      ranking_score: signal.ranking_score != null ? signal.ranking_score : signal.confidence,
      market_regime: signal.market_regime || null,
      sector: getSector(signal.symbol),
      relative_strength_vs_nifty: rs_value,
      rs_bucket: bucketRelativeStrength(rs_value),
      bars_held: evaluation.bars_held != null ? evaluation.bars_held : null,
      mfe_pct: evaluation.mfe_pct != null ? evaluation.mfe_pct : null,
      mae_pct: evaluation.mae_pct != null ? evaluation.mae_pct : null,
      gap_open_loss: !!evaluation.gap_open,
      partial_exit_hit: !!evaluation.partial_fired,
      partial_pnl_pct: evaluation.partial_pnl_pct != null ? evaluation.partial_pnl_pct : null,
      bars_to_partial: evaluation.partial_exit_day != null ? evaluation.partial_exit_day : null,
      expected_entry_price: expected_entry,
      actual_entry_price: actual_entry,
      entry_slippage_pct,
      paper_trade_pnl_pct: paper_trade && paper_trade.pnl_pct != null ? parseFloat(paper_trade.pnl_pct) : null,
      paper_trade_exit_reason: paper_trade ? paper_trade.exit_reason || null : null,
      features_json: feature || null,
      resolved_at,
    });
  } catch (error) {
    logger.warn(`Failed to record outcome for signal ${signal.id}: ${error.message}`);
  }
}

function buildLegSummary(evaluation) {
  if (!evaluation || !Array.isArray(evaluation.legs) || evaluation.legs.length === 0) return '';
  return evaluation.legs
    .map((leg, idx) => {
      const prefix = leg.kind === 'PARTIAL'
        ? `L${idx + 1} PARTIAL (${Math.round((leg.fraction || 0) * 100)}%)`
        : `L${idx + 1} ${leg.reason}`;
      const pnl = leg.pnl_pct != null ? `${leg.pnl_pct > 0 ? '+' : ''}${leg.pnl_pct.toFixed(2)}%` : '—';
      return `${prefix} @ ₹${leg.price} (${pnl})`;
    })
    .join('\n');
}

async function updateSignalStatuses() {
  const active_signals = await signalModel.findActive();
  let updated = 0;

  for (const signal of active_signals) {
    const latest_candle = await candleModel.findLatestBySymbol(signal.symbol);
    if (!latest_candle) continue;

    const all_candles = await candleModel.findBySymbolAndDateRange(
      signal.symbol,
      formatDate(signal.date),
      formatDate(latest_candle.date)
    );
    const future_candles = all_candles.filter((c) => formatDate(c.date) > formatDate(signal.date));
    if (future_candles.length === 0) continue;

    // Phase C / Fix 6 pre-wiring: pass 60 bars of trailing context (pre-signal) for
    // the Bollinger-bandwidth percentile baseline. Gated by VOL_COMPRESSION_EXIT_ENABLED.
    const trailing_candles = config.vol_compression_exit_enabled
      ? await candleModel.findTrailingBefore(
          signal.symbol,
          formatDate(signal.date),
          config.vol_compression_trailing_window
        ).catch(() => null)
      : null;

    const evaluation = evaluateSignalExit(signal, future_candles, {
      entry_price_override: parseFloat(signal.entry_price),
      trailing_candles: trailing_candles || undefined,
    });

    // Phase A / Fix 1: persist partial-leg data the first time we see it, even if
    // the remainder has not yet resolved. This keeps the signal row truthful and
    // fires the brief partial-exit Telegram alert exactly once (open question #3).
    if (evaluation.partial_fired && !signal.partial_exit_price) {
      const partial_shares = signal.shares_to_buy && evaluation.partial_fraction
        ? Math.floor(parseInt(signal.shares_to_buy, 10) * parseFloat(evaluation.partial_fraction))
        : null;
      const partial_realized_inr = partial_shares != null && evaluation.partial_exit_price != null
        ? roundDecimal(
            partial_shares *
              (signal.direction === 'SHORT'
                ? parseFloat(signal.entry_price) - evaluation.partial_exit_price
                : evaluation.partial_exit_price - parseFloat(signal.entry_price)),
            2
          )
        : null;

      const partial_resolved_at = future_candles[Math.max(0, (evaluation.partial_exit_day || 1) - 1)]
        ? formatDate(future_candles[Math.max(0, (evaluation.partial_exit_day || 1) - 1)].date)
        : null;

      await signalModel.updatePartialExit(signal.id, {
        partial_exit_price: evaluation.partial_exit_price,
        partial_exit_date: partial_resolved_at,
        partial_shares_booked: partial_shares,
        partial_realized_pnl_inr: partial_realized_inr,
        sl_moved_to_breakeven: !!evaluation.sl_moved_to_breakeven,
      });

      if (config.partial_exit_telegram_alerts) {
        await sendTelegramAlert(
          `📈 <b>PARTIAL BOOKED</b> — ${signal.symbol}\n` +
          `Direction: ${signal.direction}\n` +
          `Booked ${partial_shares != null ? partial_shares : '—'} @ ₹${evaluation.partial_exit_price}` +
          (evaluation.partial_pnl_pct != null ? ` (${evaluation.partial_pnl_pct > 0 ? '+' : ''}${evaluation.partial_pnl_pct.toFixed(2)}%)` : '') +
          (evaluation.sl_moved_to_breakeven ? '\nSL moved to BE on remainder.' : '') +
          `\nStrategy: ${signal.strategy_source}`
        );
      }
    }

    if (!evaluation.exit_reason) continue;

    const resolved_at = resolveOutcomeDate(
      signal.date,
      future_candles,
      evaluation,
      formatDate(latest_candle.date)
    );
    const new_status = resolveSignalStatus(evaluation.exit_reason);

    if (new_status) {
      await signalModel.updateStatus(signal.id, new_status, resolved_at);

      if (!signal.is_executable) {
        logger.info(`Signal ${signal.id} (${signal.symbol}) status updated to ${new_status} but outcome not recorded: non-executable (${signal.execution_type})`);
        await recordOutcome(signal, evaluation, resolved_at, null);
        updated++;
        continue;
      }

      if (evaluation.exit_reason === 'EXPIRED') {
        const rough_pnl_pct = evaluation.realistic_entry > 0
          ? ((evaluation.exit_price - evaluation.realistic_entry) / evaluation.realistic_entry) * 100
          : 0;
        const penalty_result = applyExpiredPenalty(evaluation.exit_reason, rough_pnl_pct);
        if (penalty_result.penalty_applied) {
          evaluation.exit_reason = penalty_result.exit_reason;
          evaluation.expired_penalty_pct = penalty_result.penalty_pct;
        }
      }
      const linked_trade = await paperTradeModel.findBySignalId(signal.id);
      await recordOutcome(signal, evaluation, resolved_at, linked_trade);

      // Consolidated final Telegram alert (open question #3) — includes leg summary
      // when the trade went through a partial.
      const leg_summary = buildLegSummary(evaluation);
      const tail = leg_summary ? `\n<b>Legs:</b>\n${leg_summary}` : '';

      if (evaluation.exit_reason === 'PARTIAL_THEN_TARGET') {
        await sendTelegramAlert(
          `🎯 <b>PARTIAL+TARGET</b> — ${signal.symbol}\n` +
          `Direction: ${signal.direction} | Strategy: ${signal.strategy_source}${tail}`
        );
      } else if (evaluation.exit_reason === 'PARTIAL_THEN_TRAIL_STOP') {
        await sendTelegramAlert(
          `🪢 <b>PARTIAL+TRAIL STOP</b> — ${signal.symbol}\n` +
          `Direction: ${signal.direction} | Strategy: ${signal.strategy_source}${tail}`
        );
      } else if (evaluation.exit_reason === 'PARTIAL_THEN_BE_STOP') {
        await sendTelegramAlert(
          `🪜 <b>PARTIAL+BE STOP</b> — ${signal.symbol}\n` +
          `Direction: ${signal.direction} | Strategy: ${signal.strategy_source}${tail}`
        );
      } else if (evaluation.exit_reason === 'PARTIAL_THEN_EXPIRED') {
        await sendTelegramAlert(
          `⌛ <b>PARTIAL+EXPIRED</b> — ${signal.symbol}\n` +
          `Direction: ${signal.direction} | Strategy: ${signal.strategy_source}${tail}`
        );
      } else if (evaluation.exit_reason === 'VOL_COMPRESSION') {
        await sendTelegramAlert(
          `🔻 <b>VOL COMPRESSION EXIT</b> — ${signal.symbol}\n` +
          `Direction: ${signal.direction} | Strategy: ${signal.strategy_source}${tail}`
        );
      } else if (new_status === 'TARGET_HIT') {
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
          `Held: ${signal.max_hold_days || config.holding_period_days} days\n` +
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
