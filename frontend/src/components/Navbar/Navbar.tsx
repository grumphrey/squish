import styles from "./Navbar.module.css";
import logo from "@/assets/longdog.png";

import { useState } from "react";
import { IconLogin, IconMoon, IconSun } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import LoginDialog from "@/features/auth/LoginDialog";
import SignupDialog from "@/features/auth/SignupDialog";

export default function Navbar() {
  const { user, isLoading } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLeft}>
        <img src={logo} />
        <a href="/" className={styles.navLogo}>
          squi<span>.</span>sh
        </a>
      </div>

      <div className={styles.navRight}>
        {!user && !isLoading && (
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
      className={`${styles.toggleTrack} ${isDark ? styles.dark : ""}`}
      role="switch"
      onClick={toggleTheme}
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      tabIndex={0}
    >
      <div className={styles.toggleThumb}>
        {isDark ? <IconMoon /> : <IconSun />}
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
    <button
      className={`cta-button ${styles.logoutButton}`}
      onClick={handleLogout}
    >
      Sign out
    </button>
  );
}

export function LoginButton({
  ref,
  ...props
}: React.ComponentPropsWithRef<"button">) {
  return (
    <button ref={ref} {...props} className={`cta-button ${styles.loginButton}`}>
      Log In
      <IconLogin stroke={2} height="20px" />
    </button>
  );
}

export function SignupButton({
  ref,
  ...props
}: React.ComponentPropsWithRef<"button">) {
  return (
    <button
      ref={ref}
      {...props}
      className={`cta-button ${styles.signupButton}`}
    >
      Sign Up
    </button>
  );
}
