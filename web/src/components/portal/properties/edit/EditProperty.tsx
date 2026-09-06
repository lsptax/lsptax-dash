import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routes } from "@/routes/ROUTES";
import { getSingleProperty } from "@/store/data";
import { PropertyData, Invoice } from "@/types/types";
import { PROPERTY_INVOICE_YEARS } from "../propertyInvoiceYears";
import {
  buildYearlyDataPayload,
  CONTINGENCY_FEE_OPTIONS,
  type YearlyTableRow,
} from "../yearlyDataPayload";
import { editProperty } from "@/api/api";
import { LoaderCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cleanNumberInput } from "@/utils/formatCurrency";
import {
  getBppInvoiceEditValue,
  parseBppInvoiceString,
} from "@/utils/bppInvoice";

type TableRow = {
  year: number;
  "Protest Date": string;
  "BPP Rendered": string;
  "BPP Invoice": string;
  "BPP Paid": string;
  "Notice Land Value": string;
  "Notice Improvement Value": string;
  "Notice Market Value": string;
  "Notice Appraised Value": string;
  "Final Land Value": string;
  "Final Improvement Value": string;
  "Final Market Value": string;
  "Final Appraised Value": string;
  "Market Reduction": string;
  "Appraised Reduction": string;
  "Hearing Date"?: string;
  "Generated Date"?: string;
  "Due Date"?: string;
  "Invoice Date"?: string;
  "Under Litigation": boolean;
  "Under Arbitration": boolean;
  "Tax Rate": string;
  "Taxable Savings": string;
  "Contingency Fee"?: string;
  "Invoice Amount"?: string;
  "Paid Date"?: string;
  "Payment Notes"?: string;
  "Beginning Market": string;
  "Ending Market": string;
  "Beginning Appraised": string;
  "Ending Appraised": string;
};

const formSchema = z.object({
  statusNotes: z.string().nullable().default(""),
  otherNotes: z.string().nullable().default(""),
  nameOnCad: z.string().optional().default(""),
  mailingAddress: z.string().optional().default(""),
  mailingAddressCityTxZip: z.string().optional().default(""),
  propertyAddress: z.string().optional().default(""),
  cadCounty: z.string().optional().default(""),
  accountNumber: z.string().optional().default(""),
  clientNumber: z.coerce.string().optional().default(""),
  contactOwner: z.string().nullable().default(""),
  subcontractOwner: z.string().nullable().default(""),
  bppFee: z.coerce.string().optional().default(""),
  flatFee: z.coerce.string().optional().default(""),
  isArchived: z.boolean().optional().default(false),
});

function mapPropertyDetailsToFormValues(
  details: Record<string, unknown>
): z.infer<typeof formSchema> {
  const str = (value: unknown) => (value == null ? "" : String(value));

  return {
    statusNotes: str(details.statusNotes ?? details.StatusNotes),
    otherNotes: str(details.otherNotes ?? details.OtherNotes),
    nameOnCad: str(details.nameOnCad ?? details.NAMEONCAD),
    mailingAddress: str(details.mailingAddress ?? details.MAILINGADDRESS),
    mailingAddressCityTxZip: str(
      details.mailingAddressCityTxZip ?? details.MAILINGADDRESSCITYTXZIP
    ),
    propertyAddress: str(details.propertyAddress),
    cadCounty: str(details.cadCounty ?? details.CADCOUNTY),
    accountNumber: str(details.accountNumber ?? details.AccountNumber),
    clientNumber: str(details.clientNumber ?? details.CLIENTNumber),
    contactOwner: str(details.contactOwner ?? details.CONTACTOWNER),
    subcontractOwner: str(details.subcontractOwner ?? details.SUBCONTRACTOWNER),
    bppFee: str(details.bppFee ?? details.BPPFEE),
    flatFee: str(details.flatFee ?? details.FlatFee),
    isArchived: Boolean(details.isArchived ?? details.IsArchived ?? false),
  };
}

interface CompleteSubmission {
  propertyDetails: z.infer<typeof formSchema>;
  yearlyData: Record<string, Record<string, unknown>>;
}

