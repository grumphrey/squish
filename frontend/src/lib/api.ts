import axios from "axios";
import { tokenStore } from "@/features/auth/auth";

export const api = axios.create({ baseURL: "/api" });

// Request interceptor
// Attach access token to every request
// NOTE: remember to use the custom axios instance
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token when we get 401 unauthorized
let isRefreshing = false; // global flag to lock further refresh attempts
type FailedRequest = {
  resolve: (token: string | null) => void;
  reject: (reason?: unknown) => void;
};
let failedQueue: FailedRequest[] = [];
const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token),
  );
  failedQueue = [];
};

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  // on response errors:
  // Catch 401 unauthorized errors
  // We want to only make one call to refresh token at a time
  async (error) => {
    const original = error.config;

    // Skip non-401 errors and requests already retried
    // Also exclude responses from authentication endpoints
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url.includes("/login") ||
      original.url.includes("/signup")
    ) {
      return Promise.reject(error);
    }

    // Queue concurrent requests while there is already a refresh is in-flight
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        // Once successful, retry requests with the new token
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post("/api/auth/refresh", {});
      tokenStore.set(data.access_token);
      processQueue(null, data.access_token); // refresh complete: resolve all failed requests in failedQueue
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original); // retry original request with new token
    } catch (err) {
      processQueue(err, null); // refresh failure, reject all pending requests
      tokenStore.clear();
      // window.location.href = "/login"; or use router.navigate TODO // redirect user to login dialog
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
