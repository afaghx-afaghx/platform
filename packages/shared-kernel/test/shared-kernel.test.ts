import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Entity,
  FixedClock,
  Result,
  SystemClock,
  UuidIdGenerator,
  ValueObject,
} from "../src/index.js";

class TestEntity extends Entity<string> {}

class TestValue extends ValueObject<{ code: string; amount: number }> {
  public constructor(code: string, amount: number) {
    super({ code, amount });
  }
}

test("Result represents explicit success and failure", () => {
  const success = Result.ok(42);
  const failure = Result.fail("invalid");

  assert.equal(success.ok, true);
  assert.equal(success.value, 42);
  assert.equal(failure.ok, false);
  assert.equal(failure.error, "invalid");
});

test("Entity equality is identity-based", () => {
  const first = new TestEntity("same-id");
  const second = new TestEntity("same-id");
  const third = new TestEntity("other-id");

  assert.equal(first.equals(first), true);
  assert.equal(first.equals(second), true);
  assert.equal(first.equals(third), false);
});

test("ValueObject equality is structural for primitive properties", () => {
  const first = new TestValue("A", 10);
  const second = new TestValue("A", 10);
  const third = new TestValue("A", 11);

  assert.equal(first.equals(second), true);
  assert.equal(first.equals(third), false);
  assert.deepEqual(first.toPrimitives(), { code: "A", amount: 10 });
});

test("ValueObject equality rejects different property shapes", () => {
  class TestOtherValue extends ValueObject<{ code: string }> {
    public constructor(code: string) {
      super({ code });
    }
  }

  const first = new TestValue("A", 10);
  const other = new TestOtherValue("A");

  assert.equal(first.equals(other as unknown as TestValue), false);
});

test("FixedClock returns independent Date instances", () => {
  const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
  const first = clock.now();
  const second = clock.now();

  assert.notEqual(first, second);
  assert.equal(first.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(second.toISOString(), "2026-01-01T00:00:00.000Z");
});

test("SystemClock returns a valid current Date", () => {
  const before = Date.now();
  const now = new SystemClock().now().getTime();
  const after = Date.now();

  assert.equal(Number.isFinite(now), true);
  assert.equal(now >= before, true);
  assert.equal(now <= after, true);
});

test("Shared Kernel does not expose a duplicate DomainEvent contract", async () => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const sourceRoot = path.resolve(new URL("../src/index.js", import.meta.url).pathname, "..");
  const entries = await fs.readdir(sourceRoot);
  assert.equal(entries.includes("domain-event.ts"), false);
  assert.equal(
    contentHasDomainEventExport(await fs.readFile(path.join(sourceRoot, "index.ts"), "utf8")),
    false,
  );
});

function contentHasDomainEventExport(source: string): boolean {
  return /domain-event|\bDomainEvent\b|createDomainEvent/.test(source);
}

test("UuidIdGenerator emits UUID identifiers", () => {
  const id = new UuidIdGenerator().generate();

  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});
