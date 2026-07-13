import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Link as IconLink, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import ErrorAlert from "@/components/ErrorAlert";
import GoogleIcon from "@/components/GoogleIcon";
import GithubIcon from "@/components/GithubIcon";

export const Route = createFileRoute("/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <title>squi.sh — Sign Up</title>
      <div className="font-sans w-full flex flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">
          <SignupForm />
        </div>
      </div>
    </>
  );
}

function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const { signup, loginWithProvider } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await signup(email, password);
      navigate({ to: "/links" });
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  };
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSignup}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              to="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <IconLink className="size-6" />
              </div>
              <span className="sr-only">squish - URL Shortener</span>
            </Link>

            <h1 className="text-xl font-bold font-mono">
              squish - URL Shortener
            </h1>

            <FieldDescription>
              Create an account to access URL metrics and more.
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              className="bg-background"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="me@example.com"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
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
            <Button type="submit">Create Account</Button>
          </Field>

          {error && <ErrorAlert message={error} />}

          <FieldSeparator>Or</FieldSeparator>

          <Field className="grid gap-4 sm:grid-cols-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => loginWithProvider("google")}
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <Button
              variant="outline"
              type="button"
              onClick={() => loginWithProvider("github")}
            >
              <GithubIcon />
              Continue with Github
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center">
        Already have an account? <Link to="/login">Sign in</Link>
      </FieldDescription>
    </div>
  );
}
