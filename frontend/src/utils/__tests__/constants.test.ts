import { ERROR_MESSAGES, friendlyError, PAGINATION } from '../constants';

describe('friendlyError', () => {
  it('maps Unauthorized to a friendly message', () => {
    const raw = 'Unauthorized';
    expect(friendlyError(raw)).toBe(ERROR_MESSAGES[raw]);
    expect(friendlyError(raw)).toBe(
      'Your API key is invalid or has been rotated. Please re-enter it.',
    );
  });

  it('maps Network Error to a friendly message', () => {
    const raw = 'Network Error';
    expect(friendlyError(raw)).toBe(ERROR_MESSAGES[raw]);
    expect(friendlyError(raw)).toBe(
      'Could not reach the server. Check your connection.',
    );
  });

  it('returns the raw string when there is no mapping', () => {
    const unknown = 'Something completely unknown';
    expect(friendlyError(unknown)).toBe(unknown);
  });
});

describe('PAGINATION', () => {
  it('has the expected default and max page sizes', () => {
    expect(PAGINATION.defaultPageSize).toBe(20);
    expect(PAGINATION.maxPageSize).toBe(100);
  });
});
