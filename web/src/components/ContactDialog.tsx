import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { addProspect } from "@/api/api";

const formSchema = z.object({
  ProspectName: z.string().min(1, "Prospect name is required"),
  Email: z.string().email("Invalid email address"),
  PHONENUMBER: z.string().optional(),
  MAILINGADDRESS: z.string().optional(),
  MAILINGADDRESSCITYTXZIP: z.string().optional(),
});

const ContactDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { toast } = useToast();
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
    try {
      await addProspect({
        clientName: values.ProspectName,
        email: values.Email,
        phoneNumber: values.PHONENUMBER || "",
        mailingAddress: values.MAILINGADDRESS || "",
        mailingAddressCityTxZip: values.MAILINGADDRESSCITYTXZIP || "",
      });
      toast({
        title: "Received your Interest!",
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      let errorMessage = "Failed to add prospect. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description:
          errorMessage === "Email Already Present"
            ? "This email is already registered. Try a different one."
            : "There was a problem with your request.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center text-blue-600">
            Start Saving on Your Property Taxes Today
          </DialogTitle>
          <div className="text-center space-y-2 mt-4  hidden md:block">
            <p className="text-gray-600 font-medium">
              Join thousands of satisfied property owners who have saved big on
              their taxes
            </p>
            <div className="flex justify-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">✓ No Win, No Fee</span>
              <span className="flex items-center">
                ✓ Average Savings 12-15%
              </span>
              <span className="flex items-center">✓ Expert Representation</span>
            </div>
          </div>
        </DialogHeader>
        <div className="bg-blue-50 p-4 rounded-lg mb-4 hidden md:block">
          <h4 className="font-medium text-blue-800 mb-2">
            Why Register With Us?
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Professional representation at ARB hearings</li>
            <li>• Detailed property value analysis</li>
            <li>• Proven track record of successful appeals</li>
            <li>• Transparent process and regular updates</li>
          </ul>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ProspectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <Input placeholder="Enter Your Name" {...field} />
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
                  <Input placeholder="Enter Email" type="email" {...field} />
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
                  <Input placeholder="Enter Phone Number" {...field} />
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
            <div className="text-xs text-gray-500 text-center mt-2">
              By submitting this form, you'll receive a free consultation with
              our tax experts
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Get Your Free Tax Savings Analysis
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
