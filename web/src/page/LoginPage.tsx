import Image from "@/assets/loginPageImage.png";
import Logo from "@/assets/logo.png";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { loginUser } from "@/api/api"; // Assuming you put the function in a utils/api file
import { NavLink, useNavigate } from "react-router-dom";
import { routes } from "@/routes/ROUTES";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const formSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z
        .string()
        .min(6, { message: "Password must be at least 6 characters long" }),
});

export default function LoginPage() {
  const [loading, setLoading] = useState(false); // Track loading state
  const [showPassword, setShowPassword] = useState(false); // Track password visibility
  const { toast } = useToast();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true); // Set loading to true
    try {
      const { email, password } = values;
      const response = await loginUser(email, password);

      // Assuming response contains token and user info
      const { token, user } = response;

      // Store the token in localStorage or cookies
      localStorage.setItem("token", token);

      // Optionally store user info if you need it
      localStorage.setItem("user", JSON.stringify(user));

      // Show success toast
      toast({
        title: "Welcome Back!",
        description: "Login Success",
      });

      navigate(routes.dashboard());
    } catch (error) {
      console.error("Login failed", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem with your request.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    } finally {
      setLoading(false); // Set loading to false after submission
    }
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-[22rem]">
          <NavLink to="/" className="mb-8 inline-block">
            <img className="h-14 w-auto" src={Logo} alt="Lone Star Property Tax logo" />
          </NavLink>
          <Card className="w-full border-border shadow-none">
            <CardHeader className="space-y-1 p-6 pb-2">
              <CardDescription>Welcome back</CardDescription>
              <CardTitle className="text-xl font-semibold tracking-tight">Log in</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel htmlFor="email">Email</FormLabel>
                        <FormControl>
                          <Input
                            id="email"
                            placeholder="you@company.com"
                            type="email"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel htmlFor="password">Password</FormLabel>
                          <button
                            type="button"
                            className="text-sm text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="text-right">
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.preventDefault()}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      "Log in"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
      <img
        className="hidden min-h-screen w-[46%] object-cover lg:block"
        src={Image}
        alt=""
      />
    </div>
  );
}

