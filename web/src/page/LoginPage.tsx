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
    <div className="flex h-screen w-full items-center justify-center overflow-hidden">
      {/* Left Side  */}
      <div className="flex-1 flex flex-col mt-32 md:justify-center items-center min-h-screen ">
        <div className="md:w-[350px] md:h-[562px] ">
          <div className="flex justify-between items-center w-full mb-12 ">
            <div>
              <NavLink to={"/"}>
                <img className="" src={Logo} alt="Lone Star Property Tax logo" />
              </NavLink>
            </div>
          </div>
          <div>
            <Card className="w-full max-w-md border-none  ">
              <CardHeader className="mb-12">
                <CardDescription>Welcome back!</CardDescription>
                <CardTitle className="text-2xl">Please Login</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8"
                  >
                    <div className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="grid gap-2">
                            <FormLabel htmlFor="email">Email Address</FormLabel>
                            <FormControl>
                              <Input
                                className="w-full"
                                id="email"
                                placeholder="johndoe@mail.com"
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
                          <FormItem className="grid gap-2">
                            <div className="flex justify-between items-center">
                              <FormLabel htmlFor="password">Password</FormLabel>
                              <button
                                type="button"
                                className="text-sm text-blue-600 hover:underline"
                                onClick={() => setShowPassword(!showPassword)} // Toggle password visibility
                              >
                                {showPassword ? "Hide" : "Show"}
                              </button>
                            </div>
                            <FormControl>
                              <Input
                                type={showPassword ? "text" : "password"} // Toggle input type
                                className="w-full"
                                id="password"
                                placeholder="******"
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
                          className="text-sm text-muted-foreground hover:text-primary hover:underline"
                          onClick={(e) => e.preventDefault()}
                        >
                          Forgot password?
                        </a>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary flex items-center justify-center"
                        disabled={loading} // Disable button while loading
                      >
                        {loading ? (
                          <>
                            <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
                            Logging In...
                          </>
                        ) : (
                          "Login"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Right Side  */}
      <img
        className="flex-1 hidden lg:block min-h-screen "
        src={Image}
        alt=""
      />
    </div>
  );
}

