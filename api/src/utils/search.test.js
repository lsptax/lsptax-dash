import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clientFilterWhere,
  clientNumberSearchTerm,
  invoiceDisplayedClientNumberWhere,
} from "./search.js";

describe("client number search", () => {
  it("reads the number shown in the list and ignores the database id", () => {
    assert.equal(clientNumberSearchTerm("#1510"), "1510");
    assert.equal(clientNumberSearchTerm("1510"), "1510");
    assert.equal(clientNumberSearchTerm("Naeem"), null);

    const where = clientFilterWhere("#1510");
    assert.deepEqual(where, {
      clientNumber: { equals: "1510", mode: "insensitive" },
    });
    assert.equal(JSON.stringify(where).includes('"id"'), false);
  });

  it("matches only the client number an invoice row displays", () => {
    const where = invoiceDisplayedClientNumberWhere("1510");
    assert.deepEqual(where.OR[0], {
      clientNumber: { equals: "1510", mode: "insensitive" },
    });
    assert.deepEqual(where.OR[1].AND[1], {
      property: { client: { clientNumber: { equals: "1510", mode: "insensitive" } } },
    });
  });

  it("keeps a name search on the client name", () => {
    assert.deepEqual(clientFilterWhere("Naeem"), {
      clientName: { contains: "Naeem", mode: "insensitive" },
    });
  });
});
