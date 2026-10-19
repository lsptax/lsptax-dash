import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lastManagementUserError, parsePortalUserType } from "./portalUserAdmin.js";

describe("portal user admin", () => {
  it("accepts the four portal roles", () => {
    assert.equal(parsePortalUserType(" Owner "), "owner");
    assert.equal(parsePortalUserType("staff"), "staff");
    assert.equal(parsePortalUserType("guest"), null);
  });

  it("blocks removing the last owner or admin", () => {
    assert.equal(lastManagementUserError("owner", "staff", 0), "Keep at least one owner or admin account.");
    assert.equal(lastManagementUserError("admin", "client", 0), "Keep at least one owner or admin account.");
    assert.equal(lastManagementUserError("owner", "admin", 0), null);
    assert.equal(lastManagementUserError("owner", "staff", 1), null);
    assert.equal(lastManagementUserError("staff", "client", 0), null);
  });
});
