// src/types.ts

import type { PropertyLifecyclePayload } from "@/types/clientLifecycle";
import type { Hearing } from "@/types/hearings";

export interface CadMailingAddressDisplay {
  line1?: string;
  line2?: string;
  full?: string;
}

export interface ClientData {
  id: number;
  TypeOfAcct?: string;
  typeOfAcct?: string;
  CLIENTNumber?: string;
  clientNumber?: string;
  CLIENTNAME?: string;
  clientName?: string;
  Email?: string;
  email?: string;
  BillingAddress?: string;
  billingAddress?: string;
  BillingEmail?: string;
  billingEmail?: string;
  PHONENUMBER?: string;
  phoneNumber?: string;
  NAMEONCAD?: string;
  nameOnCad?: string;
  MAILINGADDRESS?: string;
  mailingAddress?: string;
  MAILINGADDRESSCITYTXZIP?: string;
  mailingAddressCityTxZip?: string;
  contingencyFee?: string;
  flatFee?: string | number | null;
  notes?: string | null;
  IsArchived?: boolean;
  isArchived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface Property {
  id: number;
  StatusNotes?: string;
  statusNotes?: string;
  OtherNotes?: string;
  otherNotes?: string;
  notes?: string | null;
  NAMEONCAD?: string;
  nameOnCad?: string;
  MAILINGADDRESS?: string;
  mailingAddress?: string;
  MAILINGADDRESSCITYTXZIP?: string;
  mailingAddressCityTxZip?: string;
  propertyAddress?: string;
  CADMailingADDRESS?: string;
  cadMailingAddress?: string;
  CADCITY?: string;
  cadCity?: string;
  CADZIPCODE?: string;
  cadZipCode?: string;
  CADCOUNTY?: string;
  cadCounty?: string;
  cadMailingAddressDisplay?: CadMailingAddressDisplay;
  AccountNumber?: string;
  accountNumber?: string;
  CLIENTNumber?: string;
  clientNumber?: string;
  CONTACTOWNER?: string;
  contactOwner?: string;
  SUBCONTRACTOWNER?: string;
  subcontractOwner?: string;
  BPPFEE?: string;
  bppFee?: string;
  FlatFee?: string;
  flatFee?: string;
  propertyType?: "RESIDENTIAL" | "COMMERCIAL" | "BPP" | "LAND" | null;
  consultantId?: number | null;
  consultant?: { id: number; name: string; email: string; type?: string } | null;
  IsArchived?: boolean;
  isArchived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  invoices?: InvoiceData[];
}

export interface Invoice {
  id: number;
  AccountNumber?: string;
  CLIENTNumber?: string;
  protestDate?: string;
  hearingDate?: string;
  invoiceDate?: string;
  /** Invoice generated date shown on PDF (prefer over invoiceDate). */
  generatedDate?: string;
  /** Payment due date shown on PDF. */
  dueDate?: string;
  bppRendered?: string;
  bppInvoice?: string;
  /** Server-parsed BPP dollars from `bppInvoice`. */
  bppInvoiceAmount?: number;
  bppPaid?: string;
  noticeLandValue?: number;
  noticeImprovementValue?: number;
  noticeMarketValue?: number;
  noticeAppraisedValue?: number;
  finalLandValue?: number;
  finalImprovementValue?: number;
  finalMarketValue?: number;
  finalAppraisedValue?: number;
  marketReduction?: number;
  appraisedReduction?: number;
  taxRate?: number;
  taxableSavings?: number;
  contingencyFee?: number;
  contingencyFeePercent?: number;
  invoiceAmount?: number;
  paidDate?: string;
  isPaid?: boolean;
  paymentMethod?: "ZELLE" | "CASH" | "CHECK" | "CREDIT_CARD" | "OTHER" | null;
  status?: "DRAFT" | "SENT" | "PAID" | "PAST_DUE" | "VOIDED" | "WRITTEN_OFF";
  protestStatus?: "PENDING" | "COMPLETED" | "RESULTS_PENDING" | null;
  protestCompletedDate?: string;
  protestResultDate?: string;
  paymentNotes?: string;
  /** Printed layout: current, arbitration, or homestead. */
  invoiceTemplate?: string | null;
  beginningMarket?: number;
  endingMarket?: number;
  beginningAppraised?: number;
  endingAppraised?: number;
  underLitigation: boolean;
  underArbitration: boolean;
  isArchived: boolean;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export type PaidInvoiceDetail = {
  id: number;
  year: number;
  paidDate?: string | null;
  invoiceAmount: number;
  /** Amount received. Less than invoiceAmount when the payment is partial. */
  amountPaid?: number | null;
  partial?: boolean;
  paymentNotes?: string | null;
  paymentMethod?: "ZELLE" | "CASH" | "CHECK" | "CREDIT_CARD" | "OTHER" | null;
};

export interface InvoiceSummary {
  id: string | number;
  isArchived: boolean;
  clientId: string;
  propertyId?: string | number;
  clientName?: string;
  clientNumber?: string;
  propertyNumber?: string;
  propertyNumbers?: string[];
  invoiceIds?: Array<string | number>;
  /** Year invoices in this row. Archive uses these to touch only the filtered year. */
  yearInvoices?: Array<{ id: string | number; year: number }>;
  invoiceCount?: number;
  paidCount?: number;
  /** Sum of partial payments on invoices in this row that are not paid in full. */
  partialAmount?: number;
  /** True when every year-invoice in this property group is paid. */
  isPaid?: boolean;
  /** Rollup of Draft, Sent, Paid, Past Due, Voided, and Written Off. */
  invoiceStatus?: "DRAFT" | "SENT" | "PAID" | "PAST_DUE" | "VOIDED" | "WRITTEN_OFF";
  /** Paid and partially paid year-invoices — used for the payment detail popover. */
  paidInvoices?: PaidInvoiceDetail[];
  totalInvoiceAmount: number;
  isSent?: boolean;
  lastDelivery?: import("@/utils/invoiceEmailStatus").InvoiceEmailTracking | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceProperty {
  propertyDetails: Property;
  invoice: Invoice[];
}

export interface InvoiceData {
  client: ClientData;
  properties: InvoiceProperty[];
  lastDelivery?: import("@/utils/invoiceEmailStatus").InvoiceEmailTracking | null;
}

export interface PropertyData {
  client: ClientData;
  /** Backend v2 shape uses `client` instead of `clientDetails` */
  propertyDetails: Property;
  invoices: Invoice[];
  /** Protest pipeline state for this property (`GET /api/property`). */
  lifecycle?: PropertyLifecyclePayload | null;
  /** Scheduled hearings (`GET /api/property`). */
  hearings?: Hearing[];
}

export interface Prospect {
  id: number;
  clientName: string;
  email: string;
  phoneNumber: string;
  inquireDate?: string;
  mailingAddress?: string;
  mailingAddressCityTxZip?: string;
  contingencyFee?: string;
  flatFee?: string | number | null;
  billingAddress?: string;
  billingEmail?: string;
  envelopeId?: string;
  isArchived?: boolean;
  status: string;
}
export interface ProspectPropertyData {
  clientDetails: Prospect;
  propertyDetails: Property;
}
