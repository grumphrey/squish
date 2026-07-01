import styles from "./Navbar.module.css";
import logo from "@/assets/longdog.png";

import { useEffect, useState } from "react";
import {
  IconChartBar,
  IconHome,
  IconLogin,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { useNavigate, Link } from "@tanstack/react-router";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import LoginDialog from "@/features/auth/LoginDialog";
import SignupDialog from "@/features/auth/SignupDialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/", icon: <IconHome /> },
  { label: "Analytics", href: "/dashboard", icon: <IconChartBar /> },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // Close mobile navigation menu when screen size is desktop
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");

    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return (
    <header className={styles.navbar}>
      <div className={styles.navLeft}>
        <img src={logo} />
        <Link to="/" className={styles.navLogo}>
          squi<span>.</span>sh
        </Link>
      </div>

      <div className={styles.navRight}>
        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost">
              <Menu />
            </Button>
          </SheetTrigger>

          <SheetContent className="font-sans" side="right">
            <nav className="flex flex-col gap-6 mt-8 p-5 font-semibold">
              {navLinks.map((link) => {
                return (
                  <Link
                    to={link.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-1.5 items-center"
                  >
                    <div className="*:h-4">{link.icon}</div>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Desktop menu TODO */}
        <div className="gap-5 items-center hidden md:flex">
          {!user && !isLoading && (
            <SignupDialog
              open={signInOpen}
              setOpen={setSignInOpen}
              toggleLogin={setLoginOpen}
            />
          )}

          {user && !isLoading && (
            <button
              className={`${styles.analyticsBtn} cta-button`}
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Analytics
            </button>
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
        </div>

        <ThemeButton />
      </div>
    </header>
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
