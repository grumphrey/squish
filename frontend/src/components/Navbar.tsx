import { useState } from "react";
import { IconLogin } from "@tabler/icons-react";
import logo from "@/assets/longdog.png";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import LoginDialog from "@/features/auth/LoginDialog";
import SignupDialog from "@/features/auth/SignupDialog";

export default function Navbar() {
  const { user } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="nav-left">
        <img height="30px" src={logo} />
        <a href="/" className="nav-logo">
          squi<span>.</span>sh
        </a>
      </div>

      <div className="nav-right">
        {!user && (
          <SignupDialog
            open={signInOpen}
            setOpen={setSignInOpen}
            toggleLogin={setLoginOpen}
          />
        )}
        {user ? (
          <LogoutButton />
        ) : (
          <LoginDialog
            open={loginOpen}
            setOpen={setLoginOpen}
            toggleSignup={setSignInOpen}
          />
        )}
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

export function LoginButton({ ref, ...props }: any) {
  return (
    <button ref={ref} {...props} className="cta-button navbar-login-button">
      Log In
      <IconLogin stroke={2} height="20px" />
    </button>
  );
}

export function SignupButton({ ref, ...props }: any) {
  return (
    <button ref={ref} {...props} className="cta-button navbar-signup-button">
      Sign Up
    </button>
  );
}
