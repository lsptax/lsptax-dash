import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { routes } from "@/routes/ROUTES";
import { getSingleProperty } from "@/store/data";
import { PropertyData, Invoice } from "@/types/types";
import { editProperty } from "@/api/api";
import { LoaderCircle } from "lucide-react";
import { formatUSD, cleanNumberInput } from "@/utils/formatCurrency";

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
  cadMailingAddress: z.string().optional().default(""),
  cadCity: z.string().optional().default(""),
  cadZipCode: z.string().optional().default(""),
  cadCounty: z.string().optional().default(""),
  accountNumber: z.string().optional().default(""),
  clientNumber: z.string().optional().default(""),
  contactOwner: z.string().nullable().default(""),
  subcontractOwner: z.string().nullable().default(""),
  bppFee: z.string().optional().default(""),
  flatFee: z.string().optional().default(""),
  isArchived: z.boolean().optional().default(false),
});

interface CompleteSubmission {
  propertyDetails: z.infer<typeof formSchema>;
  yearlyData: Record<number, Omit<TableRow, "year">>;
}

export default function EditProperty() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<
    typeof formSchema
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const propertyId = searchParams.get("propertyId");
  const navigate = useNavigate();
  const years = [2021, 2022, 2023, 2024, 2025];

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
    setLoading(true);
    try {
      // Filter out years with no meaningful data
      const meaningfulYearlyData = tableData.reduce((acc, row) => {
        const { year, ...rowWithoutYear } = row;
        
        // Only check user-editable fields, not calculated fields
        const editableFields = [
          "Protest Date", "BPP Rendered", "BPP Invoice", "BPP Paid",
          "Notice Land Value", "Notice Improvement Value", "Notice Appraised Value",
          "Final Land Value", "Final Improvement Value", "Final Appraised Value",
          "Hearing Date", "Invoice Date", "Under Litigation", "Under Arbitration",
          "Tax Rate", "Paid Date", "Payment Notes", "Ending Market", "Ending Appraised"
        ];
        
        // Check if this year has any meaningful data in editable fields
        const hasData = editableFields.some(field => {
          const value = rowWithoutYear[field as keyof typeof rowWithoutYear];
          if (typeof value === 'boolean') {
            return value === true; // Only include if litigation/arbitration is true
          }
          if (typeof value === 'string') {
            return value.trim() !== '' && value !== '0'; // Exclude empty strings and "0"
          }
          if (typeof value === 'number') {
            return value > 0; // Only include positive numbers
          }
          return false;
        });
        
        if (hasData) {
          acc[year] = rowWithoutYear;
        }
        
        return acc;
      }, {} as Record<number, Omit<TableRow, "year">>);

      const completeSubmission: CompleteSubmission = {
        propertyDetails: pendingValues,
        yearlyData: meaningfulYearlyData,
      };
      
      
      await editProperty(
        propertyId!,
        completeSubmission.propertyDetails,
        completeSubmission.yearlyData
      );

      toast({ title: "Property updated successfully!" });
      setIsDialogOpen(false);
      navigate(routes.properties.view(propertyId));
    } catch (error) {
      toast({ title: "Failed to update property", variant: "destructive" });
    } finally {
      setLoading(false); // Set loading to false after submission
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
          form.reset(property.propertyDetails ?? {});
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

      const noticeLandValue = parseFloat(cleanNumberInput((yearData?.noticeLandValue?.toString()) ?? "")) || 0;
      const noticeImprovementValue =
        parseFloat(cleanNumberInput((yearData?.noticeImprovementValue?.toString()) ?? "")) || 0;
      const noticeAppraisedValue =
        parseFloat(cleanNumberInput((yearData?.noticeAppraisedValue?.toString()) ?? "")) || 0;
      const finalLandValue = parseFloat(cleanNumberInput((yearData?.finalLandValue?.toString()) ?? "")) || 0;
      const finalImprovementValue =
        parseFloat(cleanNumberInput((yearData?.finalImprovementValue?.toString()) ?? "")) || 0;
      const finalAppraisedValue =
        parseFloat(cleanNumberInput((yearData?.finalAppraisedValue?.toString()) ?? "")) || 0;
      const taxRate = parseFloat(cleanNumberInput((yearData?.taxRate?.toString()) ?? "")) || 0;
      const endingMarket = parseFloat(cleanNumberInput((yearData?.endingMarket?.toString()) ?? "")) || 0;
      const endingAppraised = parseFloat(cleanNumberInput((yearData?.endingAppraised?.toString()) ?? "")) || 0;

      // Contingency fee is client-level in v2 ("25" -> 0.25)
      const contingencyFeeString = property?.client?.contingencyFee || "0";
      const contingencyFeePercentage = parseFloat(contingencyFeeString);
      const contingencyFee = contingencyFeePercentage / 100; // Convert to decimal (e.g., 25% -> 0.25)

      const noticeMarketValue = noticeLandValue + noticeImprovementValue;
      const finalMarketValue = finalLandValue + finalImprovementValue;
      const marketReduction = noticeMarketValue - finalMarketValue;
      const appraisedReduction = noticeAppraisedValue - finalAppraisedValue;
      const taxableSavings = marketReduction * (taxRate / 100);
      const invoiceAmount = taxableSavings * contingencyFee;

      const beginningMarket =
        yearData?.underLitigation || yearData?.underArbitration
          ? finalMarketValue
          : 0;
      const beginningAppraised =
        yearData?.underLitigation || yearData?.underArbitration
          ? finalAppraisedValue
          : 0;

      return {
        year,
        "Protest Date": yearData?.protestDate || "",
        "BPP Rendered": yearData?.bppRendered || "",
        "BPP Invoice": yearData?.bppInvoice || "",
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
    if (property?.invoices) {
      setTableData(getInitialTableData(property.invoices));
    }
  }, [property]);

  const [tableData, setTableData] = useState<TableRow[]>(() => getInitialTableData());

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    rowIndex: number,
    columnKey: keyof TableRow
  ) => {
    const { value } = e.target;

    // Clean comma-separated values for numeric fields
    const numericFields = [
      "Notice Land Value", "Notice Improvement Value", "Notice Appraised Value",
      "Final Land Value", "Final Improvement Value", "Final Appraised Value",
      "Tax Rate", "Ending Market", "Ending Appraised"
    ];

    let processedValue = value;
    if (numericFields.includes(columnKey)) {
      processedValue = cleanNumberInput(value);
    }

    // Update the specific field
    setTableData((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, [columnKey]: processedValue } : row
      )
    );

    // Recalculate dependent fields
    recalculateFields(rowIndex);
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
    recalculateFields(rowIndex);
  };

  const recalculateFields = (rowIndex: number) => {
    setTableData((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row; // Only update the current row

        const noticeLandValue = parseFloat(cleanNumberInput(row["Notice Land Value"])) || 0;
        const noticeImprovementValue =
          parseFloat(cleanNumberInput(row["Notice Improvement Value"])) || 0;
        const noticeAppraisedValue =
          parseFloat(cleanNumberInput(row["Notice Appraised Value"])) || 0;
        const finalLandValue = parseFloat(cleanNumberInput(row["Final Land Value"])) || 0;
        const finalImprovementValue =
          parseFloat(cleanNumberInput(row["Final Improvement Value"])) || 0;
        const finalAppraisedValue =
          parseFloat(cleanNumberInput(row["Final Appraised Value"])) || 0;
        const taxRate = parseFloat(cleanNumberInput(row["Tax Rate"])) || 0;
        const endingMarket = parseFloat(cleanNumberInput(row["Ending Market"])) || 0;
        const endingAppraised = parseFloat(cleanNumberInput(row["Ending Appraised"])) || 0;

        // Contingency fee is client-level in v2 (not editable per property)
        const contingencyFeeString = property?.client?.contingencyFee || "0";
        const contingencyFeePercentage = parseFloat(contingencyFeeString);
        const contingencyFee = contingencyFeePercentage / 100;

        // Calculate dependent fields
        const noticeMarketValue = noticeLandValue + noticeImprovementValue;
        const finalMarketValue = finalLandValue + finalImprovementValue;
        const marketReduction = noticeMarketValue - finalMarketValue;
        const appraisedReduction = noticeAppraisedValue - finalAppraisedValue;
        const taxableSavings = marketReduction * (taxRate / 100);
        const invoiceAmount = taxableSavings * contingencyFee; // Use contingencyFee as a number

        const beginningMarket =
          row["Under Litigation"] || row["Under Arbitration"]
            ? finalMarketValue
            : 0;
        const beginningAppraised =
          row["Under Litigation"] || row["Under Arbitration"]
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
        onSubmit={form.handleSubmit(handleSubmit)}
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

            <FormField
              control={form.control}
              name="cadMailingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAD Mailing Address</FormLabel>
                  <Input placeholder="Enter CAD Mailing Address" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cadCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAD City</FormLabel>
                  <Input placeholder="Enter CAD City" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cadZipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAD ZIP Code</FormLabel>
                  <Input placeholder="Enter CAD ZIP Code" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

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

                const isCalculatedField = [
                  "Notice Market Value",
                  "Final Market Value",
                  "Market Reduction",
                  "Appraised Reduction",
                  "Taxable Savings",
                  "Invoice Amount",
                  "Beginning Market",
                  "Beginning Appraised",
                  "Contingency Fee",
                ].includes(key);

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
                        ) : isCalculatedField ? (
                          <input
                            type="text"
                            value={formatUSD(row[key as keyof TableRow] as string)}
                            readOnly
                            className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                          />
                        ) : key === "Tax Rate" ? (
                          <input
                            type="number"
                            step="0.01"
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
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>

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
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>
    </Form>
  );
}
