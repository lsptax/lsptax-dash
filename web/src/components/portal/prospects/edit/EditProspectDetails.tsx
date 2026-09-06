import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getSingleProspect } from "@/store/data";
import { editProspect } from "@/api/api";
import { routes } from "@/routes/ROUTES";

const formSchema = z.object({
  TypeOfAcct: z.string().optional(),
  ProspectName: z.string().min(1, "Prospect name is required"),
  Email: z.string().email("Invalid email address"),
  BillingEmail: z.string().email("Invalid billing email address"),
  PHONENUMBER: z.string().min(1, "Phone number is required"),
  MAILINGADDRESS: z.string().min(1, "Mailing Address is required"),
  MAILINGADDRESSCITYTXZIP: z.string().min(1, "City, State, ZIP is required"),
  BillingAddress: z.string().min(1, "City, State, ZIP is required"),
  contingencyFee: z
    .string()
    .regex(/^\d*$/, "Contingency fee must be numbers only (e.g. 25 for 25%)")
    .optional(),
  flatFee: z
    .string()
    .regex(/^\d*\.?\d*$/, "Flat fee must be a valid number")
    .optional(),
  IsArchived: z.boolean().optional(),
  useSameAsMailing: z.boolean().default(false),
  useSameAsEmail: z.boolean().default(false),
});

