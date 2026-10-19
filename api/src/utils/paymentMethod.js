export const PAYMENT_METHOD_VALUES = ["ZELLE", "CASH", "CHECK", "CREDIT_CARD", "OTHER"];

const ALIASES = {
  zelle: "ZELLE",
  cash: "CASH",
  check: "CHECK",
  cheque: "CHECK",
  "credit card": "CREDIT_CARD",
  creditcard: "CREDIT_CARD",
  other: "OTHER",
  others: "OTHER",
};

const LABELS = {
  ZELLE: "Zelle",
  CASH: "Cash",
  CHECK: "Check",
  CREDIT_CARD: "Credit Card",
  OTHER: "Others",
};

function aliasKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Canonical method, or null when the value is empty / "all" / "any". */
export function parsePaymentMethod(value) {
  const key = aliasKey(value);
  if (!key || key === "any" || key === "all") return null;
  if (PAYMENT_METHOD_VALUES.includes(key.toUpperCase().replace(/ /g, "_"))) {
    const compact = key.toUpperCase().replace(/ /g, "_");
    if (PAYMENT_METHOD_VALUES.includes(compact)) return compact;
  }
  return ALIASES[key] || ALIASES[key.replace(/\s+/g, "")] || null;
}

export function requirePaymentMethod(value) {
  const parsed = parsePaymentMethod(value);
  if (!parsed) {
    throw new Error("paymentMethod must be one of: Zelle, Cash, Check, Credit Card, Others");
  }
  return parsed;
}

export function paymentMethodLabel(value) {
  return LABELS[value] || "";
}
