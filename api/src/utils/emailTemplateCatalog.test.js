import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getEmailTemplateDefinition,
  renderEmailTemplate,
  validateEmailTemplateInput,
} from "./emailTemplateCatalog.js";
import {
  renderInvoiceEmailHtml,
  renderInvoiceEmailSubject,
} from "./invoiceEmailTemplate.js";
import {
  renderPaymentAcknowledgementHtml,
  renderPaymentAcknowledgementSubject,
} from "./paymentAcknowledgementEmailTemplate.js";

describe("email template rendering", () => {
  it("keeps the built-in invoice email wording and fills placeholders", () => {
    const definition = getEmailTemplateDefinition("invoice_delivery");
    const subject = renderInvoiceEmailSubject(definition.subject, {
      year: 2026,
      propertyAddresses: ["123 Main St"],
    });
    const html = renderInvoiceEmailHtml(definition.bodyHtml, {
      clientName: "Mrs. Jane Smith",
      year: 2026,
      propertyAddresses: ["123 Main St", "123 Main St"],
      logoUrl: "",
    });

    assert.equal(
      subject,
      "2026 Protest Completed- Invoice and Results Attached (123 Main St property)"
    );
    assert.match(html, /Dear Jane Smith/);
    assert.match(
      html,
      /2026 Protest Completed- Invoice and Results Attached \(123 Main St property\)/
    );
    assert.match(html, /Zelle:/);
    assert.match(html, /713-505-6806/);
    assert.match(html, /CONFIDENTIALITY NOTICE/);
    assert.equal(html.includes("<img"), false);
  });

  it("escapes client data in the HTML body and inserts the logo as markup", () => {
    const definition = getEmailTemplateDefinition("invoice_delivery");
    const html = renderInvoiceEmailHtml(definition.bodyHtml, {
      clientName: "<Jane & Co>",
      year: 2026,
      propertyAddresses: ['1 "Main" & Oak'],
      logoUrl: "https://cdn.example.com/logo.png?x=1&y=2",
    });

    assert.match(html, /Dear &lt;Jane &amp; Co&gt;/);
    assert.match(html, /1 &quot;Main&quot; &amp; Oak property/);
    assert.match(
      html,
      /src="https:\/\/cdn\.example\.com\/logo\.png\?x=1&amp;y=2"/
    );
    assert.equal(html.includes("<Jane"), false);
  });

  it("keeps the built-in payment acknowledgement wording", () => {
    const definition = getEmailTemplateDefinition("payment_acknowledgement");
    const subject = renderPaymentAcknowledgementSubject(definition.subject);
    const html = renderPaymentAcknowledgementHtml(definition.bodyHtml, {
      clientName: "Jane Smith",
      paymentAmount: 1250,
      propertyAddresses: [],
    });

    assert.equal(subject, "Payment Received -Thank You");
    assert.match(html, /Dear Jane Smith/);
    assert.match(html, /payment of \$1,250\.00 for your property/);
  });

  it("leaves the subject as plain text", () => {
    const subject = renderEmailTemplate(
      "Invoice for {{clientName}}",
      { clientName: "Jane & Co" },
      { escape: false }
    );
    assert.equal(subject, "Invoice for Jane & Co");
  });
});

describe("validateEmailTemplateInput", () => {
  it("requires a single-line subject and a body", () => {
    const missing = validateEmailTemplateInput({ subject: "  ", bodyHtml: "" });
    assert.deepEqual(missing.errors, ["Subject is required", "Email body is required"]);

    const multiline = validateEmailTemplateInput({
      subject: "Hello\nthere",
      bodyHtml: "<p>Hi</p>",
    });
    assert.deepEqual(multiline.errors, ["Subject must be a single line"]);
  });

  it("trims saved copy", () => {
    const result = validateEmailTemplateInput({
      subject: "  Thanks  ",
      bodyHtml: "  <p>Hello</p>  ",
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.subject, "Thanks");
    assert.equal(result.bodyHtml, "<p>Hello</p>");
  });
});
