const neutral_feed = {
  items: [
    {
      title: 'Reliance Industries reports strong Q3 earnings',
      pubDate: new Date().toISOString(),
      link: 'https://example.com/1',
    },
    {
      title: 'Reliance expands retail operations across India',
      pubDate: new Date().toISOString(),
      link: 'https://example.com/2',
    },
  ],
};

const negative_feed = {
  items: [
    {
      title: 'SEBI probe launched into accounting practices',
      pubDate: new Date().toISOString(),
      link: 'https://example.com/3',
    },
    {
      title: 'Company reports normal quarterly results',
      pubDate: new Date().toISOString(),
      link: 'https://example.com/4',
    },
  ],
};

const old_negative_feed = {
  items: [
    {
      title: 'SEBI probe launched into accounting practices',
      pubDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      link: 'https://example.com/5',
    },
  ],
};

module.exports = { neutral_feed, negative_feed, old_negative_feed };
