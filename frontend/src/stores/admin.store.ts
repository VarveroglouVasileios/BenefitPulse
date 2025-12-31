import { defineStore } from 'pinia';
import { api } from '../api/endpoints';

interface AdminState {
  opportunities: any[];
  opportunitiesTotal: number;
  metrics: any;
  loading: boolean;
  metricsLoading: boolean;
}

export const useAdminStore = defineStore('admin', {
  state: (): AdminState => ({
    opportunities: [],
    opportunitiesTotal: 0,
    metrics: null,
    loading: false,
    metricsLoading: false,
  }),

  actions: {
    async fetchOpportunities(params?: any): Promise<void> {
      this.loading = true;
      try {
        const response = await api.admin.opportunities.list(params);
        // Ensure we always set an array, even if response.data is undefined
        this.opportunities = Array.isArray(response.data?.opportunities) 
          ? response.data.opportunities 
          : [];
        // Store total count
        this.opportunitiesTotal = response.data?.total || 0;
      } catch (error) {
        console.error('Failed to fetch admin opportunities:', error);
        // Reset to empty array on error to prevent stale data
        this.opportunities = [];
        this.opportunitiesTotal = 0;
        throw error; // Re-throw so component can handle it
      } finally {
        this.loading = false;
      }
    },

    async fetchMetrics(): Promise<void> {
      this.metricsLoading = true;
      try {
        const response = await api.admin.metrics.overview();
        this.metrics = response.data;
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        this.metricsLoading = false;
      }
    },
  },
});
