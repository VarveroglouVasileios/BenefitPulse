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
  token: string | null;
  hydrated: boolean;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    token: localStorage.getItem("token"),
    hydrated: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.token && !!state.user,
    isAdmin: (state): boolean => state.user?.role === "admin",
  },

  actions: {
    async login(email: string, password: string): Promise<void> {
      const response = await api.auth.login({ email, password });
      this.token = response.data.token;
      this.user = response.data.user;
      if (this.token) {
        localStorage.setItem("token", this.token);
      }
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
      this.token = response.data.token;
      this.user = response.data.user;
      if (this.token) {
        localStorage.setItem("token", this.token);
      }
    },

    async logout(): Promise<void> {
      try {
        await api.auth.logout();
      } catch (error) {
        // Ignore errors
      }
      this.token = null;
      this.user = null;
      localStorage.removeItem("token");
    },

    async fetchMe(): Promise<void> {
      // Αν δεν υπάρχει token, μην κάνεις καθόλου κλήση στο /auth/me
      if (!this.token) {
        this.user = null;
        this.hydrated = true;
        return;
      }
      try {
        const response = await api.auth.me();
        this.user = response.data;
      } catch (error) {
        this.token = null;
        this.user = null;
        localStorage.removeItem("token");
      } finally {
        this.hydrated = true;
      }
    },
  },
});
