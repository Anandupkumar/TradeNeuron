/**
 * Seeds the nifty50_composition table with the current NIFTY 50 constituents.
 * Sets added_date to 2020-01-01 (approximate) since we don't have exact historical data yet.
 * Expand this data over time from NSE index factsheets.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');
const { nifty_50_symbols } = require('../src/utils/symbols.util');

async function seed() {
  console.log(`Seeding ${nifty_50_symbols.length} symbols into nifty50_composition...`);

  const sql = `
    INSERT INTO nifty50_composition (symbol, added_date, removed_date)
    VALUES (?, ?, NULL)
    ON DUPLICATE KEY UPDATE symbol = symbol
  `;

  for (const symbol of nifty_50_symbols) {
    await pool.query(sql, [symbol, '2020-01-01']);
  }

  console.log('Done.');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
