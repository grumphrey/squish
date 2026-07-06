import styles from "./Navbar.module.css";
import logo from "@/assets/longdog.png";

import { useEffect, useState } from "react";
import {
  IconChartBar,
  IconHome,
  IconLink,
  IconLogin,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { useNavigate, Link } from "@tanstack/react-router";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Separator } from "../ui/separator";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const { user, isLoading, logout } = useAuth();

  // Close mobile navigation menu when screen size is desktop
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");

    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate({ to: "/" });
  };

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
            <nav className="h-full flex flex-col justify-between mt-8 p-5 font-semibold">
              <div className="flex flex-col gap-5">
                <h3 className={styles.navLogo}>
                  squi<span>.</span>sh
                </h3>
                <Separator />
              </div>

              {/* Links */}
              <div className="flex flex-col grow gap-6 *:flex *:gap-1.5 *items-center pt-6">
                <Link to="/" onClick={() => setOpen(false)}>
                  <IconHome height="16px" />
                  Home
                </Link>

                {user && (
                  <>
                    <Link to="/dashboard" onClick={() => setOpen(false)}>
                      <IconChartBar height="16px" />
                      Dashboard
                    </Link>
                    <Link to="/links" onClick={() => setOpen(false)}>
                      <IconLink height="16px" />
                      My Links
                    </Link>
                  </>
                )}
              </div>

              {/* Login/Logout */}
              <div className="flex flex-col gap-6 *:flex *:gap-1.5 *items-center">
                {!user && (
                  <Button
                    onClick={() => {
                      navigate({ to: "/login" });
                      setOpen(false);
                    }}
                  >
                    <IconLogin height="16px" />
                    Login / Sign Up
                  </Button>
                )}
                {user && (
                  <Button variant="default" onClick={handleLogout}>
                    Log out
                  </Button>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Desktop menu TODO using navigation menu */}
        <div className="gap-5 items-center hidden md:flex">
          {!user && !isLoading && (
            <Button
              className="font-sans font-semibold p-5 bg-(--color-primary) text-(--color-text) hover:bg-(--color-primary-dark)"
              onClick={() => {
                navigate({ to: "/login" });
              }}
            >
              <IconLogin height="16px" />
              Log In
            </Button>
          )}

          {user && !isLoading && (
            <button
              className={`${styles.analyticsBtn} cta-button`}
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Analytics
            </button>
          )}

          {user && <LogoutButton />}
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
