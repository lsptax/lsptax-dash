import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPropertySearchOrConditions } from "./propertySearch.js";

describe("buildPropertySearchOrConditions", () => {
  it("matches an address and a client name for text", () => {
    const conditions = buildPropertySearchOrConditions("main st");
    assert.ok(conditions.some((condition) => condition.propertyAddress));
    assert.ok(conditions.some((condition) => condition.mailingAddress));
    assert.ok(conditions.some((condition) => condition.client?.clientName));
    assert.equal(conditions.some((condition) => condition.id != null), false);
  });

  it("matches both the property id and the account number for a numeric query", () => {
    const conditions = buildPropertySearchOrConditions("12345");
    assert.ok(conditions.some((condition) => condition.id === 12345));
    assert.ok(conditions.some((condition) => condition.accountNumber));
  });

  it("does not treat an oversized account number as a property id", () => {
    const conditions = buildPropertySearchOrConditions("1234567890123");
    assert.equal(conditions.some((condition) => Object.prototype.hasOwnProperty.call(condition, "id")), false);
    assert.ok(conditions.some((condition) => condition.accountNumber));
  });
});
