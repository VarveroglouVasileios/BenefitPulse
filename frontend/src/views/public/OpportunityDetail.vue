<template>
  <div class="opportunity-detail">
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else-if="opportunity">
      <div class="header">
        <h1>{{ opportunity.title }}</h1>
        <Badge :type="opportunity.type" />
      </div>
      <div class="meta">
        <span>Πηγή: {{ opportunity.source }}</span>
        <span>Δημοσιεύτηκε: {{ formatDate(opportunity.publishedAt) }}</span>
        <span v-if="opportunity.deadlineAt">
          Προθεσμία: {{ formatDate(opportunity.deadlineAt) }}
        </span>
      </div>
      <div class="summary">
        <h2>Περίληψη</h2>
        <p>{{ opportunity.summary }}</p>
      </div>
      <div class="disclaimer">
        <strong>Σημαντικό:</strong> Αυτή η ευκαιρία <strong>πιθανόν</strong> να
        σας αφορά. Δεν είναι εγγύηση ότι δικαιούστε αυτόματα. Ελέγξτε τα επίσημα
        κριτήρια.
      </div>
      <div class="actions">
        <a
          :href="opportunity.officialUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary"
          @click="trackOfficialClick"
        >
          Επίσημος Σύνδεσμος
        </a>
        <button
          v-if="isAuthenticated"
          @click="toggleBookmark"
          class="btn btn-secondary"
        >
          {{ isBookmarked ? "Αφαίρεση" : "Προσθήκη" }} σε Αγαπημένα
        </button>
      </div>
      <WhyThis v-if="isAuthenticated" :opportunity-id="opportunity._id" />
    </div>
    <div v-else class="error">Δεν βρέθηκε ευκαιρία</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { api } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth.store";
import { useBookmarksStore } from "../../stores/bookmarks.store";
import { useTracking } from "../../composables/useTracking";
import Badge from "../../components/Badge.vue";
import WhyThis from "../../components/WhyThis.vue";

const route = useRoute();
const authStore = useAuthStore();
const bookmarksStore = useBookmarksStore();
const { trackOfficialClick: trackClick } = useTracking();

const opportunity = ref(null);
const loading = ref(true);
const isBookmarked = ref(false);

const isAuthenticated = computed(() => authStore.isAuthenticated);

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("el-GR");
}

function trackOfficialClick() {
  if (opportunity.value) {
    trackClick(opportunity.value._id);
  }
}

async function toggleBookmark() {
  if (!opportunity.value) return;
  try {
    if (isBookmarked.value) {
      await bookmarksStore.removeBookmark(opportunity.value._id);
    } else {
      await bookmarksStore.addBookmark(opportunity.value._id);
    }
    isBookmarked.value = !isBookmarked.value;
  } catch (error) {
    console.error("Failed to toggle bookmark:", error);
  }
}

onMounted(async () => {
  try {
    const response = await api.opportunities.get(route.params.id as string);
    opportunity.value = response.data;

    if (isAuthenticated.value) {
      await bookmarksStore.fetchBookmarks();
      isBookmarked.value = bookmarksStore.bookmarks.some(
        (b: any) => b.opportunityId._id === opportunity.value._id
      );
    }
  } catch (error) {
    console.error("Failed to fetch opportunity:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.opportunity-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.header h1 {
  color: var(--text-primary);
}

.meta {
  display: flex;
  gap: 1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.summary {
  margin-bottom: 2rem;
}

.summary h2 {
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.summary p {
  color: var(--text-primary);
  line-height: 1.6;
}

.disclaimer {
  background: var(--warning);
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid var(--warning);
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.dark .disclaimer {
  background-color: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
}

.actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.btn {
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.error {
  text-align: center;
  padding: 2rem;
  color: var(--error);
}
</style>
