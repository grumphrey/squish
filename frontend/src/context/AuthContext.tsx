import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { api } from "@/lib/api";
import { tokenStore } from "@/features/auth/auth";
import type { User } from "@/models/models";

export interface AuthContext {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContext>(null!);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true on mount for silent refresh

  // Silently refresh on page load, exchange the httpOnly refresh cookie for a new access token
  useEffect(() => {
    api
      .post("/auth/refresh")
      .then(({ data }) => {
        tokenStore.set(data.access_token);
        const { email, user_id } = decodeBrowserJwt(data.access_token);
        setUser({ email: email, userID: user_id });
        // TODO: navigate to dashboard?
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  // logout clears the refresh token in cookie, as well as revokes the access token server-side.
  // The access token is cleared from the token store client-side.
  const logout = async () => {
    await api.post("/auth/logout"); // POST here since we change server-side state
    tokenStore.clear();
    setUser(null);
    // TODO: unable to preload css error
    // const queryClient = useQueryClient();
    // queryClient.clear(); // Nuke query client cache
  };

  // login sends user credentials to the server to be verified.
  // If successful, the server returns an access token + refresh token.
  // If unsuccessful, the server returns an error code and message.
  const login = async (email: string, password: string) => {
    try {
      const body = { email, password };
      const { data } = await api.post("/auth/login", body);
      tokenStore.set(data.access_token);

      const { email: user_email, user_id } = decodeBrowserJwt(
        data.access_token,
      );
      setUser({ email: user_email, userID: user_id });
    } catch (err) {
      // type guard
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code;
        switch (err.response?.status) {
          case 401:
            if (code === "ERR_INVALID_CREDENTIALS") {
              throw new Error("Invalid login credentials.");
            }
            break;
          case 500:
            if (code === "ERR_GENERATING_TOKENS") {
              throw new Error("Could not log in user. Please try again later.");
            }
            break;
          default:
            throw new Error("Internal server error. Please try again later.");
        }
      }
      throw new Error("Internal server error. Please try again later.");
    }
  };

  // signup sends user credentials to the server to create an account.
  // If successful, the server returns an access token + refresh token.
  // If unsuccessful, the server returns an error code and message.
  const signup = async (email: string, password: string) => {
    try {
      const body = { email, password };
      const { data } = await api.post("/auth/signup", body);
      tokenStore.set(data.access_token);

      const { email: user_email, user_id } = decodeBrowserJwt(
        data.access_token,
      );
      setUser({ email: user_email, userID: user_id });
    } catch (err) {
      // type guard
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code;
        switch (err.response?.status) {
          case 400:
            if (code === "ERR_EXISTING_USER") {
              throw new Error("User already exists. Please log in.");
            } else if (code === "ERR_CREATING_USER") {
              throw new Error(
                "We faced a problem creating the user. Please try again later.",
              );
            } else if (code === "INVALID_SIGNUP") {
              throw new Error(
                "Your email/password does not meet the requirements.",
              );
            }
            break;
          case 500:
            if (code === "ERR_GENERATING_TOKENS") {
              throw new Error("Could not log in user. Please try again later.");
            }
            break;
          default:
            throw new Error("Internal server error. Please try again later.");
        }
      }
      throw new Error("Internal server error. Please try again later.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Helper function for decoding JWT payloads from Base64Url string into a JS object.
function decodeBrowserJwt(token: string) {
  try {
    // Get the payload (the second part of the three dot-separated sections)
    const base64Url = token.split(".")[1];

    // Convert Base64Url format to standard Base64
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    // Decode the Base64 string and handle Unicode characters gracefully
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

export const useAuth = () => useContext(AuthContext);
