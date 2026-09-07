import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseSettingsPatch,
  serializeSettings,
  applySettingValues,
} from "./appSettings.js";

describe("parseSettingsPatch", () => {
  it("updates safer fields and ignores API keys", () => {
    const { updates, errors } = parseSettingsPatch({
      brevo: {
        senderEmail: "results@lsptax.com",
        senderName: "LSPT Results",
        apiKey: "xkeysib-should-be-ignored",
      },
      docusign: {
        clientId: "should-be-ignored",
        accountId: "should-be-ignored",
        userId: "should-be-ignored",
        allowDemoInProduction: true,
      },
    });
    assert.equal(errors.length, 0);
    assert.deepEqual(
      updates.map((row) => row.key).sort(),
      [
        "BREVO_INVOICE_SENDER_EMAIL",
        "BREVO_INVOICE_SENDER_NAME",
        "DOCUSIGN_ALLOW_DEMO_IN_PRODUCTION",
      ]
    );
  });

  it("stores toggles as env-style strings", () => {
    const { updates } = parseSettingsPatch({
      docusign: {
        allowDemoInProduction: true,
        allowMultipleClientContractSends: false,
      },
    });
    const byKey = Object.fromEntries(updates.map((row) => [row.key, row.value]));
    assert.equal(byKey.DOCUSIGN_ALLOW_DEMO_IN_PRODUCTION, "1");
    assert.equal(byKey.ALLOW_MULTIPLE_CLIENT_CONTRACT_SENDS, "false");
  });

  it("rejects empty required infrastructure fields", () => {
    const { updates, errors } = parseSettingsPatch({
      brevo: { senderEmail: "   " },
      supabase: { url: "" },
      docusign: { authServer: "", restBaseUrl: "https://demo.docusign.net/restapi" },
    });
    assert.equal(updates.length, 1);
    assert.equal(updates[0].key, "DOCUSIGN_REST_BASE_URL");
    assert.deepEqual(errors.sort(), ["authServer cannot be empty", "senderEmail cannot be empty", "url cannot be empty"]);
  });

  it("allows clearing optional string fields", () => {
    const { updates, errors } = parseSettingsPatch({
      brevo: { senderName: "", smsSender: "", invoiceLogoUrl: "" },
    });
    assert.equal(errors.length, 0);
    assert.deepEqual(
      updates.map((row) => row.key).sort(),
      ["BREVO_INVOICE_SENDER_NAME", "BREVO_SMS_SENDER", "INVOICE_EMAIL_LOGO_URL"]
    );
    assert.ok(updates.every((row) => row.value === ""));
  });
});

describe("serializeSettings", () => {
  it("returns grouped values from process.env without secrets", () => {
    applySettingValues([
      { key: "BREVO_INVOICE_SENDER_EMAIL", value: "results@lsptax.com" },
      { key: "BREVO_API_KEY", value: "secret-key-1234" },
    ]);
    const settings = serializeSettings();
    assert.equal(settings.brevo.senderEmail, "results@lsptax.com");
    assert.equal(settings.brevo.apiKey, undefined);
  });
});
