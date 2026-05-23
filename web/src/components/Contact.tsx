import { useToast } from "@/hooks/use-toast";
import { useState } from "react"; 
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
import { addProspect } from "@/api/api";
import { LoaderCircle } from "lucide-react";

const formSchema = z.object({
  ProspectName: z.string().min(1, "Prospect name is required"),
  Email: z.string().email("Invalid email address"),
  PHONENUMBER: z.string().optional(),
  MAILINGADDRESS: z.string().optional(),
  MAILINGADDRESSCITYTXZIP: z.string().optional(),
});

const Contact = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false); // Track loading state
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ProspectName: "",
      Email: "",
      PHONENUMBER: "",
      MAILINGADDRESS: "",
      MAILINGADDRESSCITYTXZIP: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await addProspect({
        clientName: String(values.ProspectName ?? "").trim(),
        email: String(values.Email ?? "").trim(),
        phoneNumber: values.PHONENUMBER ? String(values.PHONENUMBER).trim() : "",
        mailingAddress: values.MAILINGADDRESS ? String(values.MAILINGADDRESS).trim() : "",
        mailingAddressCityTxZip: values.MAILINGADDRESSCITYTXZIP ? String(values.MAILINGADDRESSCITYTXZIP).trim() : "",
      });
      toast({
        title: "Great! We'll be in touch soon to start your savings journey.",
      });
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add prospect. Please try again.";
      const isEmailExists = /already|already present|duplicate|exists/i.test(errorMessage);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: isEmailExists
          ? "This email is already registered. Try a different one."
          : errorMessage,
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      id="contact"
      className="bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center p-8 m-4 rounded-xl shadow-lg"
    >
      <div className="text-center max-w-2xl mb-8">
        <h1 className="text-3xl font-semibold text-blue-800 mb-4">
          Start Your Property Tax Savings Journey
        </h1>
        <p className="text-gray-600 mb-4">
          Join thousands of property owners who have successfully reduced their
          tax burden
        </p>
        <div className="flex justify-center flex-wrap gap-4 text-sm text-gray-700 mb-6">
          <span className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
            ✓ No Win, No Fee
          </span>
          <span className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
            ✓ Average Savings 12-15%
          </span>
          <span className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
            ✓ Expert Representation
          </span>
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <div className="bg-blue-50 p-6 rounded-t-xl border-b border-blue-100">
          <h4 className="font-medium text-blue-800 mb-3">
            Why Choose Our Services?
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-700">
            <div>• Professional ARB hearing representation</div>
            <div>• Detailed property value analysis</div>
            <div>• Proven success track record</div>
            <div>• Transparent process & updates</div>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 bg-white p-10 rounded-b-xl shadow-md border border-gray-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="ProspectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Your Name
                    </FormLabel>
                    <Input
                      placeholder="Enter Your Name"
                      {...field}
                      className="border-gray-300 focus:ring-2 focus:ring-blue-400 transition"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="Email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Email
                    </FormLabel>
                    <Input
                      placeholder="Enter Email"
                      type="email"
                      {...field}
                      className="border-gray-300 focus:ring-2 focus:ring-blue-400 transition"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="PHONENUMBER"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Phone Number
                    </FormLabel>
                    <Input
                      placeholder="Enter Phone Number"
                      {...field}
                      className="border-gray-300 focus:ring-2 focus:ring-blue-400 transition"
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
                    <FormLabel className="text-gray-700 font-medium">
                      Property Address
                    </FormLabel>
                    <Input
                      placeholder="Enter Property Address"
                      {...field}
                      className="border-gray-300 focus:ring-2 focus:ring-blue-400 transition"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="text-center text-sm text-gray-600 mt-4">
              Get your free property tax assessment today!
            </div>

            <Button
              disabled={loading}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg shadow-md transition-all"
            >
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
                  Submitting...
                </>
              ) : (
                "Start Saving Taxes"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default Contact;
