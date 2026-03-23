const { logger } = require('../../middlewares/logger.middleware');
const { NEGATIVE_KEYWORDS, NEGATION_WORDS } = require('../../config/constants');
const { formatDate } = require('../../utils/date.util');
const config = require('../../config/env');
const { fetchHeadlines } = require('./news.service');
const sentimentFlagModel = require('../../models/sentiment_flag.model');

function hasNearbyNegation(text, keyword) {
  const keyword_idx = text.indexOf(keyword);
  if (keyword_idx === -1) return false;
  const start = Math.max(0, keyword_idx - 40);
  const end = Math.min(text.length, keyword_idx + keyword.length + 40);
  const surrounding = text.substring(start, end);
  return NEGATION_WORDS.some((neg) => surrounding.includes(neg));
}

function scoreSentiment(symbol, headlines) {
  for (const headline of headlines) {
    const title_lower = headline.title.toLowerCase();
    for (const keyword of NEGATIVE_KEYWORDS) {
      if (title_lower.includes(keyword)) {
        if (hasNearbyNegation(title_lower, keyword)) {
          continue;
        }
        return {
          sentiment: 'NEGATIVE',
          headline: headline.title,
          confidence: 'HIGH',
          source: 'GOOGLE_NEWS_RSS',
        };
      }
    }
  }

  return { sentiment: 'NEUTRAL', headline: null, confidence: 'HIGH', source: 'GOOGLE_NEWS_RSS' };
}

async function fetchFinnhubSentiment(symbol) {
  if (!config.finnhub_api_key) return null;

  try {
    const axios = require('axios');
    const to_date = new Date();
    const from_date = new Date(Date.now() - 7 * 86400000);
    const from_str = formatDate(from_date);
    const to_str = formatDate(to_date);

    const clean_symbol = symbol.replace('.NS', '').replace('.BO', '');
    const url = `https://finnhub.io/api/v1/company-news?symbol=${clean_symbol}&from=${from_str}&to=${to_str}&token=${config.finnhub_api_key}`;

    const response = await axios.get(url, { timeout: 5000 });
    const articles = response.data;

    if (!Array.isArray(articles) || articles.length === 0) return null;

    const scores = articles
      .filter((a) => a.sentiment != null)
      .map((a) => a.sentiment);

    if (scores.length === 0) return null;
    return scores.reduce((s, v) => s + v, 0) / scores.length;
  } catch (error) {
    logger.warn(`Finnhub sentiment fetch failed for ${symbol}: ${error.message}`);
    return null;
  }
}

async function filterBySentiment(signal_map) {
  const passed = {};
  const today = formatDate(new Date());

  for (const [symbol, signals] of Object.entries(signal_map)) {
    const headlines = await fetchHeadlines(symbol);
    const result = scoreSentiment(symbol, headlines);

    let final_sentiment = result.sentiment;
    let finnhub_score = null;
    let overridden = false;

    if (result.sentiment === 'NEGATIVE' && config.finnhub_api_key) {
      finnhub_score = await fetchFinnhubSentiment(symbol);
      if (finnhub_score != null && finnhub_score > -0.2) {
        final_sentiment = 'NEUTRAL';
        overridden = true;
        logger.info(`RSS false positive overridden by Finnhub for ${symbol} (score: ${finnhub_score})`);
      }
    }

    await sentimentFlagModel.upsert({
      symbol,
      flag_date: today,
      sentiment: final_sentiment,
      headline: result.headline,
      source: result.source,
      confidence: result.confidence,
      finnhub_score,
      overridden,
    });

    if (final_sentiment === 'NEGATIVE') {
      logger.info(`Signal for ${symbol} suppressed: negative news - ${result.headline}`);
    } else {
      passed[symbol] = signals;
    }
  }

  return passed;
}

module.exports = { scoreSentiment, filterBySentiment, hasNearbyNegation, fetchFinnhubSentiment };
