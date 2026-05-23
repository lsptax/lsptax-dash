import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addProspectProperty } from "@/api/api";
import { routes } from "@/routes/ROUTES";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

const formSchema = z.object({
  StatusNotes: z.string().optional(),
  OtherNotes: z.string().optional(),
  NAMEONCAD: z.string().optional(),
  MAILINGADDRESS: z.string().optional(),
  MAILINGADDRESSCITYTXZIP: z.string().optional(),
  PropertyAddress: z.string().optional(),
  CADMailingADDRESS: z.string().optional(),
  CADCITY: z.string().optional(),
  CADZIPCODE: z.string().optional(),
  CADCOUNTY: z.string().optional(),
  AccountNumber: z.string().optional(),
  CLIENTNumber: z.string().optional(),
  CONTACTOWNER: z.string().optional(),
  SUBCONTRACTOWNER: z.string().optional(),
  BPPFEE: z.string().optional(),
  CONTINGENCYFee: z.string().optional(),
  FlatFee: z.string().optional(),
  IsArchived: z.boolean().default(false),
});

export default function AddProspectPropertyForm() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const id = searchParams.get("id");
  const [loading, setLoading] = useState(false); // Track loading state

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      IsArchived: false,
      CLIENTNumber: id || "", // Pre-fill client number from URL
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true); // Set loading to true
    try {
      // API v2: camelCase property fields
      const propertyData = {
        accountNumber: values.AccountNumber,
        nameOnCad: values.NAMEONCAD,
        mailingAddress: values.MAILINGADDRESS,
        mailingAddressCityTxZip: values.MAILINGADDRESSCITYTXZIP,
        propertyAddress: values.PropertyAddress,
        statusNotes: values.StatusNotes,
        otherNotes: values.OtherNotes,
        cadMailingAddress: values.CADMailingADDRESS,
        cadCity: values.CADCITY,
        cadZipCode: values.CADZIPCODE,
        cadCounty: values.CADCOUNTY,
        contactOwner: values.CONTACTOWNER,
        subcontractOwner: values.SUBCONTRACTOWNER,
        bppFee: values.BPPFEE,
        contingencyFee: values.CONTINGENCYFee,
        flatFee: values.FlatFee,
      };

      const result = await addProspectProperty({
        id: Number(id!),
        propertyData,
      });

      toast({
        title: "Added Property to Prospect",
      });
      const r = result as { property?: { id?: unknown }; id?: unknown };
      const newPropId = r?.property?.id ?? r?.id;
      if (newPropId != null && String(newPropId) !== "") {
        navigate(routes.prospect.property(String(newPropId)));
      } else {
        navigate(routes.prospect.detail(id!));
      }
    } catch (error) {
      console.error("Error adding property:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    } finally {
      setLoading(false); // Set loading to false after submission
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 m-4 py-10 px-6 bg-white rounded-lg shadow-lg"
      >
        <h1 className="text-xl font-semibold text-gray-800 mb-6">
          Add Property for Prospect : #{id}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="NAMEONCAD"
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
            name="MAILINGADDRESS"
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
            name="MAILINGADDRESSCITYTXZIP"
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
            name="PropertyAddress"
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
            name="CADMailingADDRESS"
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
            name="CADCITY"
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
            name="CADZIPCODE"
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
            name="CADCOUNTY"
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
            name="AccountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number</FormLabel>
                <Input required placeholder="Enter Account Number" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="CLIENTNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prospect Number</FormLabel>
                <Input
                  {...field}
                  readOnly
                  value={id || ""}
                  className="bg-gray-50"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="CONTACTOWNER"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Owner</FormLabel>
                <Input placeholder="Enter Contract Owner" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="SUBCONTRACTOWNER"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subcontract Owner</FormLabel>
                <Input placeholder="Enter Subcontract Owner" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="BPPFEE"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BPP Fee</FormLabel>
                <Input placeholder="Enter BPP Fee" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="CONTINGENCYFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contingency Fee</FormLabel>
                <Input placeholder="Enter Contingency Fee" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="FlatFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Flat Fee</FormLabel>
                <Input placeholder="Enter Flat Fee" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-4 justify-between">
          <FormField
            control={form.control}
            name="StatusNotes"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Status Notes</FormLabel>
                <Input placeholder="Enter Status Notes" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="OtherNotes"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Other Notes</FormLabel>
                <Input placeholder="Enter Other Notes" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="mt-6 w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center"
          disabled={loading} // Disable button while loading
        >
          {loading ? (
            <>
              <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
              Adding Property...
            </>
          ) : (
            "Add Property"
          )}
        </Button>
      </form>
    </Form>
  );
}
