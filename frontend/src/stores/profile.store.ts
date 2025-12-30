import { defineStore } from "pinia";
import { api } from "../api/endpoints";
import { UserProfile } from "@shared/index";

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
}

export const useProfileStore = defineStore("profile", {
  state: (): ProfileState => ({
    profile: null,
    loading: false,
  }),

  actions: {
    async fetchProfile(): Promise<void> {
      this.loading = true;
      try {
        const response = await api.profile.get();
        this.profile = response.data;
      } catch (error: any) {
        // Silently handle 404 (user might not have profile yet)
        const status = error.response?.status;
        if (status !== 404) {
          console.error("Failed to fetch profile:", error);
        }
        // Set profile to null if not found
        if (status === 404) {
          this.profile = null;
        }
      } finally {
        this.loading = false;
      }
    },

    async updateProfile(updates: Partial<UserProfile>): Promise<void> {
      this.loading = true;
      try {
        const response = await api.profile.update(updates);
        this.profile = response.data;
      } catch (error) {
        console.error("Failed to update profile:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
