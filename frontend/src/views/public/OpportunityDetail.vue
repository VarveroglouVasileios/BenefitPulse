<template>
  <div class="opportunity-detail">
    <div class="nav-actions">
      <button @click="router.back()" class="back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Πίσω
      </button>
    </div>
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else-if="opportunity">
      <div class="header">
        <h1>{{ opportunity.title }}</h1>
        <Badge :type="opportunity.type" />
      </div>
      <div class="meta">
        <span v-if="opportunity.region && opportunity.region !== 'nationwide'">📍 Περιοχή: {{ formatRegion(opportunity.region) }}</span>
        <span>🔗 Πηγή: {{ opportunity.source }}</span>
        <span>📅 Δημοσιεύτηκε: {{ formatDate(opportunity.publishedAt) }}</span>
        <span v-if="opportunity.deadlineAt" class="deadline">
          ⏳ Προθεσμία: {{ formatDate(opportunity.deadlineAt) }}
        </span>
      </div>
      
      <div v-if="opportunity.tags && opportunity.tags.length" class="tags">
        <span v-for="tag in opportunity.tags" :key="tag" class="tag-chip">
          #{{ tag }}
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
      <WhyThis v-if="isAuthenticated" :opportunity-id="opportunity._id ?? ''" />
    </div>
    <div v-else class="error">Δεν βρέθηκε ευκαιρία</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from '@unhead/vue';
import { api } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth.store";
import { useBookmarksStore } from "../../stores/bookmarks.store";
import { useTracking } from "../../composables/useTracking";
import type { Opportunity } from "@shared/types";
import Badge from "../../components/Badge.vue";
import WhyThis from "../../components/WhyThis.vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const bookmarksStore = useBookmarksStore();
const { trackOfficialClick: trackClick } = useTracking();

const opportunity = ref<Opportunity | null>(null);
const loading = ref(true);
const isBookmarked = ref(false);

const isAuthenticated = computed(() => authStore.isAuthenticated);

function formatRegion(region: string): string {
  const regions: Record<string, string> = {
    attiki: "Αττική",
    central_macedonia: "Κεντρική Μακεδονία",
    western_macedonia: "Δυτική Μακεδονία",
    eastern_macedonia_thrace: "Ανατ. Μακεδονία & Θράκη",
    epirus: "Ήπειρος",
    thessaly: "Θεσσαλία",
    ionian_islands: "Νησιά Ιονίου",
    western_greece: "Δυτική Ελλάδα",
    central_greece: "Στερεά Ελλάδα",
    peloponnese: "Πελοπόννησος",
    north_aegean: "Βόρειο Αιγαίο",
    south_aegean: "Νότιο Αιγαίο",
    crete: "Κρήτη",
    nationwide: "Πανελλαδικά",
  };
  return regions[region] || region;
}

function formatDate(date: string | Date): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString("el-GR");
}

function trackOfficialClick() {
  if (opportunity.value?._id) {
    trackClick(opportunity.value._id);
  }
}

async function toggleBookmark() {
  if (!opportunity.value?._id) return;
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
    const id = route.params.id;
    if (typeof id !== 'string') return;
    
    const response = await api.opportunities.get(id);
    opportunity.value = response.data;

    if (isAuthenticated.value && opportunity.value?._id) {
      await bookmarksStore.fetchBookmarks();
      isBookmarked.value = bookmarksStore.bookmarks.some(
        (b: any) => b.opportunityId?._id === opportunity.value?._id
      );
    }
  } catch (error) {
    console.error("Failed to fetch opportunity:", error);
  } finally {
    loading.value = false;
  }
});

// Dynamic Open Graph meta tags for social media sharing
// Dynamic Open Graph meta tags for social media sharing
const pageTitle = computed(() => 
  opportunity.value ? `${opportunity.value.title} - BenefitPulse` : 'BenefitPulse'
);
const pageDescription = computed(() => 
  opportunity.value?.summary?.substring(0, 160) || 'Δείτε αυτή την ευκαιρία στο BenefitPulse'
);
const pageUrl = computed(() => 
  typeof window !== 'undefined' ? `${window.location.origin}/opportunities/${route.params.id}` : ''
);

useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: pageDescription },
    // Open Graph
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: pageUrl },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageDescription },
    { property: 'og:site_name', content: 'BenefitPulse' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: pageUrl },
    { name: 'twitter:title', content: pageTitle },
    { name: 'twitter:description', content: pageDescription },
  ],
});
</script>

<style scoped>
.opportunity-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  min-width: 0;
  overflow-x: hidden;
}

.nav-actions {
  margin-bottom: 1.5rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

@media (min-width: 640px) {
  .opportunity-detail {
    padding: 2rem;
  }
}

.header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.header h1 {
  color: var(--text-primary);
  font-size: 1.35rem;
  line-height: 1.3;
}

@media (min-width: 640px) {
  .header h1 {
    font-size: 1.75rem;
  }
}

.meta span {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.deadline {
  color: #e53e3e; /* Red color for deadlines to make them stand out */
  font-weight: 600;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.tag-chip {
  background: var(--surface-2);
  color: var(--text-secondary);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid var(--border);
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
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

@media (max-width: 480px) {
  .actions .btn {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
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
