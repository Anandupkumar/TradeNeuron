const path = require('path');
const { execFile } = require('child_process');
const { logger } = require('../middlewares/logger.middleware');
const { nifty_50_symbols } = require('../utils/symbols.util');
const { refreshFundamentals } = require('../services/fundamentals/fundamental.service');

const PYTHON_SCRIPT = path.resolve(__dirname, '../../scripts/refresh_fundamentals.py');

const BASE_THROTTLE_MS = 2000;
const JITTER_MS = 500;
const POST_429_COOLDOWN_MS = 60000;
const CONSECUTIVE_429_FULL_STOP_MS = 600000;
const MAX_CONSECUTIVE_429 = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredDelay() {
  const jitter = Math.floor(Math.random() * JITTER_MS * 2) - JITTER_MS;
  return BASE_THROTTLE_MS + jitter;
}

function isRateLimitError(error) {
  if (error.response?.status === 429) return true;
  const msg = error.message || '';
  return msg.includes('429') || msg.includes('Too Many Requests');
}

function runPythonScript() {
  return new Promise((resolve, reject) => {
    const proc = execFile('python3', [PYTHON_SCRIPT], {
      timeout: 600000,
      maxBuffer: 10 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Python script failed (code ${error.code}): ${stderr || error.message}`));
        return;
      }
      resolve(stdout);
    });

    proc.stdout.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('SUMMARY:')) {
          logger.info(`[py-fundamentals] ${line.trim()}`);
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      logger.warn(`[py-fundamentals stderr] ${chunk.toString().trim()}`);
    });
  });
}

function parsePythonSummary(stdout) {
  const lines = stdout.split('\n');
  for (const line of lines) {
    if (line.startsWith('SUMMARY:')) {
      try {
        return JSON.parse(line.slice('SUMMARY:'.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function runNodeJsFallback() {
  logger.info('Running Node.js fallback for weekly fundamentals');
  let success_count = 0;
  let fail_count = 0;
  let consecutive_429s = 0;

  for (const symbol of nifty_50_symbols) {
    try {
      await refreshFundamentals(symbol);
      success_count++;
      consecutive_429s = 0;
      await sleep(jitteredDelay());
    } catch (error) {
      fail_count++;

      if (isRateLimitError(error)) {
        consecutive_429s++;
        logger.warn(`Rate limited on ${symbol} (429 #${consecutive_429s})`);

        if (consecutive_429s >= MAX_CONSECUTIVE_429) {
          logger.warn(`${MAX_CONSECUTIVE_429} consecutive 429s — pausing for 10 minutes`);
          await sleep(CONSECUTIVE_429_FULL_STOP_MS);
          consecutive_429s = 0;
        } else {
          await sleep(POST_429_COOLDOWN_MS);
        }
      } else {
        logger.error(`Fundamental refresh failed for ${symbol}: ${error.message}`);
        await sleep(BASE_THROTTLE_MS);
      }
    }
  }

  logger.info(`Node.js fallback complete. Success: ${success_count}, Failed: ${fail_count}`);
}

async function runWeeklyFundamentals() {
  logger.info('Starting weekly fundamental data refresh');

  try {
    logger.info('Attempting Python yfinance script');
    const stdout = await runPythonScript();
    const summary = parsePythonSummary(stdout);

    if (summary) {
      logger.info(`Python fundamentals complete. Success: ${summary.success}, Failed: ${summary.failed}, Unhealthy: ${summary.unhealthy_count}`);
    } else {
      logger.info('Python fundamentals complete (no summary parsed)');
    }
    return;
  } catch (error) {
    logger.warn(`Python script failed: ${error.message}. Falling back to Node.js`);
  }

  await runNodeJsFallback();
}

module.exports = { runWeeklyFundamentals };
