import longdog from "@/assets/longdog.png";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ErrorAlert from "@/components/ErrorAlert";
import GoogleIcon from "@/components/GoogleIcon";
import GithubIcon from "@/components/GithubIcon";

// redirect to dashboard if already logged in
export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return;
    if (context.auth.user) {
      throw redirect({ to: "/dashboard", search: { redirect: location.href } });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <title>squi.sh — Login</title>
      <div className="font-sans w-full flex flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-4xl">
          <LoginForm />
        </div>
      </div>
    </>
  );
}

function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const { login, loginWithProvider } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleLogin}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold font-mono">
                  Log in to continue.
                </h1>

                <p className="text-balance text-muted-foreground">
                  View and track your URL metrics.
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="me@example.com"
                  required
                  className="bg-background"
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>

                <div className="w-full max-w-sm space-y-2">
                  <div className="relative">
                    <Input
                      className="bg-background"
                      id="password-toggle"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </Field>

              <Field>
                <Button type="submit">Login</Button>
              </Field>

              {error && <ErrorAlert message={error} />}

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>

              <Field className="grid grid-cols-3 gap-4">
                <Button variant="outline" type="button" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Login with Apple</span>
                </Button>

                <Button
                  variant="outline"
                  type="button"
                  onClick={() => loginWithProvider("google")}
                >
                  <GoogleIcon />
                  <span className="sr-only">Login with Google</span>
                </Button>

                <Button
                  variant="outline"
                  type="button"
                  onClick={() => loginWithProvider("github")}
                >
                  <GithubIcon />
                  <span className="sr-only">Login with Github</span>
                </Button>
              </Field>

              <FieldDescription className="text-center">
                Don&apos;t have an account? <Link to="/signup"> Sign up </Link>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="relative hidden bg-muted md:block">
            <img
              src={longdog}
              alt="Image"
              className="absolute inset-0 right-20 m-auto dark:brightness-[0.8]"
            />
          </div>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
