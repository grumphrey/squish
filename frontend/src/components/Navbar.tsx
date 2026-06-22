import { useState, type Dispatch, type SetStateAction } from "react";
import logo from "../assets/longdog.png";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Dialog,
  Checkbox,
  unstable_PasswordToggleField as PasswordToggleField,
} from "radix-ui";

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="nav-left">
        <img height="30px" src={logo} />
        <a href="/" className="nav-logo">
          squi<span>.</span>sh
        </a>
      </div>

      <div className="nav-right">
        <LoginDialog />
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

function LoginButton({ ref, ...props }: any) {
  return (
    <button ref={ref} {...props} className="login-button">
      Log in
    </button>
  );
}

function LoginDialog() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: any) => {
    e.preventDefault();
    console.log("Submitting form");
    login(email, password);
  };

  return (
    <Dialog.Root>
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

          <form onSubmit={handleSubmit} className="login-form-stack">
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
            <div className="login-dialog-footer">
              <button className="login-button login-button--full" type="submit">
                Sign In
              </button>
            </div>
          </form>

          <p className="login-dialog-signup">
            Don't have an account?{" "}
            <button className="login-text-link text-link--medium" type="button">
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
