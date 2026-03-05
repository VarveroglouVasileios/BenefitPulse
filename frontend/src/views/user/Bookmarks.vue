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
    <div v-if="!loading && bookmarks.length === 0" class="empty">
      <p>Δεν έχετε αγαπημένα ακόμα</p>
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
  padding: 2rem;
}

.opportunities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.empty {
  text-align: center;
  padding: 4rem 2rem;
}
</style>
