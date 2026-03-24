const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { logger } = require('../../middlewares/logger.middleware');
const { DataFetchError } = require('../../utils/errors');
const { nifty_50_symbols } = require('../../utils/symbols.util');
const { formatDate } = require('../../utils/date.util');
const { roundDecimal } = require('../../utils/math.util');

function buildBhavcopyUrl(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `https://archives.nseindia.com/content/historical/EQUITIES/${year}/${month}/cm${day}${month}${year}bhav.csv.zip`;
}

// Bhavcopy symbols don't have .NS suffix
const nifty_bare_symbols = new Set(
  nifty_50_symbols.map((s) => s.replace('.NS', ''))
);

async function fetchBhavcopy(date) {
  const url = buildBhavcopyUrl(date);
  const label = `Bhavcopy for ${formatDate(date)}`;

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'text/csv',
      },
    });

    const csv_text = response.data.toString('utf-8');
    const records = parse(csv_text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const candles = records
      .filter((r) => r.SERIES === 'EQ' && nifty_bare_symbols.has(r.SYMBOL))
      .map((r) => {
        const raw_delivery = parseFloat(r.DELIV_PER || r['DELIV_PER'] || r['DELIVERY PER'] || '');
        const delivery_pct = Number.isFinite(raw_delivery) ? roundDecimal(raw_delivery, 2) : null;
        return {
          symbol: `${r.SYMBOL}.NS`,
          date: formatDate(date),
          open: roundDecimal(parseFloat(r.OPEN)),
          high: roundDecimal(parseFloat(r.HIGH)),
          low: roundDecimal(parseFloat(r.LOW)),
          close: roundDecimal(parseFloat(r.CLOSE)),
          adjusted_close: roundDecimal(parseFloat(r.CLOSE)),
          volume: parseInt(r.TOTTRDQTY, 10) || 0,
          delivery_pct,
          source: 'BHAVCOPY',
        };
      });

    logger.info(`${label}: Parsed ${candles.length} NIFTY 50 candles`);
    return candles;
  } catch (error) {
    throw new DataFetchError(`${label} failed: ${error.message}`);
  }
}

module.exports = { fetchBhavcopy };
