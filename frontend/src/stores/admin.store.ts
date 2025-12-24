import { defineStore } from 'pinia';
import { api } from '../api/endpoints';

interface AdminState {
  opportunities: any[];
  metrics: any;
  loading: boolean;
  metricsLoading: boolean;
}

export const useAdminStore = defineStore('admin', {
  state: (): AdminState => ({
    opportunities: [],
    metrics: null,
    loading: false,
    metricsLoading: false,
  }),

  actions: {
    async fetchOpportunities(params?: any): Promise<void> {
      this.loading = true;
      try {
        const response = await api.admin.opportunities.list(params);
        this.opportunities = response.data.opportunities;
      } catch (error) {
        console.error('Failed to fetch admin opportunities:', error);
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
