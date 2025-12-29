import { defineStore } from "pinia";
import { api } from "../api/endpoints";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  hydrated: boolean;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    hydrated: false,
  }),

  getters: {
    // Token is stored in HTTP-only cookie, not in state
    // User is authenticated if we have user data (fetched from /auth/me)
    isAuthenticated: (state): boolean => !!state.user,
    isAdmin: (state): boolean => state.user?.role === "admin",
  },

  actions: {
    async login(email: string, password: string): Promise<void> {
      const response = await api.auth.login({ email, password });
      // Token is set in HTTP-only cookie by backend, not returned in response
      this.user = response.data.user;
    },

    async register(data: {
      email: string;
      password: string;
      passwordConfirm: string;
      firstName: string;
      lastName: string;
      acceptTerms: boolean;
    }): Promise<void> {
      const response = await api.auth.register(data);
      // Token is set in HTTP-only cookie by backend, not returned in response
      this.user = response.data.user;
    },

    async logout(): Promise<void> {
      try {
        await api.auth.logout();
      } catch (error) {
        // Ignore errors
      }
      // Backend clears the cookie, we just clear user state
      this.user = null;
    },

    async fetchMe(): Promise<void> {
      // Always try to fetch user - if cookie exists and is valid, we'll get user data
      // If cookie doesn't exist or is invalid, we'll get 401 and user stays null
      try {
        const response = await api.auth.me();
        this.user = response.data;
      } catch (error) {
        // 401 means no valid cookie - user is not authenticated
        this.user = null;
      } finally {
        this.hydrated = true;
      }
    },
  },
});
