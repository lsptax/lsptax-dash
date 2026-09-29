import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeLike, parseGlobalSearch } from "./globalSearch.js";

describe("escapeLike", () => {
  it("escapes like wildcards and the escape character", () => {
    assert.equal(escapeLike("100%_!"), "100!%!_!!");
  });
});

describe("parseGlobalSearch", () => {
  it("ignores blank input and a single letter", () => {
    assert.equal(parseGlobalSearch("  "), null);
    assert.equal(parseGlobalSearch("a"), null);
    assert.equal(parseGlobalSearch(null), null);
  });

  it("parses a number as an id and a contains pattern", () => {
    const parsed = parseGlobalSearch("123");
    assert.ok(parsed);
    assert.equal(parsed.id, 123);
    assert.equal(parsed.like, "%123%");
    assert.equal(parsed.prefix, "123%");
    assert.equal(parsed.isNumeric, true);
    assert.equal(parsed.useContains, true);
    assert.equal(parsed.strippedLike, null);
  });

  it("keeps the numeric id when the query has leading zeros", () => {
    const parsed = parseGlobalSearch("00123");
    assert.ok(parsed);
    assert.equal(parsed.id, 123);
    assert.equal(parsed.like, "%00123%");
    assert.equal(parsed.strippedLike, "%123%");
  });

  it("does not treat an oversized account number as a row id", () => {
    const parsed = parseGlobalSearch("1234567890123");
    assert.ok(parsed);
    assert.equal(parsed.id, null);
    assert.equal(parsed.isNumeric, true);
    assert.equal(parsed.like, "%1234567890123%");
  });

  it("allows a one-digit id lookup without a contains search", () => {
    const parsed = parseGlobalSearch("7");
    assert.ok(parsed);
    assert.equal(parsed.id, 7);
    assert.equal(parsed.useContains, false);
    assert.equal(parsed.prefix, "7%");
  });

  it("treats #231 as a client-number lookup, not a search for the hash", () => {
    const parsed = parseGlobalSearch("#231");
    assert.ok(parsed);
    assert.equal(parsed.q, "#231");
    assert.equal(parsed.term, "231");
    assert.equal(parsed.clientNumberOnly, true);
    assert.equal(parsed.id, null);
    assert.equal(parsed.prefix, "231%");
    assert.equal(parsed.useContains, false);
    assert.equal(parsed.like.includes("#"), false);
  });

  it("keeps a non-numeric hash query as plain text", () => {
    const parsed = parseGlobalSearch("#main");
    assert.ok(parsed);
    assert.equal(parsed.clientNumberOnly, false);
    assert.equal(parsed.term, "#main");
    assert.equal(parsed.like, "%#main%");
  });

  it("escapes wildcards inside the pattern", () => {
    const parsed = parseGlobalSearch("100%_!");
    assert.ok(parsed);
    assert.equal(parsed.like, "%100!%!_!!%");
    assert.equal(parsed.id, null);
  });
});
