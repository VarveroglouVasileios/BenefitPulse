import { defineStore } from "pinia";
import { api } from "../api/endpoints";
import { Opportunity } from "@shared/index";

interface OpportunitiesState {
  opportunities: Opportunity[];
  loading: boolean;
}

export const useOpportunitiesStore = defineStore("opportunities", {
  state: (): OpportunitiesState => ({
    opportunities: [],
    loading: false,
  }),

  actions: {
    async fetchMatched(): Promise<void> {
      this.loading = true;
      try {
        const response = await api.opportunities.matched();
        // matched endpoint επιστρέφει { opportunity, reasons, missingFields, confidence }
        this.opportunities = (response.data || []).map(
          (item: any) => item.opportunity
        );
      } catch (error) {
        console.error("Failed to fetch matched opportunities:", error);
      } finally {
        this.loading = false;
      }
    },

    async fetchToday(): Promise<void> {
      this.loading = true;
      try {
        const response = await api.opportunities.today();
        this.opportunities = response.data;
      } catch (error) {
        console.error("Failed to fetch today opportunities:", error);
      } finally {
        this.loading = false;
      }
    },

    async fetchNewSinceLastVisit(): Promise<void> {
      this.loading = true;
      try {
        const response = await api.opportunities.newSinceLastVisit();
        this.opportunities = response.data;
      } catch (error) {
        console.error("Failed to fetch new opportunities:", error);
      } finally {
        this.loading = false;
      }
    },

    async fetchExpiringSoon(days?: number): Promise<void> {
      this.loading = true;
      try {
        const response = await api.opportunities.expiringSoon(days);
        this.opportunities = response.data;
      } catch (error) {
        console.error("Failed to fetch expiring opportunities:", error);
      } finally {
        this.loading = false;
      }
    },
  },
});
