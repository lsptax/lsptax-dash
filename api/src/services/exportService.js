import { Parser } from "json2csv";
import XLSX from "xlsx";
import { sendError as sendHttpError } from "../utils/http.js";

/** Send safe standardized error response (no raw error object). */
export const sendError = (res, status, message, err, extras) =>
  sendHttpError(res, status, message, err, extras);

export const convertToXLSX = (data, fields, sheetName) => {
  const filteredData = data.map((item) =>
    fields.reduce((acc, field) => {
      acc[field] = item[field] ?? "";
      return acc;
    }, {})
  );
  const worksheet = XLSX.utils.json_to_sheet(filteredData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

export const convertToCSV = (data, fields) => {
  const parser = new Parser({ fields });
  return parser.parse(data);
};

/** Build an .xlsx buffer with one or more labeled sheets. Empty sheets still include headers. */
export const convertSheetsToXLSX = (sheets) => {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const headers = sheet.fields.map((field) => field.label);
    const rows = (sheet.data || []).map((item) =>
      sheet.fields.map((field) => item[field.value] ?? "")
    );
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

/** Field lists for each entity (XLSX/CSV export). */
export const EXPORT_FIELDS = {
  clients: ["id", "clientName", "email", "phoneNumber", "isArchived", "typeOfAcct"],
  prospects: ["id", "clientName", "email", "phoneNumber", "mailingAddress", "prospectStatus", "isArchived"],
  properties: [
    "id",
    "clientNumber",
    "accountNumber",
    "cadCounty",
    "mailingAddress",
    "mailingAddressCityTxZip",
    "nameOnCad",
    "propertyAddress",
    "cadMailingAddress",
    "cadCity",
    "isArchived",
    "createdAt",
  ],
  invoices: ["id", "clientNumber", "accountNumber", "invoiceAmount", "createdAt", "isArchived"],
};
