import { useState, type Dispatch, type SetStateAction } from "react";
import logo from "../assets/longdog.png";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  Checkbox,
  unstable_PasswordToggleField as PasswordToggleField,
} from "radix-ui";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="nav">
      <div className="nav-left">
        <img height="30px" src={logo} />
        <a href="/" className="nav-logo">
          squi<span>.</span>sh
        </a>
      </div>

      <div className="nav-right">
        {user ? <LogoutButton /> : <LoginDialog />}
        <ThemeButton />
      </div>
    </nav>
  );
}

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme == "dark";

  return (
    <div
      id="toggle"
      className={`toggle-track ${isDark ? "dark" : ""}`}
      role="switch"
      onClick={toggleTheme}
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      tabIndex={0}
    >
      <div className="toggle-thumb">
        <i
          className={`ti ${isDark ? "ti-moon" : "ti-sun"}`}
          aria-hidden="true"
        ></i>
      </div>
    </div>
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <button className="cta-button navbar-logout-button" onClick={handleLogout}>
      Sign out
    </button>
  );
}

function LoginButton({ ref, ...props }: any) {
  return (
    <button ref={ref} {...props} className="cta-button navbar-login-button">
      Log In
    </button>
  );
}

function LoginDialog() {
  const { signup, login } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

  // Submit sign up form to server.
  // If successful, close dialog, then navigate to dashboard
  // If unsuccessful, display error message
  const handleSignup = async () => {
    try {
      await signup(email, password);
      setOpen(false);
      navigate({ to: "/dashboard" });
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  };

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

              <LoginPasswordField
                password={password}
                setPassword={setPassword}
              />
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
                  htmlFor="remember"
                >
                  Remember me
                </label>
              </div>

              <button className="login-text-link" type="button">
                Forgot password?
              </button>
            </div>

            <div className={`login-dialog-error ${error ? "" : "vis-hidden"}`}>
              <i className="ti ti-exclamation-circle login-dialog-error-icon" />
              <div className="login-dialog-error-text">
                <h5 className="login-dialog-error-title">Error</h5>
                <p className="login-dialog-error-desc">{error}</p>
              </div>
            </div>

            <div className="login-dialog-footer">
              <button className="cta-button login-button--full" type="submit">
                Sign In
              </button>
            </div>
          </form>

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

function LoginPasswordField({
  password,
  setPassword,
}: {
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
}) {
  return (
    <PasswordToggleField.Root>
      <div className="login-input login-password-input-container">
        <PasswordToggleField.Input
          className="login-password-input"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <PasswordToggleField.Toggle className="login-password-toggle">
          <PasswordToggleField.Icon
            visible={<i className="ti ti-eye" />}
            hidden={<i className="ti ti-eye-closed" />}
          />
        </PasswordToggleField.Toggle>
      </div>
    </PasswordToggleField.Root>
  );
}
