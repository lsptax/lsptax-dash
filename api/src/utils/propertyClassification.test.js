import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { propertyAccountTypeWhere, realOrBppLabel } from "./propertyClassification.js";

describe("property account type filter", () => {
  it("matches only properties typed BPP", () => {
    assert.deepEqual(propertyAccountTypeWhere("bpp"), { propertyType: "BPP" });
  });

  it("matches blank, residential, commercial, and land properties for Real", () => {
    assert.deepEqual(propertyAccountTypeWhere("real"), {
      OR: [
        { propertyType: null },
        { propertyType: { in: ["RESIDENTIAL", "COMMERCIAL", "LAND"] } },
      ],
    });
  });

  it("matches properties that have no type yet", () => {
    assert.deepEqual(propertyAccountTypeWhere("unassigned"), { propertyType: null });
  });

  it("exports residential, commercial, and land as Real, and BPP as BPP", () => {
    assert.equal(realOrBppLabel("RESIDENTIAL"), "Real");
    assert.equal(realOrBppLabel("COMMERCIAL"), "Real");
    assert.equal(realOrBppLabel("LAND"), "Real");
    assert.equal(realOrBppLabel("BPP"), "BPP");
    assert.equal(realOrBppLabel(null), "Real");
  });

  it("does not filter when no account type is selected", () => {
    assert.deepEqual(propertyAccountTypeWhere(null), {});
    assert.deepEqual(propertyAccountTypeWhere(undefined), {});
  });
});
