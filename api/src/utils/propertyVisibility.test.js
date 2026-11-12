import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activeHearingPropertyWhere,
  activeOwnedPropertyWhere,
  contactArchivePropertyChange,
  propertyArchiveData,
  propertyVisibilityWhere,
} from "./propertyVisibility.js";

describe("property visibility", () => {
  it("counts a property as active only when the client is active too", () => {
    assert.deepEqual(activeOwnedPropertyWhere(), {
      isArchived: false,
      client: { isArchived: false },
    });
    assert.deepEqual(propertyVisibilityWhere(false), activeOwnedPropertyWhere());
  });

  it("treats properties of an archived client as archived", () => {
    assert.deepEqual(propertyVisibilityWhere(true), {
      OR: [{ isArchived: true }, { client: { isArchived: true } }],
    });
  });

  it("archives only active properties with the client, and restores only those", () => {
    assert.deepEqual(contactArchivePropertyChange(7, true), {
      where: { clientId: 7, isArchived: false },
      data: { isArchived: true, archivedWithClient: true },
    });
    assert.deepEqual(contactArchivePropertyChange(7, false), {
      where: { clientId: 7, archivedWithClient: true },
      data: { isArchived: false, archivedWithClient: false },
    });
    assert.deepEqual(propertyArchiveData(true), {
      isArchived: true,
      archivedWithClient: false,
    });
  });

  it("keeps hearings off properties whose client is archived", () => {
    assert.deepEqual(activeHearingPropertyWhere(), {
      isArchived: false,
      client: { isArchived: false },
    });
    assert.deepEqual(
      activeHearingPropertyWhere({ clientName: { contains: "Ada", mode: "insensitive" } }),
      {
        isArchived: false,
        client: {
          AND: [
            { isArchived: false },
            { clientName: { contains: "Ada", mode: "insensitive" } },
          ],
        },
      }
    );
  });
});
