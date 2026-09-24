export type FixtureFactory<T> = (overrides?: Partial<T>) => T;

export function fixture<T extends object>(
  defaults: T,
): FixtureFactory<T> {
  return (overrides = {}) => ({
    ...defaults,
    ...overrides,
  });
}

export function sequenceFixture<T>(
  factory: (index: number) => T,
  count: number,
): T[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("count must be a non-negative integer");
  }

  return Array.from({ length: count }, (_, index) => factory(index));
}