export default function EditProspectDetails() {
  const [searchParams] = useSearchParams();
  const prospectId = searchParams.get("prospectId");
  const navigate = useNavigate();

  const { toast } = useToast();
  const [loading, setLoading] = useState(false); // Track loading state
  const [initialLoading, setInitialLoading] = useState(true); // Track initial data loading
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ProspectName: "",
      Email: "",
      BillingEmail: "",
      PHONENUMBER: "",
      MAILINGADDRESS: "",
      MAILINGADDRESSCITYTXZIP: "",
      BillingAddress: "",
      contingencyFee: "",
      flatFee: "",
      useSameAsMailing: false,
      useSameAsEmail: false,
    },
  });
  // Fetch prospect details and pre-fill the form
  useEffect(() => {
    async function fetchProspectDetails() {
      try {
        if (prospectId) {
          const data = await getSingleProspect({ prospectId: prospectId }); // Replace with actual API call
          form.reset({
            TypeOfAcct: data.prospect.typeOfAcct || "",
            ProspectName: data.prospect.clientName || "",
            Email: data.prospect.email || "",
            BillingEmail: data.prospect.billingEmail || "",
            PHONENUMBER: data.prospect.phoneNumber || "",
            MAILINGADDRESS: data.prospect.mailingAddress || "",
            MAILINGADDRESSCITYTXZIP:
              data.prospect.mailingAddressCityTxZip || "",
            BillingAddress: data.prospect.billingAddress || "",
            contingencyFee: data.prospect.contingencyFee ?? "",
            flatFee: data.prospect.flatFee != null ? String(data.prospect.flatFee) : "",
            useSameAsMailing: false,
            useSameAsEmail: false,
          });
        }
      } catch (error) {
        console.error("Failed to load prospect details:", error);
        toast({
          variant: "destructive",
          title: "Failed to load prospect details",
          description: "Please try again later.",
        });
      } finally {
        setInitialLoading(false);
      }
    }

    fetchProspectDetails();
  }, [prospectId, form, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!prospectId) {
      toast({
        variant: "destructive",
        title: "Missing prospect",
        description: "Cannot save without a prospect ID in the URL.",
      });
      return;
    }
    setLoading(true);
    try {
      const { useSameAsMailing, useSameAsEmail, ...rest } = values;
      const prospectDetails: Record<string, unknown> = {
        clientName: rest.ProspectName,
        email: rest.Email,
        billingEmail: rest.BillingEmail,
        phoneNumber: rest.PHONENUMBER,
        mailingAddress: rest.MAILINGADDRESS,
        mailingAddressCityTxZip: rest.MAILINGADDRESSCITYTXZIP,
        billingAddress: rest.BillingAddress,
        typeOfAcct: rest.TypeOfAcct,
        contingencyFee: rest.contingencyFee?.trim() || undefined,
        flatFee: rest.flatFee?.trim() || undefined,
      };
      await editProspect(prospectId, prospectDetails);
      toast({
        title: "✓ Prospect updated successfully",
      });
      navigate(routes.prospect.detail(prospectId));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update prospect",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    } finally {
      setLoading(false); // Set loading to false after submission
    }
  }

  if (initialLoading) {
    return (
      <div className="flex justify-center h-full items-center py-20">
        <LoaderCircle className="animate-spin w-16 h-16 text-blue-500" />
      </div>
    );
  }

  if (!prospectId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center">
        <p className="text-lg font-semibold text-red-600">
          Prospect ID is required
        </p>
        <p className="text-muted-foreground max-w-md">
          Open edit prospect from the prospects list so the URL includes{" "}
          <code className="text-sm bg-muted px-1 rounded">?prospectId=…</code>
          .
        </p>
        <Button asChild variant="outline">
          <Link to={routes.prospects.list()}>Back to prospects</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Edit Prospect</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ProspectName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <Input {...field} placeholder="Full name" />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="Email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <Input
                  {...field}
                  type="email"
                  placeholder="email@example.com"
                  onChange={(e) => {
                    field.onChange(e); // Update the field value
                    // Automatically update BillingEmail if the checkbox is checked
                    if (form.getValues("useSameAsEmail")) {
                      form.setValue("BillingEmail", e.target.value);
                    }
                  }}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="PHONENUMBER"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <Input {...field} placeholder="+1 (555) 000-0000" />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contingencyFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contingency Fee (%)</FormLabel>
                <Input
                  {...field}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 25"
                  onChange={(e) => {
                    field.onChange(e.target.value.replace(/\D/g, ""));
                  }}
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
                <FormLabel>Flat Fee ($, optional)</FormLabel>
                <Input
                  {...field}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="e.g. 2500"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="MAILINGADDRESS"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address</FormLabel>
                <Input
                  {...field}
                  placeholder="Street Address"
                  onChange={(e) => {
                    field.onChange(e); // Update the field value
                    // Automatically update BillingAddress if the checkbox is checked
                    if (form.getValues("useSameAsMailing")) {
                      form.setValue(
                        "BillingAddress",
                        `${e.target.value}, ${form.getValues(
                          "MAILINGADDRESSCITYTXZIP"
                        )}`
                      );
                    }
                  }}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="MAILINGADDRESSCITYTXZIP"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City, State, ZIP</FormLabel>
                <Input
                  {...field}
                  placeholder="City, TX ZIP"
                  onChange={(e) => {
                    field.onChange(e); // Update the field value
                    // Automatically update BillingAddress if the checkbox is checked
                    if (form.getValues("useSameAsMailing")) {
                      form.setValue(
                        "BillingAddress",
                        `${form.getValues("MAILINGADDRESS")}, ${e.target.value}`
                      );
                    }
                  }}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="TypeOfAcct"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Account Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Real">Real</SelectItem>
                    <SelectItem value="BPP">BPP</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col w-full">
          <h2 className="text-lg font-semibold text-gray-800 my-2">
            Prospect Info
          </h2>

          {/* Checkbox for using the same email */}
          <FormField
            control={form.control}
            name="useSameAsEmail"
            render={({ field }) => {
              const email = form.watch("Email");
              const isDisabled = !email; // Disable if the normal email is empty

              return (
                <FormItem className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="useSameAsEmail"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked); // Update the checkbox value
                      if (e.target.checked) {
                        // Set BillingEmail to the value of Email
                        form.setValue("BillingEmail", form.getValues("Email"));
                      }
                    }}
                    className="mr-2"
                    disabled={isDisabled} // Disable the checkbox if the normal email is empty
                  />
                  <FormLabel
                    htmlFor="useSameAsEmail"
                    className={`text-gray-700 ${
                      isDisabled ? "opacity-50" : ""
                    }`} // Add opacity for disabled state
                  >
                    Use the same email for billing
                  </FormLabel>
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="BillingEmail"
            render={({ field }) => (
              <FormItem className="mt-2">
                <FormLabel>Billing Email</FormLabel>
                <Input
                  {...field}
                  type="email"
                  placeholder="billing@example.com"
                  readOnly={form.getValues("useSameAsEmail")} // Make it read-only if the checkbox is checked
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Checkbox for using the same address */}
          <FormField
            control={form.control}
            name="useSameAsMailing"
            render={({ field }) => {
              const mailingAddress = form.watch("MAILINGADDRESS");
              const mailingAddressCityTxZip = form.watch(
                "MAILINGADDRESSCITYTXZIP"
              );
              const isDisabled = !mailingAddress || !mailingAddressCityTxZip; // Disable if either field is empty

              return (
                <FormItem className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="useSameAsMailing"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked); // Update the checkbox value
                      if (e.target.checked) {
                        // Set BillingAddress to the combination of MAILINGADDRESS and MAILINGADDRESSCITYTXZIP
                        form.setValue(
                          "BillingAddress",
                          `${form.getValues(
                            "MAILINGADDRESS"
                          )}, ${form.getValues("MAILINGADDRESSCITYTXZIP")}`
                        );
                      }
                    }}
                    className="mr-2"
                    disabled={isDisabled} // Disable the checkbox if required fields are empty
                  />
                  <FormLabel
                    htmlFor="useSameAsMailing"
                    className={`text-gray-700 ${
                      isDisabled ? "opacity-50" : ""
                    }`} // Add opacity for disabled state
                  >
                    Use the same address for billing
                  </FormLabel>
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="BillingAddress"
            render={({ field }) => (
              <FormItem className="mt-2">
                <FormLabel>Billing Address</FormLabel>
                <Input
                  {...field}
                  placeholder="Street, City, TX ZIP"
                  readOnly={form.getValues("useSameAsMailing")} // Make it read-only if the checkbox is checked
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-8">
          <Button
            type="submit"
            className="w-full md:w-auto flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700"
            disabled={loading} // Disable button while loading
          >
            {loading ? (
              <>
                <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
                Updating Prospect...
              </>
            ) : (
              "Update Prospect"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
