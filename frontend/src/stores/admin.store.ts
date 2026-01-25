import { defineStore } from 'pinia';
import { api } from '../api/endpoints';

interface AdminState {
  opportunities: any[];
  total: number;
  page: number;
  limit: number;
  metrics: any;
  loading: boolean;
  metricsLoading: boolean;
}

export const useAdminStore = defineStore('admin', {
  state: (): AdminState => ({
    opportunities: [],
    total: 0,
    page: 1,
    limit: 20,
    metrics: null,
    loading: false,
    metricsLoading: false,
  }),

  actions: {
    async fetchOpportunities(params: any = {}): Promise<void> {
      this.loading = true;
      try {
        // Merge state pagination with passed params
        const queryParams = {
          page: this.page,
          limit: this.limit,
          ...params
        };
        
        const response = await api.admin.opportunities.list(queryParams);
        
        // Handle both simple array response (legacy) and paginated response
        if (response.data.opportunities && typeof response.data.total === 'number') {
           this.opportunities = response.data.opportunities;
           this.total = response.data.total;
           // Update state if params passed (e.g. searching resets to page 1)
           if (params.page) this.page = params.page;
           if (params.limit) this.limit = params.limit;
        } else if (Array.isArray(response.data)) {
           // Fallback for legacy API structure if any
           this.opportunities = response.data;
           this.total = response.data.length;
        } else {
           // Fallback common structure
           this.opportunities = response.data.opportunities || [];
           this.total = response.data.total || 0;
        }
      } catch (error) {
        console.error('Failed to fetch admin opportunities:', error);
      } finally {
        this.loading = false;
      }
    },

    setPage(page: number) {
      this.page = page;
      this.fetchOpportunities({ page });
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
