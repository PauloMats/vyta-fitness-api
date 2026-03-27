import { durationToMs } from './time.util';

describe('durationToMs', () => {
  it('converts supported durations', () => {
    expect(durationToMs('45s')).toBe(45_000);
    expect(durationToMs('15m')).toBe(900_000);
    expect(durationToMs('2h')).toBe(7_200_000);
    expect(durationToMs('3d')).toBe(259_200_000);
  });

  it('rejects unsupported formats', () => {
    expect(() => durationToMs('1w')).toThrow('Unsupported duration format: 1w');
    expect(() => durationToMs('bad-value')).toThrow('Unsupported duration format: bad-value');
  });
});
