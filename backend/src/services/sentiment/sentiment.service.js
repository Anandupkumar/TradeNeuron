const axios = require('axios');
const { logger } = require('../../middlewares/logger.middleware');
const { NEGATIVE_KEYWORDS, NEGATION_WORDS } = require('../../config/constants');
const { formatDate } = require('../../utils/date.util');
const config = require('../../config/env');
const { fetchHeadlines } = require('./news.service');
const sentimentFlagModel = require('../../models/sentiment_flag.model');

const FINBERT_URL = process.env.FINBERT_URL || 'http://127.0.0.1:8765';

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

async function queryFinBERT(headlines) {
  try {
    const titles = headlines.map((h) => h.title).filter(Boolean);
    if (titles.length === 0) return null;

    const response = await axios.post(`${FINBERT_URL}/sentiment`, {
      headlines: titles,
    }, { timeout: 10000 });

    return response.data;
  } catch (error) {
    logger.warn(`FinBERT microservice unavailable: ${error.message}`);
    return null;
  }
}

async function fetchFinnhubSentiment(symbol) {
  if (!config.finnhub_api_key) return null;

  try {
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
  const adjustments = {};
  const today = formatDate(new Date());

  for (const [symbol, signals] of Object.entries(signal_map)) {
    const headlines = await fetchHeadlines(symbol);

    let final_sentiment = 'NEUTRAL';
    let matched_headline = null;
    let source = 'GOOGLE_NEWS_RSS';
    let confidence = 'HIGH';
    let finnhub_score = null;
    let overridden = false;
    let is_strongly_negative = false;
    let finbert_aggregate = null;

    const finbert_result = await queryFinBERT(headlines);
    if (finbert_result) {
      source = 'FINBERT';
      finbert_aggregate = finbert_result.aggregate_score;
      if (finbert_result.aggregate_score < -0.6) {
        final_sentiment = 'STRONGLY_NEGATIVE';
        is_strongly_negative = true;
        const worst = finbert_result.results
          .filter((r) => r.label === 'negative')
          .sort((a, b) => a.score - b.score)[0];
        matched_headline = worst ? worst.text : null;
      } else if (finbert_result.aggregate_score < -0.3) {
        final_sentiment = 'NEGATIVE';
        const worst = finbert_result.results
          .filter((r) => r.label === 'negative')
          .sort((a, b) => a.score - b.score)[0];
        matched_headline = worst ? worst.text : null;
      } else if (finbert_result.aggregate_score > 0.3) {
        final_sentiment = 'POSITIVE';
      }
    } else {
      const keyword_result = scoreSentiment(symbol, headlines);
      final_sentiment = keyword_result.sentiment;
      matched_headline = keyword_result.headline;
      source = keyword_result.source;
      confidence = keyword_result.confidence;

      if (final_sentiment === 'NEGATIVE') {
        const neg_count = headlines.filter((h) => {
          const t = h.title.toLowerCase();
          return NEGATIVE_KEYWORDS.some((kw) => t.includes(kw) && !hasNearbyNegation(t, kw));
        }).length;
        if (neg_count >= 3) {
          is_strongly_negative = true;
          final_sentiment = 'STRONGLY_NEGATIVE';
        }
      }
    }

    if (final_sentiment === 'NEGATIVE' && config.finnhub_api_key) {
      finnhub_score = await fetchFinnhubSentiment(symbol);
      if (finnhub_score != null && finnhub_score > -0.2) {
        final_sentiment = 'NEUTRAL';
        overridden = true;
        logger.info(`Negative sentiment overridden by Finnhub for ${symbol} (score: ${finnhub_score})`);
      }
    }

    const stored_sentiment = is_strongly_negative ? 'NEGATIVE' : final_sentiment;
    await sentimentFlagModel.upsert({
      symbol,
      flag_date: today,
      sentiment: stored_sentiment === 'POSITIVE' ? 'NEUTRAL' : stored_sentiment,
      headline: matched_headline,
      source,
      confidence,
      finnhub_score,
      overridden,
    });

    if (is_strongly_negative) {
      logger.info(`Signal for ${symbol} hard-rejected: strongly negative news — ${matched_headline}`);
    } else {
      passed[symbol] = signals;
      if (final_sentiment === 'NEGATIVE') {
        adjustments[symbol] = -12;
        logger.info(`Signal for ${symbol} penalized: negative sentiment (-12 confidence) — ${matched_headline}`);
      } else if (final_sentiment === 'POSITIVE') {
        adjustments[symbol] = 5;
        logger.info(`Signal for ${symbol} boosted: positive sentiment (+5 confidence)`);
      } else {
        adjustments[symbol] = 0;
      }
    }
  }

  return { passed, adjustments };
}

module.exports = { scoreSentiment, filterBySentiment, hasNearbyNegation, fetchFinnhubSentiment, queryFinBERT };
