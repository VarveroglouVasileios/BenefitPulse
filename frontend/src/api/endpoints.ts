import http from './http';

export const api = {
  // Auth
  auth: {
    register: (data: { email: string; password: string }) => http.post('/auth/register', data),
    login: (data: { email: string; password: string }) => http.post('/auth/login', data),
    me: () => http.get('/auth/me'),
    logout: () => http.post('/auth/logout'),
  },

  // Profile
  profile: {
    get: () => {
      // Wrap in try-catch to silently handle 404 (user might not have profile yet)
      return http.get('/profile').catch((error: any) => {
        // Silently handle 404 - user might not have profile yet
        if (error.response?.status === 404) {
          // Return a rejected promise with the error, but don't log to console
          // The calling code will handle it gracefully
          return Promise.reject(error);
        }
        // Re-throw other errors
        throw error;
      });
    },
    update: (data: any) => http.put('/profile', data),
    updateTheme: (theme: 'light' | 'dark') => http.put('/profile/theme', { theme }),
  },

  // Opportunities
  opportunities: {
    list: (params?: any) => http.get('/opportunities', { params }),
    feed: (params?: any) => http.get('/feed', { params }), // New feed endpoint with tabs
    get: (id: string) => http.get(`/opportunities/${id}`),
    trending: (hours?: number) => http.get('/opportunities/trending', { params: { hours } }),
    matched: () => http.get('/me/opportunities/matched'),
    forYou: () => http.get('/me/opportunities/for-you'),
    today: () => http.get('/me/opportunities/today'),
    newSinceLastVisit: () => http.get('/me/opportunities/new-since-last-visit'),
    expiringSoon: (days?: number) => http.get('/me/opportunities/expiring-soon', { params: { days } }),
    matchReasons: (id: string) => http.get(`/opportunities/${id}/match-reasons`),
  },

  // Stats
  stats: {
    get: () => http.get('/stats'),
  },

  // Bookmarks
  bookmarks: {
    list: () => http.get('/me/bookmarks'),
    add: (opportunityId: string) => http.post(`/me/bookmarks/${opportunityId}`),
    remove: (opportunityId: string) => http.delete(`/me/bookmarks/${opportunityId}`),
  },

  // Events
  events: {
    track: (data: any) => http.post('/events', data),
  },

  // Contact
  contact: {
    submit: (data: { name: string; email: string; subject: string; message: string; type: string }) =>
      http.post('/contact', data),
  },

  // Chatbot
  chatbot: {
    chat: (data: { message: string; conversation?: Array<{ role: 'user' | 'assistant'; content: string }> }) =>
      http.post('/chatbot/chat', data),
  },

  // Admin
  admin: {
    opportunities: {
      list: (params?: any) => http.get('/admin/opportunities', { params }),
      get: (id: string) => http.get(`/admin/opportunities/${id}`),
      create: (data: any) => http.post('/admin/opportunities', data),
      update: (id: string, data: any) => http.put(`/admin/opportunities/${id}`, data),
      publish: (id: string) => http.post(`/admin/opportunities/${id}/publish`),
      unpublish: (id: string) => http.post(`/admin/opportunities/${id}/unpublish`),
      archive: (id: string) => http.post(`/admin/opportunities/${id}/archive`),
      delete: (id: string) => http.delete(`/admin/opportunities/${id}`),
      restore: (id: string) => http.post(`/admin/opportunities/${id}/restore`),
    },
    metrics: {
      overview: () => http.get('/admin/metrics/overview'),
      timeseries: (days?: number) => http.get('/admin/metrics/timeseries', { params: { days } }),
      topRoutes: (limit?: number) => http.get('/admin/metrics/top-routes', { params: { limit } }),
      topOpportunities: (limit?: number) => http.get('/admin/metrics/top-opportunities', { params: { limit } }),
    },
    draftQueue: () => http.get('/admin/draft-queue'),
    rawItems: (params?: any) => http.get('/admin/raw-items', { params }),
    audit: (params?: any) => http.get('/admin/audit', { params }),
    contact: {
      list: (params?: any) => http.get('/admin/contact', { params }),
      reply: (id: string, message: string) => http.post(`/admin/contact/${id}/reply`, { message }),
    },
  },
};
