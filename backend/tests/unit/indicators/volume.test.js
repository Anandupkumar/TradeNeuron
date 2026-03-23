const { calculateVolumeSma20, calculateVolumeChange } = require('../../../src/services/indicators/volume.service');

describe('Volume Service', () => {
  test('should return null for first 19 entries', () => {
    const volumes = Array.from({ length: 30 }, () => 1000000);
    const result = calculateVolumeSma20(volumes);

    for (let i = 0; i < 19; i++) {
      expect(result[i]).toBeNull();
    }
    expect(result[19]).toBe(1000000);
  });

  test('volume SMA should be average of last 20', () => {
    const volumes = Array.from({ length: 25 }, (_, i) => (i + 1) * 100000);
    const result = calculateVolumeSma20(volumes);

    const expected = (volumes.slice(0, 20).reduce((s, v) => s + v, 0)) / 20;
    expect(result[19]).toBe(Math.round(expected));
  });

  test('volume change should be 0 when volume equals SMA', () => {
    const volumes = Array.from({ length: 25 }, () => 1000000);
    const sma = calculateVolumeSma20(volumes);
    const change = calculateVolumeChange(volumes, sma);

    expect(change[19]).toBeCloseTo(0, 4);
  });

  test('volume change should be positive when volume exceeds SMA', () => {
    const volumes = Array.from({ length: 25 }, () => 1000000);
    volumes[24] = 2000000;
    const sma = calculateVolumeSma20(volumes);
    const change = calculateVolumeChange(volumes, sma);

    // SMA at 24 includes the spike, so it's 1050000. Change = (2M - 1.05M) / 1.05M ≈ 0.905
    expect(change[24]).toBeGreaterThan(0.8);
    expect(change[24]).toBeLessThan(1.0);
  });
});
