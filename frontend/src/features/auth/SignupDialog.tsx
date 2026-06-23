import { useState, type Dispatch, type SetStateAction } from "react";
import { IconUserCircle } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@tanstack/react-router";

import { Dialog, Checkbox } from "radix-ui";
import { SignupButton } from "@/components/Navbar";
import PasswordField from "@/features/auth/PasswordField";
import GoogleButton from "@/features/auth/GoogleButton";
import DialogError from "./DialogError";

export default function SignupDialog({
  open,
  setOpen,
  toggleLogin,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  toggleLogin: Dispatch<SetStateAction<boolean>>;
}) {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // const validateInput = () => {};

  // Submit sign up form to server.
  // If successful, close dialog, then navigate to dashboard
  // If unsuccessful, display error message
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await signup(email, password);
      setOpen(false);
      navigate({ to: "/dashboard" });
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  };

  // Switch from sign up to login dialog.
  const handleLogin = () => {
    setOpen(false);
    toggleLogin(true);
  };

  // Reset dialog state when open/closed.
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setError("");
    setEmail("");
    setPassword("");
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <SignupButton />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="login-dialog-overlay" />

        <Dialog.Content className="login-dialog-content">
          <div className="login-dialog-header">
            <Dialog.Title className="login-dialog-title">
              Create your account
              <IconUserCircle stroke={2} />
            </Dialog.Title>

            <Dialog.Description className="login-dialog-description">
              Track your URL metrics.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSignup} className="login-form-stack">
            <div className="login-field">
              <label className="login-label" htmlFor="email">
                Email
              </label>

              <input
                className="login-input"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">
                Password
              </label>

              <PasswordField password={password} setPassword={setPassword} />
            </div>

            <div className="login-remember-row">
              <div className="login-checkbox-group">
                <Checkbox.Root id="login-remember" className="login-checkbox">
                  <Checkbox.Indicator className="login-checkbox-indicator">
                    ✓
                  </Checkbox.Indicator>
                </Checkbox.Root>

                <label
                  className="login-label label--small label--normal"
                  htmlFor="login-remember"
                >
                  Remember me
                </label>
              </div>
            </div>

            {error && <DialogError message={error} />}

            <div className="login-dialog-footer">
              <button
                className="cta-button login-dialog-signin-button"
                type="submit"
              >
                Sign Up
              </button>
            </div>
          </form>

          <div className="separator-row">
            <div className="separator" />
            <span className="separator-text">Or continue with</span>
            <div className="separator" />
          </div>

          <GoogleButton />

          <p className="login-dialog-signup">
            Already have an account?{" "}
            <button
              className="login-text-link text-link--medium"
              type="button"
              onClick={handleLogin}
            >
              Log in
            </button>
          </p>

          <Dialog.Close className="login-dialog-close" aria-label="Close">
            <i className="ti ti-x" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
