export const getEmailTemplate = (name, formType = "contract") => {
  const templates = {
    contract: `
Dear ${name},

I hope this message finds you well.

Please review and sign your Client Contract DocuSign request.

This agreement is required to begin representation for your property tax services.

If you have any questions or need assistance, feel free to reach out to us.

Thank you for your prompt attention to this matter.

Best regards,
Hussain Ali
Lone Star Property Tax, LLC
`,
    aoa: `
Dear ${name},

I hope this message finds you well.

Please review and sign your Authorization of Agent (AOA) DocuSign request(s).

These form(s) authorize Lone Star Property Tax, LLC to represent you for the listed property tax matters.

If you have any questions or need assistance, feel free to reach out to us.

Thank you for your prompt attention to this matter.

Best regards,
Hussain Ali
Lone Star Property Tax, LLC
`,
    aoa_multi: `
Dear ${name},

I hope this message finds you well.

Please review and sign the attached Authorization of Agent (AOA) DocuSign request(s) for your properties.

These form(s) authorize Lone Star Property Tax, LLC to represent you for the listed property tax matters.

If you have any questions or need assistance, feel free to reach out to us.

Thank you for your prompt attention to this matter.

Best regards,
Hussain Ali
Lone Star Property Tax, LLC
`,
    all_docs: `
Dear ${name},

I hope this message finds you well.

Please review and sign the attached Client Contract and Authorization of Agent (AOA) form(s).

These documents are required to begin representation for your property tax services and authorize Lone Star Property Tax, LLC to represent you for the listed property tax matters.

If you have any questions or need assistance, feel free to reach out to us.

Thank you for your prompt attention to this matter.

Best regards,
Hussain Ali
Lone Star Property Tax, LLC
`,
  };

  return templates[formType] || templates.contract;
};
