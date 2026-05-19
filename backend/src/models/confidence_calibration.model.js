const { pool } = require('../config/db');

// Phase B / Fix 3: calibration is now stored as three slice levels per bucket.
// Legacy callers pass no strategy/direction and land on the GLOBAL slice, so
// existing behaviour is preserved verbatim.

const SLICE_GLOBAL = 'GLOBAL';
const SLICE_STRATEGY = 'STRATEGY';
const SLICE_STRATEGY_DIRECTION = 'STRATEGY_DIRECTION';

function normalizeStrategy(strategy) {
  if (!strategy) return '*';
  return String(strategy).toUpperCase();
}

function normalizeDirection(direction) {
  if (!direction) return '*';
  const d = String(direction).toUpperCase();
  return d === 'LONG' || d === 'SHORT' ? d : '*';
}

async function upsertBucket(bucket, total_signals, actual_win_rate, computed_at, opts = {}) {
  const slice_level = opts.slice_level || SLICE_GLOBAL;
  const strategy = normalizeStrategy(opts.strategy);
  const direction = normalizeDirection(opts.direction);

  const sql = `
    INSERT INTO confidence_calibration
        (confidence_bucket, slice_level, strategy, direction, total_signals, actual_win_rate, computed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        total_signals = VALUES(total_signals),
        actual_win_rate = VALUES(actual_win_rate)
  `;
  await pool.query(sql, [bucket, slice_level, strategy, direction, total_signals, actual_win_rate, computed_at]);
}

async function getLatest() {
  const sql = `
    SELECT confidence_bucket, slice_level, strategy, direction, total_signals, actual_win_rate, computed_at
      FROM confidence_calibration
     WHERE slice_level = 'GLOBAL' AND strategy = '*' AND direction = '*'
       AND computed_at = (
         SELECT MAX(computed_at) FROM confidence_calibration
          WHERE slice_level = 'GLOBAL' AND strategy = '*' AND direction = '*'
       )
     ORDER BY confidence_bucket ASC
  `;
  const [rows] = await pool.query(sql);
  return rows;
}

async function getLatestSlices(filters = {}) {
  const params = [];
  const where = [];

  if (filters.slice_level) {
    where.push('slice_level = ?');
    params.push(String(filters.slice_level).toUpperCase());
  }
  if (filters.strategy) {
    where.push('strategy = ?');
    params.push(normalizeStrategy(filters.strategy));
  }
  if (filters.direction) {
    where.push('direction = ?');
    params.push(normalizeDirection(filters.direction));
  }

  const where_sql = where.length > 0 ? `AND ${where.join(' AND ')}` : '';
  const sql = `
    SELECT confidence_bucket, slice_level, strategy, direction, total_signals, actual_win_rate, computed_at
      FROM confidence_calibration
     WHERE computed_at = (SELECT MAX(computed_at) FROM confidence_calibration)
       ${where_sql}
     ORDER BY slice_level ASC, strategy ASC, direction ASC, confidence_bucket ASC
  `;
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findBySlice(confidence_bucket, slice_level, strategy, direction) {
  const sql = `
    SELECT confidence_bucket, slice_level, strategy, direction, total_signals, actual_win_rate, computed_at
      FROM confidence_calibration
     WHERE confidence_bucket = ?
       AND slice_level = ?
       AND strategy = ?
       AND direction = ?
     ORDER BY computed_at DESC
     LIMIT 1
  `;
  const [rows] = await pool.query(sql, [
    confidence_bucket,
    slice_level,
    normalizeStrategy(strategy),
    normalizeDirection(direction),
  ]);
  return rows[0] || null;
}

// Phase B / Fix 3: fallback hierarchy for the per-strategy+direction calibration lookup.
// Signature preserves legacy single-arg behaviour (GLOBAL slice) and accepts optional
// (strategy, direction) to unlock the finer slices.
//
// Order tried (stops at the first slice whose total_signals meets the caller's minimum):
//   1. STRATEGY_DIRECTION  (bucket, strategy, direction)
//   2. STRATEGY            (bucket, strategy, '*')
//   3. GLOBAL              (bucket, '*',       '*')
//
// Returns { confidence_bucket, total_signals, actual_win_rate, slice_level, strategy, direction, computed_at }
// or null if no slice has any data. Callers still apply their own min-sample gate; we
// always return the first non-null slice found so they can log fall-through.
async function findLatestForBucket(confidence_bucket, strategy = null, direction = null) {
  if (strategy) {
    if (direction) {
      const row = await findBySlice(confidence_bucket, SLICE_STRATEGY_DIRECTION, strategy, direction);
      if (row && row.total_signals > 0) return row;
    }
    const strat_row = await findBySlice(confidence_bucket, SLICE_STRATEGY, strategy, '*');
    if (strat_row && strat_row.total_signals > 0) return strat_row;
  }
  return findBySlice(confidence_bucket, SLICE_GLOBAL, '*', '*');
}

module.exports = {
  upsertBucket,
  getLatest,
  getLatestSlices,
  findLatestForBucket,
  findBySlice,
  SLICE_GLOBAL,
  SLICE_STRATEGY,
  SLICE_STRATEGY_DIRECTION,
};
