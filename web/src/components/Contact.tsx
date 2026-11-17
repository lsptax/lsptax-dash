import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ToastAction } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { addProspect } from "@/api/api";
import { LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ContactLinks } from "@/components/landing/ContactLinks";

const formSchema = z.object({
  ProspectName: z.string().min(1, "Prospect name is required"),
  Email: z.string().email("Invalid email address"),
  PHONENUMBER: z.string().optional(),
  MAILINGADDRESS: z.string().optional(),
  MAILINGADDRESSCITYTXZIP: z.string().optional(),
});

const NEXT_STEPS = [
  "We review your property and appraisal details",
  "We contact you to explain your options",
  "You sign up and we handle the protest",
];

const inputClass =
  "h-11 border-site-line bg-white focus-visible:ring-2 focus-visible:ring-site-gold focus-visible:ring-offset-0";

const Contact = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
    <section id="contact" className="scroll-mt-20 bg-site-cream px-4 py-20 sm:px-6 sm:py-24 lg:px-8" aria-labelledby="contact-title">
      <div className="mx-auto grid max-w-[76rem] overflow-hidden rounded-3xl border border-site-line bg-white shadow-xl shadow-site-navy/5 lg:grid-cols-[1fr_1.3fr]">
        <div className="bg-site-navy p-8 text-white sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-site-gold">Get started</p>
          <h2 id="contact-title" className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            Find out if you're paying too much
          </h2>
          <p className="mt-4 leading-relaxed text-white/75">
            Tell us about your property and we'll get back to you with a free review. No savings,
            no fee.
          </p>

          <ol className="mt-8 space-y-4">
            {NEXT_STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm text-white/85">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-site-gold text-xs font-bold text-site-navy">
                  {index + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>

          <ContactLinks
            className="mt-10 space-y-3 border-t border-white/15 pt-8 text-sm text-white/85"
            linkClassName="hover:text-white"
            iconClassName="text-site-gold"
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 p-8 sm:p-10">
            <div>
              <h3 className="font-serif text-2xl font-semibold text-site-navy">Request a free review</h3>
              <p className="mt-1 text-sm text-site-slate">Fields marked * are required.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ProspectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-site-ink">Your name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Smith" autoComplete="name" {...field} className={inputClass} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="Email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-site-ink">Email *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        type="email"
                        autoComplete="email"
                        {...field}
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="PHONENUMBER"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-site-ink">Phone number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(555) 555-5555"
                        type="tel"
                        autoComplete="tel"
                        {...field}
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="MAILINGADDRESS"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-site-ink">Property address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main St, Houston"
                        autoComplete="street-address"
                        {...field}
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              disabled={loading}
              type="submit"
              className="h-12 rounded-full bg-site-navy text-sm font-bold text-white hover:bg-site-navy-2"
            >
              {loading ? (
                <>
                  <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Request my free review"
              )}
            </Button>
            <p className="text-center text-xs text-site-slate">
              See our{" "}
              <Link to="/privacy" className="font-semibold text-site-navy underline underline-offset-2">
                Privacy Policy
              </Link>{" "}
              for how we use your details.
            </p>
          </form>
        </Form>
      </div>
    </section>
  );
};

export default Contact;
