export const PAYMENT_METHODS = [
  { value: "ZELLE", label: "Zelle" },
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "OTHER", label: "Others" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export type PaymentMethodFilter = "any" | PaymentMethod;

const METHOD_VALUES = new Set<string>(PAYMENT_METHODS.map((method) => method.value));

export function isPaymentMethod(value: string | null | undefined): value is PaymentMethod {
  return Boolean(value && METHOD_VALUES.has(value));
}

export function paymentMethodLabel(value?: string | null): string {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label ?? "";
}
