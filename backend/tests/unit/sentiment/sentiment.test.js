const { scoreSentiment, hasNearbyNegation } = require('../../../src/services/sentiment/sentiment.service');

describe('Sentiment Scoring', () => {
  test('should return NEUTRAL for positive headlines', () => {
    const headlines = [
      { title: 'Company reports record profits in Q3' },
      { title: 'Stock hits all-time high on strong earnings' },
    ];

    const result = scoreSentiment('RELIANCE.NS', headlines);
    expect(result.sentiment).toBe('NEUTRAL');
    expect(result.headline).toBeNull();
  });

  test('should detect fraud keyword', () => {
    const headlines = [
      { title: 'Major fraud discovered in company accounts' },
    ];

    const result = scoreSentiment('RELIANCE.NS', headlines);
    expect(result.sentiment).toBe('NEGATIVE');
    expect(result.headline).toContain('fraud');
    expect(result.confidence).toBe('HIGH');
  });

  test('should detect SEBI probe keyword', () => {
    const headlines = [
      { title: 'SEBI probe launched into insider trading' },
    ];

    const result = scoreSentiment('RELIANCE.NS', headlines);
    expect(result.sentiment).toBe('NEGATIVE');
  });

  test('should be case-insensitive', () => {
    const headlines = [
      { title: 'BANKRUPTCY proceedings initiated against firm' },
    ];

    const result = scoreSentiment('RELIANCE.NS', headlines);
    expect(result.sentiment).toBe('NEGATIVE');
  });

  test('should return NEUTRAL for empty headlines', () => {
    const result = scoreSentiment('RELIANCE.NS', []);
    expect(result.sentiment).toBe('NEUTRAL');
  });

  test('should detect first negative headline and return it', () => {
    const headlines = [
      { title: 'Normal quarterly results announced' },
      { title: 'Rating downgrade by major agency' },
      { title: 'Stock price stable' },
    ];

    const result = scoreSentiment('RELIANCE.NS', headlines);
    expect(result.sentiment).toBe('NEGATIVE');
    expect(result.headline).toContain('downgrade');
  });
});

describe('Negation-Aware Sentiment', () => {
  test('should NOT flag negative when negation word is present nearby', () => {
    const headlines = [
      { title: 'SEBI probe clears company of all charges' },
    ];
    const result = scoreSentiment('RELIANCE.NS', headlines);
    expect(result.sentiment).toBe('NEUTRAL');
  });

  test('should still flag negative when no negation word present', () => {
    const headlines = [
      { title: 'SEBI probe launched into insider trading at firm' },
    ];
    const result = scoreSentiment('RELIANCE.NS', headlines);
    expect(result.sentiment).toBe('NEGATIVE');
  });

  test('should handle dismissed bankruptcy case as neutral', () => {
    const headlines = [
      { title: 'Bankruptcy case dismissed by court' },
    ];
    const result = scoreSentiment('RELIANCE.NS', headlines);
    expect(result.sentiment).toBe('NEUTRAL');
  });
});

describe('hasNearbyNegation', () => {
  test('should detect negation within proximity', () => {
    expect(hasNearbyNegation('sebi probe clears company', 'probe')).toBe(true);
  });

  test('should return false when no negation nearby', () => {
    expect(hasNearbyNegation('sebi probe into trading fraud', 'probe')).toBe(false);
  });
});
