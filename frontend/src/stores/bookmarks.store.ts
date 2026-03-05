import { defineStore } from 'pinia';
import { api } from '../api/endpoints';

interface BookmarksState {
  bookmarks: any[];
  loading: boolean;
}

export const useBookmarksStore = defineStore('bookmarks', {
  state: (): BookmarksState => ({
    bookmarks: [],
    loading: false,
  }),

  actions: {
    async fetchBookmarks(): Promise<void> {
      this.loading = true;
      try {
        const response = await api.bookmarks.list();
        this.bookmarks = response.data;
      } catch (error) {
        console.error('Failed to fetch bookmarks:', error);
      } finally {
        this.loading = false;
      }
    },

    async addBookmark(opportunityId: string): Promise<void> {
      try {
        await api.bookmarks.add(opportunityId);
        await this.fetchBookmarks();
      } catch (error) {
        console.error('Failed to add bookmark:', error);
        throw error;
      }
    },

    async removeBookmark(opportunityId: string): Promise<void> {
      try {
        await api.bookmarks.remove(opportunityId);
        await this.fetchBookmarks();
      } catch (error) {
        console.error('Failed to remove bookmark:', error);
        throw error;
      }
    },
  },
});
