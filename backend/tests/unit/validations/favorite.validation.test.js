const { addFavoriteSchema } = require('../../../src/validations/favorite.validation');

describe('Favorite Validation', () => {
  test('should accept valid NIFTY 50 symbol', () => {
    const { error } = addFavoriteSchema.validate({ symbol: 'RELIANCE.NS' });
    expect(error).toBeUndefined();
  });

  test('should accept symbol with notes', () => {
    const { error } = addFavoriteSchema.validate({
      symbol: 'INFY.NS',
      notes: 'Watching for breakout',
    });
    expect(error).toBeUndefined();
  });

  test('should reject non-NIFTY 50 symbol', () => {
    const { error } = addFavoriteSchema.validate({ symbol: 'INVALID.NS' });
    expect(error).toBeDefined();
  });

  test('should reject missing symbol', () => {
    const { error } = addFavoriteSchema.validate({});
    expect(error).toBeDefined();
  });

  test('should reject notes exceeding 500 chars', () => {
    const { error } = addFavoriteSchema.validate({
      symbol: 'RELIANCE.NS',
      notes: 'x'.repeat(501),
    });
    expect(error).toBeDefined();
  });
});
