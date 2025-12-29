import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/auth.store";

// Session ID stored in memory (not localStorage)
// Generated once per page load, reused for all requests
let sessionId: string | null = null;

function getOrCreateSessionId(): string {
  if (!sessionId) {
    sessionId = generateSessionId();
  }
  return sessionId;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const http: AxiosInstance = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with requests (required for HTTP-only cookies)
});

// Request interceptor - add session ID
// Token is sent automatically via HTTP-only cookie, no need to add Authorization header
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Session ID for tracking
  const currentSessionId = getOrCreateSessionId();
  config.headers["X-Session-Id"] = currentSessionId;

  return config;
});

// Response interceptor - handle errors
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    const isAuthLoginOrRegister =
      url.includes("/auth/login") || url.includes("/auth/register");
    const isAuthMe = url.includes("/auth/me");

    if (status === 401) {
      // Clear user state when we get 401 (cookie expired or invalid)
      const authStore = useAuthStore();
      authStore.user = null;

      // Μην κάνεις redirect για /auth/me – αυτό χρησιμοποιείται για hydrate
      if (!isAuthLoginOrRegister && !isAuthMe) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default http;
