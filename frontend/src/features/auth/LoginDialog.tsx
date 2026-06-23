import { useState, type Dispatch, type SetStateAction } from "react";
import { IconLogin } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@tanstack/react-router";

import { Dialog, Checkbox } from "radix-ui";
import { LoginButton } from "@/components/Navbar";
import PasswordField from "@/features/auth/PasswordField";
import GoogleButton from "@/features/auth/GoogleButton";
import DialogError from "./DialogError";

export default function LoginDialog({
  open,
  setOpen,
  toggleSignup,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  toggleSignup: Dispatch<SetStateAction<boolean>>;
}) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // const validateInput = () => {};

  // Submit login credentials to server
  const handleLogin = async (e: any) => {
    e.preventDefault();
    try {
      await login(email, password);
      setOpen(false);
      navigate({ to: "/dashboard" });
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  };

  // Switch from login to signup dialog.
  const handleSignup = () => {
    toggleSignup(true);
    setOpen(false);
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
        <LoginButton />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="login-dialog-overlay" />

        <Dialog.Content className="login-dialog-content">
          <div className="login-dialog-header">
            <Dialog.Title className="login-dialog-title">
              Welcome back
              <IconLogin stroke={2} height="20px" />
            </Dialog.Title>

            <Dialog.Description className="login-dialog-description">
              Enter your credentials to access your account.
            </Dialog.Description>
          </div>

          <form onSubmit={handleLogin} className="login-form-stack">
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

              <button className="login-text-link" type="button">
                Forgot password?
              </button>
            </div>

            {error && <DialogError message={error} />}

            <div className="login-dialog-footer">
              <button
                className="cta-button login-dialog-signin-button"
                type="submit"
              >
                Sign In
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
            Don't have an account?{" "}
            <button
              className="login-text-link text-link--medium"
              type="button"
              onClick={handleSignup}
            >
              Sign up
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
