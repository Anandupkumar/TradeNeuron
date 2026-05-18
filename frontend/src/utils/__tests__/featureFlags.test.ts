import { featureFlags } from '../featureFlags';

describe('featureFlags', () => {
  it('canAccessPaperTrading returns a boolean', () => {
    expect(typeof featureFlags.canAccessPaperTrading()).toBe('boolean');
  });

  it('canAccessBacktest returns a boolean', () => {
    expect(typeof featureFlags.canAccessBacktest()).toBe('boolean');
  });

  it('canAccessReports returns a boolean', () => {
    expect(typeof featureFlags.canAccessReports()).toBe('boolean');
  });

  it('showShortDirection returns a boolean', () => {
    expect(typeof featureFlags.showShortDirection()).toBe('boolean');
  });

  it('showDirectionFilter returns a boolean', () => {
    expect(typeof featureFlags.showDirectionFilter()).toBe('boolean');
  });

  it('showBearishRegime returns a boolean', () => {
    expect(typeof featureFlags.showBearishRegime()).toBe('boolean');
  });

  it('includeShortSignals returns a boolean', () => {
    expect(typeof featureFlags.includeShortSignals()).toBe('boolean');
  });
});
