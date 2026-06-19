import logo from "../assets/longdog.png";
import { useTheme } from "../context/ThemeContext";
import { Dialog, Checkbox } from "radix-ui";

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

          <div className="login-form-stack">
            <div className="login-field">
              <label className="login-label" htmlFor="email">
                Email
              </label>

              <input
                className="login-input"
                id="email"
                placeholder="you@example.com"
                type="email"
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">
                Password
              </label>

              <input className="login-input" id="password" type="password" />
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
          </div>

          <div className="login-dialog-footer">
            <button className="login-button login-button--full">Sign In</button>
          </div>

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
