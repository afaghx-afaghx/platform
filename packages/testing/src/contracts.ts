export function assertHasKeys(
  value: unknown,
  keys: readonly string[],
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("expected a non-null object");
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (!(key in record)) {
      throw new Error(`missing required key: ${key}`);
    }
  }
}

export function assertString(
  value: unknown,
  label = "value",
): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string`);
  }
}

export function assertNumber(
  value: unknown,
  label = "value",
): asserts value is number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new TypeError(`${label} must be a number`);
  }
}
