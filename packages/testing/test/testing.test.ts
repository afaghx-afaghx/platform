import assert from "node:assert/strict";
import test from "node:test";
import {
  assertHasKeys,
  assertNumber,
  assertString,
  fixture,
  mockJsonResponse,
  mockRequest,
  mockResponse,
  sequenceFixture,
} from "../src/index.ts";

test("fixture applies deterministic overrides", () => {
  const user = fixture({ id: "u-1", active: true });
  assert.deepEqual(user({ active: false }), { id: "u-1", active: false });
  assert.deepEqual(user(), { id: "u-1", active: true });
});

test("sequenceFixture creates stable indexed fixtures", () => {
  assert.deepEqual(
    sequenceFixture((index) => ({ id: `item-${index}` }), 3),
    [{ id: "item-0" }, { id: "item-1" }, { id: "item-2" }],
  );
  assert.throws(() => sequenceFixture(() => null, -1), RangeError);
});

test("mock request and response helpers preserve boundaries", () => {
  const request = mockRequest({
    method: "POST",
    path: "/v1/test",
    headers: { "x-test": "1" },
    body: { ok: true },
  });
  const response = mockJsonResponse({ ok: true });
  assert.equal(request.method, "POST");
  assert.equal(response.status, 200);
  assert.equal(response.headers["content-type"], "application/json");
  assert.deepEqual(mockResponse(response).body, { ok: true });
});

test("contract assertions validate stable shapes", () => {
  const value: unknown = { id: "u-1", name: "Ada", count: 2 };
  assertHasKeys(value, ["id", "name"]);
  assertString(value.id, "id");
  assertNumber(value.count, "count");
  assert.throws(() => assertString(42, "id"), TypeError);
  assert.throws(() => assertHasKeys(null, ["id"]), TypeError);
});