function resolveContingencyFee(
  yearData: Invoice | undefined,
  clientDefault: string | undefined,
): string {
  const fromInvoice =
    yearData?.contingencyFee ?? yearData?.contingencyFeePercent;
  if (fromInvoice != null) {
    return String(fromInvoice);
  }
  return clientDefault || "0";
}

const editableNumericFields = [
  "Notice Land Value",
  "Notice Improvement Value",
  "Notice Market Value",
  "Notice Appraised Value",
  "Final Land Value",
  "Final Improvement Value",
  "Final Market Value",
  "Final Appraised Value",
  "Market Reduction",
  "Appraised Reduction",
  "Tax Rate",
  "Taxable Savings",
  "BPP Invoice",
  "Invoice Amount",
  "Beginning Market",
  "Ending Market",
  "Beginning Appraised",
  "Ending Appraised",
];

function parseCurrencyInput(value: unknown): number {
  return parseFloat(cleanNumberInput(value?.toString() ?? "")) || 0;
}

export default function EditProperty() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<
    typeof formSchema
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [cadMailingDisplay, setCadMailingDisplay] = useState("");
  const propertyId = searchParams.get("propertyId");
  const navigate = useNavigate();
  const years = PROPERTY_INVOICE_YEARS;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isArchived: false,
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    setPendingValues(values);
    setIsDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!pendingValues) return;
    setIsSubmitting(true);
    try {
      const yearlyData = buildYearlyDataPayload(tableData as YearlyTableRow[]);

      const completeSubmission: CompleteSubmission = {
        propertyDetails: pendingValues,
        yearlyData,
      };

      await editProperty(
        propertyId!,
        completeSubmission.propertyDetails as Record<string, unknown>,
        completeSubmission.yearlyData,
      );

      toast({ title: "Property updated successfully!" });
      setIsDialogOpen(false);
      navigate(routes.properties.view(propertyId));
    } catch (error) {
      toast({ title: "Failed to update property", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) {
        setError("Property ID is missing");
        setLoading(false);
        return;
      }

      try {
        const property = await getSingleProperty({ propertyId });
        if (property) {
          setProperty(property);
          const display = property.propertyDetails?.cadMailingAddressDisplay;
          setCadMailingDisplay(
            display?.full ||
              [display?.line1, display?.line2].filter(Boolean).join(", ") ||
              [
                property.propertyDetails?.mailingAddress,
                property.propertyDetails?.mailingAddressCityTxZip,
              ]
                .filter(Boolean)
                .join(", "),
          );
          form.reset(
            mapPropertyDetailsToFormValues(
              (property.propertyDetails ?? {}) as Record<string, unknown>
            )
          );
        } else {
          setError("Property not found");
        }
      } catch (err) {
        setError("Failed to fetch property details");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId, form]);

  const getInitialTableData = (invoices: Invoice[] | unknown[] = []): TableRow[] => {
    const list = invoices as Invoice[];
    return years.map((year) => {
      const yearData = list?.find((inv) => inv?.year === year);

      const noticeLandValue = parseCurrencyInput(yearData?.noticeLandValue);
      const noticeImprovementValue = parseCurrencyInput(
        yearData?.noticeImprovementValue,
      );
      const noticeAppraisedValue = parseCurrencyInput(
        yearData?.noticeAppraisedValue,
      );
      const finalLandValue = parseCurrencyInput(yearData?.finalLandValue);
      const finalImprovementValue = parseCurrencyInput(
        yearData?.finalImprovementValue,
      );
      const finalAppraisedValue = parseCurrencyInput(yearData?.finalAppraisedValue);
      const taxRate = parseCurrencyInput(yearData?.taxRate);
      const endingMarket = parseCurrencyInput(yearData?.endingMarket);
      const endingAppraised = parseCurrencyInput(yearData?.endingAppraised);

      // Per-year contingency override, defaulting to client settings
      const contingencyFeeString = resolveContingencyFee(
        yearData,
        property?.client?.contingencyFee,
      );
      const contingencyFeePercentage = parseFloat(contingencyFeeString);
      const contingencyFee = contingencyFeePercentage / 100;

      const noticeMarketValue =
        yearData?.noticeMarketValue != null
          ? parseCurrencyInput(yearData.noticeMarketValue)
          : noticeLandValue + noticeImprovementValue;
      const finalMarketValue =
        yearData?.finalMarketValue != null
          ? parseCurrencyInput(yearData.finalMarketValue)
          : finalLandValue + finalImprovementValue;
      const marketReduction =
        yearData?.marketReduction != null
          ? parseCurrencyInput(yearData.marketReduction)
          : noticeMarketValue - finalMarketValue;
      const appraisedReduction =
        yearData?.appraisedReduction != null
          ? parseCurrencyInput(yearData.appraisedReduction)
          : noticeAppraisedValue - finalAppraisedValue;
      const taxableSavings =
        yearData?.taxableSavings != null
          ? parseCurrencyInput(yearData.taxableSavings)
          : marketReduction * (taxRate / 100);
      const bppAmount = parseBppInvoiceString(getBppInvoiceEditValue(yearData));
      const invoiceAmount =
        yearData?.invoiceAmount != null
          ? parseCurrencyInput(yearData.invoiceAmount)
          : taxableSavings * contingencyFee + bppAmount;

      const beginningMarket =
        yearData?.beginningMarket != null
          ? parseCurrencyInput(yearData.beginningMarket)
          : yearData?.underLitigation || yearData?.underArbitration
            ? finalMarketValue
            : 0;
      const beginningAppraised =
        yearData?.beginningAppraised != null
          ? parseCurrencyInput(yearData.beginningAppraised)
          : yearData?.underLitigation || yearData?.underArbitration
            ? finalAppraisedValue
            : 0;

      return {
        year,
        "Protest Date": yearData?.protestDate || "",
        "BPP Rendered": yearData?.bppRendered || "",
        "BPP Invoice": getBppInvoiceEditValue(yearData),
        "BPP Paid": yearData?.bppPaid || "",
        "Notice Land Value": noticeLandValue.toString(),
        "Notice Improvement Value": noticeImprovementValue.toString(),
        "Notice Market Value": noticeMarketValue.toString(),
        "Notice Appraised Value": noticeAppraisedValue.toString(),
        "Final Land Value": finalLandValue.toString(),
        "Final Improvement Value": finalImprovementValue.toString(),
        "Final Market Value": finalMarketValue.toString(),
        "Final Appraised Value": finalAppraisedValue.toString(),
        "Market Reduction": marketReduction.toString(),
        "Appraised Reduction": appraisedReduction.toString(),
        "Hearing Date": yearData?.hearingDate || "",
        "Generated Date": yearData?.generatedDate || "",
        "Due Date": yearData?.dueDate || "",
        "Invoice Date": yearData?.invoiceDate || "",
        "Under Litigation": yearData?.underLitigation || false,
        "Under Arbitration": yearData?.underArbitration || false,
        "Tax Rate": yearData?.taxRate?.toString() || "0.00",
        "Taxable Savings": taxableSavings.toString(),
        "Contingency Fee": contingencyFeeString,
        "Invoice Amount": invoiceAmount.toString(),
        "Paid Date": yearData?.paidDate || "",
        "Payment Notes": yearData?.paymentNotes || "",
        "Beginning Market": beginningMarket.toString(),
        "Ending Market": endingMarket.toString(),
        "Beginning Appraised": beginningAppraised.toString(),
        "Ending Appraised": endingAppraised.toString(),
      } as TableRow;
    });
  };
  useEffect(() => {
    if (!property) return;
    setTableData(getInitialTableData(property.invoices ?? []));
  }, [property]);

  const [tableData, setTableData] = useState<TableRow[]>(() => getInitialTableData());

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    rowIndex: number,
    columnKey: keyof TableRow
  ) => {
    const { value } = e.target;

    let processedValue = value;
    if (editableNumericFields.includes(columnKey)) {
      processedValue = cleanNumberInput(value);
    }

    // Update the specific field
    setTableData((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, [columnKey]: processedValue } : row
      )
    );

    // Recalculate dependent fields
    recalculateFields(rowIndex, columnKey);
  };

  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    rowIndex: number,
    columnKey: keyof TableRow
  ) => {
    const { checked } = e.target;

    // Update the checkbox field
    setTableData((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, [columnKey]: checked } : row
      )
    );

    // Recalculate dependent fields
    recalculateFields(rowIndex, columnKey);
  };

  const handleContingencyChange = (rowIndex: number, value: string) => {
    setTableData((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, "Contingency Fee": value } : row,
      ),
    );
    recalculateFields(rowIndex, "Contingency Fee");
  };

  const recalculateFields = (rowIndex: number, changedColumnKey: keyof TableRow) => {
    setTableData((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row; // Only update the current row

        const noticeLandValue = parseCurrencyInput(row["Notice Land Value"]);
        const noticeImprovementValue = parseCurrencyInput(
          row["Notice Improvement Value"],
        );
        const noticeMarketValue =
          changedColumnKey === "Notice Land Value" ||
          changedColumnKey === "Notice Improvement Value"
            ? noticeLandValue + noticeImprovementValue
            : parseCurrencyInput(row["Notice Market Value"]);
        const noticeAppraisedValue = parseCurrencyInput(
          row["Notice Appraised Value"],
        );
        const finalLandValue = parseCurrencyInput(row["Final Land Value"]);
        const finalImprovementValue = parseCurrencyInput(
          row["Final Improvement Value"],
        );
        const finalMarketValue =
          changedColumnKey === "Final Land Value" ||
          changedColumnKey === "Final Improvement Value"
            ? finalLandValue + finalImprovementValue
            : parseCurrencyInput(row["Final Market Value"]);
        const finalAppraisedValue = parseCurrencyInput(
          row["Final Appraised Value"],
        );
        const taxRate = parseCurrencyInput(row["Tax Rate"]);
        const endingMarket = parseCurrencyInput(row["Ending Market"]);
        const endingAppraised = parseCurrencyInput(row["Ending Appraised"]);

        // Per-year contingency override (dropdown), defaulting to client settings
        const contingencyFeeString = row["Contingency Fee"] || property?.client?.contingencyFee || "0";
        const contingencyFeePercentage = parseFloat(contingencyFeeString);
        const contingencyFee = contingencyFeePercentage / 100;

        const marketReduction =
          changedColumnKey === "Market Reduction"
            ? parseCurrencyInput(row["Market Reduction"])
            : noticeMarketValue - finalMarketValue;
        const appraisedReduction =
          changedColumnKey === "Appraised Reduction"
            ? parseCurrencyInput(row["Appraised Reduction"])
            : noticeAppraisedValue - finalAppraisedValue;
        const taxableSavings =
          changedColumnKey === "Taxable Savings"
            ? parseCurrencyInput(row["Taxable Savings"])
            : marketReduction * (taxRate / 100);
        const bppAmount = parseBppInvoiceString(row["BPP Invoice"]);
        const invoiceAmount =
          changedColumnKey === "Invoice Amount"
            ? parseCurrencyInput(row["Invoice Amount"])
            : taxableSavings * contingencyFee + bppAmount;

        const beginningMarket =
          changedColumnKey === "Beginning Market"
            ? parseCurrencyInput(row["Beginning Market"])
            : row["Under Litigation"] || row["Under Arbitration"]
              ? finalMarketValue
              : 0;
        const beginningAppraised =
          changedColumnKey === "Beginning Appraised"
            ? parseCurrencyInput(row["Beginning Appraised"])
            : row["Under Litigation"] || row["Under Arbitration"]
              ? finalAppraisedValue
              : 0;

        return {
          ...row,
          "Notice Market Value": noticeMarketValue.toString(),
          "Final Market Value": finalMarketValue.toString(),
          "Market Reduction": marketReduction.toString(),
          "Appraised Reduction": appraisedReduction.toString(),
          "Taxable Savings": taxableSavings.toString(),
          "Invoice Amount": invoiceAmount.toString(),
          "Beginning Market": beginningMarket.toString(),
          "Beginning Appraised": beginningAppraised.toString(),
          "Ending Market": endingMarket.toString(),
          "Ending Appraised": endingAppraised.toString(),
          "Contingency Fee": contingencyFeeString,
        };
      })
    );
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (error)
    return <div className="text-center text-red-500 py-4">{error}</div>;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit, () => {
          toast({
            title: "Could not save property",
            description: "Please check the form for invalid values and try again.",
            variant: "destructive",
          });
        })}
        className="space-y-8 m-2 py-10 px-6 bg-white rounded-lg shadow-lg"
      >
        <div className="border-b pb-4">
          <h1 className="text-xl font-semibold text-gray-800 mb-6">
            Edit Property
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Fields */}
            <FormField
              control={form.control}
              name="nameOnCad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name on CAD</FormLabel>
                  <Input placeholder="Enter Name on CAD" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mailingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mailing Address</FormLabel>
                  <Input placeholder="Enter Mailing Address" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mailingAddressCityTxZip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mailing Address City/State/ZIP</FormLabel>
                  <Input
                    placeholder="Enter Mailing Address City/State/ZIP"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="propertyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Address</FormLabel>
                  <Input placeholder="Enter Property Address" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">CAD Mailing Address</p>
              <p className="text-sm text-muted-foreground rounded-md border border-input bg-muted/40 px-3 py-2 min-h-10">
                {cadMailingDisplay || "—"}
              </p>
            </div>

            <FormField
              control={form.control}
              name="cadCounty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAD County</FormLabel>
                  <Input placeholder="Enter CAD County" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <Input placeholder="Enter Account Number" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Number</FormLabel>
                  <Input
                    readOnly
                    placeholder="Enter Client Number"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactOwner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Owner</FormLabel>
                  <Input
                    placeholder="Enter Contract Owner Name"
                    {...field}
                    value={field.value ?? ""}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subcontractOwner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcontract Owner</FormLabel>
                  <Input
                    placeholder="Enter Subcontract Owner"
                    {...field}
                    value={field.value ?? ""}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="flatFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flat Fee</FormLabel>
                  <Input placeholder="Enter Flat Fee" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>

          {/* Status and Other Notes */}
          <div className="flex mt-4 gap-4 justify-between">
            <FormField
              control={form.control}
              name="statusNotes"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Status Notes</FormLabel>
                  <Input
                    placeholder="Enter Status Notes"
                    {...field}
                    value={field.value ?? ""}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="otherNotes"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Other Notes</FormLabel>
                  <Input
                    placeholder="Enter Other Notes"
                    {...field}
                    value={field.value ?? ""}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Yearly Data Table */}
        <div className="overflow-x-auto mt-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th></th>
                {years.map((year) => (
                  <th
                    key={year}
                    className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.keys(tableData[0]).map((key) => {
                if (key === "year") return null;

                return (
                  <tr key={key}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {key}
                    </td>
                    {tableData.map((row, rowIndex) => (
                      <td
                        key={`${row.year}-${key}`}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {key === "Under Litigation" ||
                        key === "Under Arbitration" ? (
                          <input
                            type="checkbox"
                            checked={row[key as keyof TableRow] as boolean}
                            onChange={(e) =>
                              handleCheckboxChange(
                                e,
                                rowIndex,
                                key as keyof TableRow
                              )
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        ) : key === "Contingency Fee" ? (
                          (() => {
                            const currentPct = row["Contingency Fee"] || "0";
                            const pctNum = Number(currentPct);
                            const options: number[] = CONTINGENCY_FEE_OPTIONS.some(
                              (opt) => opt === pctNum,
                            )
                              ? [...CONTINGENCY_FEE_OPTIONS]
                              : [pctNum, ...CONTINGENCY_FEE_OPTIONS];
                            return (
                          <Select
                            value={currentPct}
                            onValueChange={(value) =>
                              handleContingencyChange(rowIndex, value)
                            }
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((pct) => (
                                <SelectItem key={pct} value={String(pct)}>
                                  {pct}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                            );
                          })()
                        ) : key === "Tax Rate" ? (
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={row[key as keyof TableRow] as string}
                            onChange={(e) =>
                              handleInputChange(
                                e,
                                rowIndex,
                                key as keyof TableRow
                              )
                            }
                            className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={row[key as keyof TableRow] as string}
                            onChange={(e) =>
                              handleInputChange(
                                e,
                                rowIndex,
                                key as keyof TableRow
                              )
                            }
                            className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            className="w-32"
          >
            Reset
          </Button>
          <Button
            type="submit"
            className="w-32 bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
