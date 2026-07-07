import styles from "./LoginDialog.module.css";

import { useState, type Dispatch, type SetStateAction } from "react";
import { IconLogin, IconX } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@tanstack/react-router";

import { Dialog, Checkbox } from "radix-ui";
import PasswordField from "@/features/auth/PasswordField";
import GoogleButton from "@/features/auth/GoogleButton";
import DialogError from "@/features/auth/DialogError";

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
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
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
        <button>TODO</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />

        <Dialog.Content className={styles.dialogContent}>
          <div className={styles.dialogHeader}>
            <Dialog.Title className={styles.dialogTitle}>
              Welcome back
              <IconLogin stroke={2} height="20px" />
            </Dialog.Title>

            <Dialog.Description className={styles.dialogDescription}>
              Enter your credentials to access your account.
            </Dialog.Description>
          </div>

          <form onSubmit={handleLogin} className={styles.formStack}>
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

              <button className={styles.linkText} type="button">
                Forgot password?
              </button>
            </div>

            {error && <DialogError message={error} />}

            <div className={styles.dialogFooter}>
              <button className={`${styles.loginBtn} cta-button`} type="submit">
                Sign In
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
            Don't have an account?{" "}
            <button
              className={styles.linkText}
              type="button"
              onClick={handleSignup}
            >
              Sign up
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
