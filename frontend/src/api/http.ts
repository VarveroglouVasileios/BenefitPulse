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

// Request interceptor - add session ID and custom validateStatus for /profile
// Token is sent automatically via HTTP-only cookie, no need to add Authorization header
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Session ID for tracking
  const currentSessionId = getOrCreateSessionId();
  config.headers["X-Session-Id"] = currentSessionId;

  // For /profile endpoints, treat 404 as success to prevent console errors
  // User might not have profile yet, which is expected
  const url = config.url || "";
  if (url.includes("/profile")) {
    config.validateStatus = (status) => {
      // Treat 404 as success for /profile (we'll handle it in response interceptor)
      return (status >= 200 && status < 300) || status === 404;
    };
  }

  return config;
});

// Response interceptor - handle errors and 404 for /profile
http.interceptors.response.use(
  (response) => {
    // If we get a 404 for /profile, convert it to an error for error handling
    const url = response.config?.url || "";
    const isProfile = url.includes("/profile");

    if (response.status === 404 && isProfile) {
      // Create an error object that won't be logged to console
      const error: any = new Error("Profile not found");
      error.response = response;
      error.config = response.config;
      error.isAxiosError = true;
      // Mark as silent to prevent console logging
      error.silent = true;
      return Promise.reject(error);
    }

    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    const isAuthLoginOrRegister =
      url.includes("/auth/login") || url.includes("/auth/register");
    const isAuthMe = url.includes("/auth/me");
    const isProfile = url.includes("/profile");

    // Suppress console errors for 404 on /profile
    if (status === 404 && isProfile) {
      // Mark as silent to prevent console logging
      error.silent = true;
    }

    if (status === 401) {
      // Clear user state when we get 401 (cookie expired or invalid)
      const authStore = useAuthStore();
      authStore.user = null;

      // Μην κάνεις redirect για /auth/me ή /profile – αυτά χρησιμοποιούνται για hydrate/theme
      if (!isAuthLoginOrRegister && !isAuthMe && !isProfile) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default http;
