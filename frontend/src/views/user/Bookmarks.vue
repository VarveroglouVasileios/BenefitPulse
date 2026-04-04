<template>
  <div class="bookmarks">
    <h1>Αγαπημένα</h1>
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else class="opportunities-grid">
      <OpportunityCard
        v-for="bookmark in bookmarks"
        :key="bookmark.opportunityId._id"
        :opportunity="bookmark.opportunityId"
      />
    </div>
    <div v-if="!loading && bookmarks.length === 0" class="empty-state">
      <div class="empty-illustration">
        <div class="heart-pulse"></div>
        <div class="empty-icon" aria-hidden="true">🔖</div>
      </div>
      <h2 class="empty-title">Δεν έχετε αγαπημένα</h2>
      <p class="empty-text">
        Αποθηκεύστε τις ευκαιρίες που σας ενδιαφέρουν για να τις βρίσκετε εύκολα εδώ.
      </p>
      <div class="empty-actions">
        <router-link to="/opportunities" class="btn-primary-link">Ανακαλύψτε ευκαιρίες</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useBookmarksStore } from "../../stores/bookmarks.store";
import OpportunityCard from "../../components/OpportunityCard.vue";

const bookmarksStore = useBookmarksStore();
const { bookmarks, loading } = bookmarksStore;

onMounted(() => {
  bookmarksStore.fetchBookmarks();
});
</script>

<style scoped>
.bookmarks {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

@media (min-width: 640px) {
  .bookmarks {
    padding: 2rem;
  }
}

.opportunities-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 2rem;
}

@media (min-width: 640px) {
  .opportunities-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

.empty-state {
  text-align: center;
  padding: 4rem 1.5rem;
  max-width: 32rem;
  margin: 0 auto;
  color: var(--text-secondary);
}

.empty-illustration {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  font-size: 3rem;
  z-index: 2;
}

.heart-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  background: var(--error);
  opacity: 0.1;
  border-radius: 50%;
  animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.1; }
  100% { transform: scale(0.8); opacity: 0.3; }
}

.empty-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.35rem;
  color: var(--text-primary);
  font-weight: 700;
}

.empty-text {
  margin: 0;
  line-height: 1.6;
  font-size: 1rem;
}

.empty-actions {
  margin-top: 1.5rem;
}

.btn-primary-link {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  font-weight: 600;
  background: var(--primary-color);
  color: white;
  text-decoration: none;
  transition: transform 0.2s, background-color 0.2s;
}

.btn-primary-link:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
</style>
