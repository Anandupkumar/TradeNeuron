const { pool } = require('../../config/db');
const { getSector, nifty_50_symbols } = require('../../utils/symbols.util');

/**
 * Average peer relative_strength_vs_nifty for the sector on a given date (NIFTY-50 universe).
 */
async function getSectorAverageRelativeStrength(date, sector) {
  if (!sector || sector === 'Unknown') return null;
  const peers = nifty_50_symbols.filter((s) => getSector(s) === sector);
  if (peers.length === 0) return null;
  const ph = peers.map(() => '?').join(',');
  const sql = `
    SELECT AVG(relative_strength_vs_nifty) AS a
    FROM features
    WHERE date = ? AND symbol IN (${ph})
      AND relative_strength_vs_nifty IS NOT NULL
  `;
  const [rows] = await pool.query(sql, [date, ...peers]);
  const v = rows[0]?.a;
  return v != null ? parseFloat(v) : null;
}

module.exports = { getSectorAverageRelativeStrength };
