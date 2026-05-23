import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { getSingleClient } from "@/store/data";
import { LoaderCircle } from "lucide-react";
import { editClient } from "@/api/api";
import { routes } from "@/routes/ROUTES";


export default function EditClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Track submission state
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
    const { toast } = useToast();
  const clientId = searchParams.get("clientId");

  const formSchema = z.object({
    TypeOfAcct: z.string().optional(),
    CLIENTNumber: z.string().optional(),
    CLIENTNAME: z.string().min(1, "Client name is required"),
    Email: z.string().email("Invalid email address"),
    BillingEmail: z.string().email("Invalid billing email address").optional(),
    PHONENUMBER: z.string().optional(),
    MAILINGADDRESS: z.string().optional(),
    MAILINGADDRESSCITYTXZIP: z.string().optional(),
    BillingAddress: z.string().optional(),
    contingencyFee: z
      .string()
      .regex(/^\d*$/, "Contingency fee must be numbers only (e.g. 25 for 25%)")
      .optional(),
    IsArchived: z.boolean().optional(),
    useSameAsEmail: z.boolean().default(false),
    useSameAsMailing: z.boolean().default(false),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contingencyFee: "",
      IsArchived: false,
      useSameAsEmail: false,
      useSameAsMailing: false,
    },
  });

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      setError(
        "Client ID is required. Open this page from the clients list with ?clientId=…"
      );
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const data = await getSingleClient({ clientId });
        if (cancelled) return;

        const fields = {
          TypeOfAcct: data?.client.typeOfAcct || "",
          CLIENTNumber: data?.client.clientNumber || "",
          CLIENTNAME: data?.client.clientName || "",
          Email: data?.client.email || "",
          BillingEmail: data?.client.billingEmail || "",
          PHONENUMBER: data?.client.phoneNumber || "",
          MAILINGADDRESS: data?.client.mailingAddress || "",
          MAILINGADDRESSCITYTXZIP: data?.client.mailingAddressCityTxZip || "",
          BillingAddress: data?.client.billingAddress || "",
          contingencyFee: data?.client.contingencyFee ?? "",
          IsArchived: data?.client.isArchived || false,
          useSameAsEmail: false,
          useSameAsMailing: false,
        };

        Object.entries(fields).forEach(([key, value]) => {
          form.setValue(key as keyof typeof fields, value);
        });
      } catch (err) {
        console.error("Failed to load client data", err);
        if (!cancelled) {
          toast({
            title: "Could not load client data. Please try again later.",
            variant: "destructive",
          });
          setError("Error getting client details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, form, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!clientId) {
      toast({
        title: "Missing client ID",
        description: "Cannot save without clientId in the URL.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true); // Set loading state
    try {
      const { useSameAsEmail, useSameAsMailing } = values;
      void useSameAsEmail;
      void useSameAsMailing;

      // API v2 expects camelCase fields in clientDetails
      const clientDetails = {
        clientName: values.CLIENTNAME,
        email: values.Email,
        phoneNumber: values.PHONENUMBER ?? "",
        mailingAddressCityTxZip: values.MAILINGADDRESSCITYTXZIP ?? "",
        typeOfAcct: values.TypeOfAcct ?? "",
        billingEmail: values.BillingEmail ?? "",
        billingAddress: values.BillingAddress ?? "",
        contingencyFee: values.contingencyFee?.trim() || undefined,
      };

      await editClient(clientId, clientDetails);
      toast({ title: "Client updated successfully!" });
      navigate(routes.client.detail(clientId));
    } catch (error) {
      console.error("Failed to update client", error);
      toast({
        title: "Failed to update client. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false); // Reset loading state
    }
  };

  const revertChanges = () => {
    form.reset();
  };

  if (loading) {
    return <div className="text-center text-gray-600">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center">
        <p className="text-lg font-semibold text-red-600">{error}</p>
        <Button asChild variant="outline">
          <Link to={routes.clients.list()}>Back to clients</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 mt-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Edit Client Information
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="CLIENTNAME"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <Input {...field} className="border-gray-300 rounded-lg" />
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
                    type="email"
                    {...field}
                    className="border-gray-300 rounded-lg"
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
                  <FormLabel>Phone Number</FormLabel>
                  <Input {...field} className="border-gray-300 rounded-lg" />
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
                    className="border-gray-300 rounded-lg"
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      field.onChange(v);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="MAILINGADDRESS"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <Input
                    {...field}
                    placeholder="Street Address"
                    className="border-gray-300 rounded-lg"
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
                    className="border-gray-300 rounded-lg"
                    onChange={(e) => {
                      field.onChange(e); // Update the field value
                      // Automatically update BillingAddress if the checkbox is checked
                      if (form.getValues("useSameAsMailing")) {
                        form.setValue(
                          "BillingAddress",
                          `${form.getValues("MAILINGADDRESS")}, ${
                            e.target.value
                          }`
                        );
                      }
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col w-full">
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
                          form.setValue(
                            "BillingEmail",
                            form.getValues("Email")
                          );
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
                    className="border-gray-300 rounded-lg"
                    readOnly={form.getValues("useSameAsEmail")} // Make it read-only if the checkbox is checked
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    className="border-gray-300 rounded-lg"
                    readOnly={form.getValues("useSameAsMailing")} // Make it read-only if the checkbox is checked
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-center gap-4">
            <Button
              type="submit"
              variant="blue"
              className="w-64 flex items-center justify-center"
              disabled={isSubmitting} // Disable button while submitting
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
                  Updating...
                </>
              ) : (
                "Update Client"
              )}
            </Button>
            <Button
              variant="secondary"
              className="w-64"
              onClick={revertChanges}
              disabled={isSubmitting} // Disable revert button while submitting
            >
              Revert Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
