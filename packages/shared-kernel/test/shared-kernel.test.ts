import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Entity,
  FixedClock,
  Result,
  UuidIdGenerator,
  ValueObject,
  createDomainEvent,
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

test("FixedClock returns independent Date instances", () => {
  const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
  const first = clock.now();
  const second = clock.now();

  assert.notEqual(first, second);
  assert.equal(first.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(second.toISOString(), "2026-01-01T00:00:00.000Z");
});

test("DomainEvent has explicit versioned metadata", () => {
  const event = createDomainEvent(
    "example.created",
    {
      eventId: "evt-1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      eventVersion: 1,
      correlationId: "corr-1",
    },
    { entityId: "entity-1" },
  );

  assert.equal(event.type, "example.created");
  assert.equal(event.metadata.eventVersion, 1);
  assert.equal(event.metadata.correlationId, "corr-1");
  assert.equal(event.payload.entityId, "entity-1");
});

test("UuidIdGenerator emits UUID identifiers", () => {
  const id = new UuidIdGenerator().generate();

  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});
