const durationUnits: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function durationToMs(value: string) {
  const matched = /^(\d+)([smhd])$/.exec(value.trim());
  if (!matched) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const [, amount, unit] = matched;
  return Number(amount) * durationUnits[unit];
}
