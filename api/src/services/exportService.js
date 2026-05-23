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
