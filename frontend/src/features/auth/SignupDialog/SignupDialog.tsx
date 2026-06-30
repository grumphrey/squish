import styles from "./SignupDialog.module.css";

import { useState, type Dispatch, type SetStateAction } from "react";
import { IconUserCircle, IconX } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@tanstack/react-router";

import { Dialog, Checkbox } from "radix-ui";
import { SignupButton } from "@/components/Navbar";
import PasswordField from "@/features/auth/PasswordField";
import GoogleButton from "@/features/auth/GoogleButton";
import DialogError from "@/features/auth/DialogError";

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
      navigate({ to: "/dashboard" }); // TODO: not working
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
        <Dialog.Overlay className={styles.dialogOverlay} />

        <Dialog.Content className={styles.dialogContent}>
          <div className={styles.dialogHeader}>
            <Dialog.Title className={styles.dialogTitle}>
              Create your account
              <IconUserCircle stroke={2} />
            </Dialog.Title>

            <Dialog.Description className={styles.dialogDescription}>
              Track your URL metrics.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSignup} className={styles.formStack}>
            <div className={styles.loginField}>
              <label className={styles.loginLabel} htmlFor="email">
                Email
              </label>

              <input
                className={styles.loginInput}
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.loginField}>
              <label className={styles.loginLabel} htmlFor="password">
                Password
              </label>

              <PasswordField password={password} setPassword={setPassword} />
            </div>

            <div className={styles.rememberRow}>
              <div className={styles.checkboxContainer}>
                <Checkbox.Root
                  id="login-remember"
                  className={styles.checkboxRoot}
                >
                  <Checkbox.Indicator>✓</Checkbox.Indicator>
                </Checkbox.Root>

                <label
                  className={`${styles.loginLabel} ${styles.rememberLabel}`}
                  htmlFor="login-remember"
                >
                  Remember me
                </label>
              </div>
            </div>

            {error && <DialogError message={error} />}

            <div className={styles.dialogFooter}>
              <button className={`${styles.loginBtn} cta-button`} type="submit">
                Sign Up
              </button>
            </div>
          </form>

          <div className={styles.separatorContainer}>
            <div className={styles.separator} />
            <span className={styles.separatorText}>Or continue with</span>
            <div className={styles.separator} />
          </div>

          <GoogleButton />

          <p className={styles.dialogSignup}>
            Already have an account?{" "}
            <button
              className={styles.linkText}
              type="button"
              onClick={handleLogin}
            >
              Log in
            </button>
          </p>

          <Dialog.Close className={styles.dialogClose} aria-label="Close">
            <IconX />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
