import styles from "./Navbar.module.css";
import logo from "@/assets/longdog.png";
import {
  IconChartBar,
  IconLayoutDashboard,
  IconLink,
  IconLogin,
  IconLogout,
  IconMoon,
  IconQrcode,
  IconSun,
} from "@tabler/icons-react";
import { User as UserIcon } from "lucide-react";
import { type ReactNode } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import CreateURLDialog from "../CreateURLDialog";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const loggedIn = !isLoading && user;

  return (
    <header className={styles.navbar}>
      <div className={styles.navLeft}>
        <img src={logo} className="hidden md:block" />
        <Link to="/" className={styles.navLogo}>
          squi<span>.</span>sh
        </Link>

        <div className="md:hidden">
          <ThemeButton />
        </div>
      </div>

      <div className={styles.navRight}>
        {/* Desktop nav menu */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList className="gap-4">
            <NavigationMenuItem>
              <NavigationMenuTrigger className="flex items-center gap-1">
                <IconLayoutDashboard size={20} /> Manage URLs
              </NavigationMenuTrigger>

              <NavigationMenuContent>
                <ul className="w-96">
                  <ListItem
                    href="/links"
                    title="Short Links"
                    icon={<IconLink size={30} />}
                  >
                    View and manage all your links.
                  </ListItem>
                  <ListItem
                    href="/qrcodes"
                    title="QR Codes"
                    icon={<IconQrcode size={30} />}
                  >
                    View and manage your QR codes.
                  </ListItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={navigationMenuTriggerStyle()}
              >
                <Link to="/dashboard">
                  <IconChartBar size={20} /> Analytics
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="gap-5 items-center flex">
          {!user && !isLoading && (
            <Button
              className="font-semibold p-5 bg-(--color-primary) text-(--color-text) hover:bg-(--color-primary-dark)"
              onClick={() => {
                navigate({ to: "/login" });
              }}
            >
              <IconLogin height="16px" />
              Log In
            </Button>
          )}
        </div>

        {/* Create Link button */}
        {loggedIn && <CreateURLDialog />}

        <div className="hidden md:block">
          <ThemeButton />
        </div>

        {/* Profile picture + menu */}
        {loggedIn && <AvatarDropdownMenu />}
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
function ListItem({
  icon,
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string; icon?: ReactNode }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link to={href}>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex gap-1 items-center leading-none font-medium">
              <span>{icon}</span>
              <span>{title}</span>
            </div>
            <div className="line-clamp-2 text-muted-foreground">{children}</div>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

// Component that displays user's avatar. Shows dropdown menu when clicked on.
function AvatarDropdownMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full p-0 cursor-pointer">
          <Avatar>
            <AvatarImage
              src={user?.picture}
              alt="avatar"
              referrerPolicy="no-referrer" // TODO: 429 too many requests to identity provider
            />
            <AvatarFallback>
              <UserIcon size={25} />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="font-sans w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-foreground font-medium text-sm leading-none">
              {user?.name}
            </p>
            <p className="text-muted-foreground text-xs leading-none">
              {user?.email || "squi.sh"}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link
              to="/links"
              className="flex gap-2 items-center w-full font-medium"
            >
              <IconLink size={20} /> Links
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Link
              to="/qrcodes"
              className="flex gap-2 items-center w-full font-medium"
            >
              <IconQrcode size={20} /> QR Codes
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Link
              to="/dashboard"
              className="flex gap-2 items-center w-full font-medium"
            >
              <IconChartBar size={20} /> Analytics
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            className="font-medium"
            onClick={handleLogout}
          >
            <IconLogout size={20} />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
