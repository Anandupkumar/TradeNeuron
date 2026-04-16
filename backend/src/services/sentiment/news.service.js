const RssParser = require('rss-parser');
const { logger } = require('../../middlewares/logger.middleware');
const config = require('../../config/env');
const { getNewsSearchQuery } = require('../../utils/symbol_search_names.util');

const parser = new RssParser();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHeadlines(symbol) {
  const query = `${getNewsSearchQuery(symbol)}+NSE`;
  const rss_url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const feed = await parser.parseURL(rss_url);
    await sleep(500);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - config.sentiment_lookback_days);

    return feed.items
      .filter((item) => {
        const pub_date = new Date(item.pubDate);
        return pub_date >= cutoff;
      })
      .map((item) => ({
        title: item.title,
        pub_date: item.pubDate,
        link: item.link,
      }));
  } catch (error) {
    logger.warn(`Failed to fetch RSS for ${symbol}: ${error.message}`);
    return [];
  }
}

module.exports = { fetchHeadlines };
