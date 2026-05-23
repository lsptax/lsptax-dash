import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
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
import { addClient } from "@/api/api";
import { useEffect, useState } from "react";
import { getSingleProspect } from "@/store/data";
import { routes } from "@/routes/ROUTES";

const MoveFromProspect = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const prospectId = searchParams.get("prospectId");

  const formSchema = z.object({
    TypeOfAcct: z.string().optional(),
    CLIENTNumber: z.string().min(1, "Client number is required"),
    CLIENTNAME: z.string().min(1, "Client name is required"),
    Email: z.string().email("Invalid email address"),
    PHONENUMBER: z.string().min(1, "Phone number is required"),
    MAILINGADDRESSCITYTXZIP: z.string().min(1, "City, State, ZIP is required"),
    IsArchived: z.boolean().optional(),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      IsArchived: false,
      CLIENTNAME: "",
      CLIENTNumber: "",
      Email: "",
      PHONENUMBER: "",
      MAILINGADDRESSCITYTXZIP: "",
      TypeOfAcct: "Real",
    },
  });

  useEffect(() => {
    if (!prospectId) {
      setLoading(false);
      setError(
        "Prospect ID is missing. Open this page from a prospect using Move to Client (?prospectId=…)."
      );
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const data = await getSingleProspect({ prospectId });
        if (cancelled) return;
        if (data) {
          form.reset({
            CLIENTNAME: data.prospect.clientName ?? "",
            CLIENTNumber: "",
            Email: data.prospect.email ?? "",
            PHONENUMBER: data.prospect.phoneNumber ?? "",
            MAILINGADDRESSCITYTXZIP: data.prospect.mailingAddressCityTxZip ?? "",
            TypeOfAcct: "Real",
            IsArchived: false,
          });
        } else {
          setError("Prospect not found.");
        }
      } catch (err) {
        console.error("Failed to load prospect data", err);
        if (!cancelled) setError("Error getting prospect details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prospectId, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (values) {
        const data = await addClient({
          clientName: values.CLIENTNAME,
          clientNumber: values.CLIENTNumber,
          email: values.Email,
          phoneNumber: values.PHONENUMBER,
          mailingAddressCityTxZip: values.MAILINGADDRESSCITYTXZIP,
          typeOfAcct: values.TypeOfAcct ?? "Real",
        });

        toast({
          title: "✓ Client added successfully",
        });

        const d = data as {
          client?: { id?: unknown; clientNumber?: string };
          id?: unknown;
        };
        const clientPageParam =
          d?.client?.id != null && String(d.client.id) !== ""
            ? String(d.client.id)
            : d?.id != null && String(d.id) !== ""
              ? String(d.id)
              : values.CLIENTNumber;
        navigate(routes.client.detail(clientPageParam));
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Email Already Present") {
        toast({
          variant: "destructive",
          title: "Email already exists",
          action: <ToastAction altText="Try again">Try again</ToastAction>,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to add client",
          action: <ToastAction altText="Try again">Try again</ToastAction>,
        });
      }
    }
  }
  if (loading) {
    return <div className="text-center text-gray-600">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center">
        <p className="text-lg font-semibold text-red-600">{error}</p>
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
          <h1 className="text-xl font-semibold text-gray-900">
            Moving Prospect to Client
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="CLIENTNAME"
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
            name="CLIENTNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Number</FormLabel>
                <Input {...field} placeholder="User-entered client number" />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="TypeOfAcct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
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
            name="MAILINGADDRESSCITYTXZIP"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <Input {...field} placeholder="City, TX ZIP" />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-8">
          <Button variant="blue" type="submit" className="w-full md:w-auto">
            Add Client
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default MoveFromProspect;
