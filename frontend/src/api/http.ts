import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const http: AxiosInstance = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add session ID
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem("sessionId", sessionId);
  }
  config.headers["X-Session-Id"] = sessionId;

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
      // Πάντα καθάρισε το token όταν πάρουμε 401
      localStorage.removeItem("token");

      // Μην κάνεις redirect για /auth/me – αυτό χρησιμοποιείται για hydrate
      if (!isAuthLoginOrRegister && !isAuthMe) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default http;
