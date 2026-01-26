<template>
  <div class="all-opportunities">
    <h1>Όλες οι Ευκαιρίες</h1>
    
    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        :class="{ active: activeTab === tab.value }"
        class="tab-button"
      >
        {{ tab.label }}
      </button>
    </div>
    
    <FiltersBar v-model:filters="filters" />
    
    <div v-if="loading" class="opportunities-grid">
      <SkeletonOpportunityCard v-for="n in 6" :key="n" />
    </div>
    
    <div v-else>
      <!-- Active Filters Summary -->
      <div v-if="filters.search || filters.type || filters.source || filters.kind" class="active-filters">
        <span v-if="filters.search">Αναζήτηση: "<strong>{{ filters.search }}</strong>"</span>
        <button @click="clearFilters" class="clear-filters-btn">✕ Καθαρισμός Φίλτρων</button>
      </div>

      <div v-if="opportunities.length === 0" class="empty">
        <p>Δεν βρέθηκαν ευκαιρίες{{ filters.search ? ` για "${filters.search}"` : '' }}</p>
        <button v-if="filters.search" @click="clearFilters" class="btn-link">Επιστροφή σε όλες</button>
      </div>
      <div v-else class="opportunities-grid">
        <OpportunityCard
          v-for="opp in opportunities"
          :key="opp._id"
          :opportunity="opp"
        />
      </div>
      <div class="pagination">
        <button @click="prevPage" :disabled="page === 1">Προηγούμενο</button>
        <span>Σελίδα {{ page }} από {{ totalPages }}</span>
        <button @click="nextPage" :disabled="!hasMore">Επόμενο</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../../api/endpoints";
import type { Opportunity } from "@shared/types";
import OpportunityCard from "../../components/OpportunityCard.vue";
import SkeletonOpportunityCard from "../../components/SkeletonOpportunityCard.vue";
import FiltersBar from "../../components/FiltersBar.vue";

const route = useRoute();
const router = useRouter();
const opportunities = ref<Opportunity[]>([]);
const loading = ref(true);
const page = ref(1);
const total = ref(0);
const limit = ref(20);
const activeTab = ref<"news" | "upcoming" | "current" | "all">("all");
const filters = ref({ type: "", kind: "", source: "", search: "" });

const tabs = [
  { value: "news" as const, label: "Νέα" },
  { value: "upcoming" as const, label: "Προσεχώς" },
  { value: "current" as const, label: "Τρέχοντα" },
  { value: "all" as const, label: "Όλα" },
];

const totalPages = computed(() => Math.ceil(total.value / limit.value));
const hasMore = computed(() => page.value < totalPages.value);

async function fetchOpportunities() {
  loading.value = true;
  try {
    const response = await api.opportunities.feed({
      tab: activeTab.value,
      page: page.value,
      limit: limit.value,
      ...filters.value,
    });
    opportunities.value = response.data.opportunities;
    total.value = response.data.total;
  } catch (error) {
    console.error("Failed to fetch opportunities:", error);
  } finally {
    loading.value = false;
  }
}

function nextPage() {
  page.value++;
  fetchOpportunities();
}

function prevPage() {
  if (page.value > 1) {
    page.value--;
    fetchOpportunities();
  }
}

function clearFilters() {
  filters.value = { type: "", kind: "", source: "", search: "" };
  opportunities.value = [];
  loading.value = true;
  router.push({ query: {} });
}

watch(
  [activeTab, filters],
  () => {
    page.value = 1;
    // Debounce could be added here if needed, but for now direct fetch is fine
    fetchOpportunities();
  },
  { deep: true }
);

// Sync query params with filters
watch(
  () => route.query,
  (newQuery) => {
    // If search is present updates it, otherwise if undefined (cleared) resets it to empty string
    filters.value.search = (newQuery.search as string) || "";
  },
  { immediate: true }
);

onMounted(() => {
  // Initial sync from query is handled by the immediate watch above
  // just need to trigger initial fetch if not triggered by watch (though watch likely triggers it)
  // Actually, watch immediate triggers sync, then filters change triggers fetch. 
  // But let's keep explicit fetch for clarity if no query.
  if (!route.query.search) {
    fetchOpportunities();
  }
});
</script>

<style scoped>
.all-opportunities {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.all-opportunities h1 {
  color: var(--text-primary);
  margin-bottom: 1.5rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--border-color);
}

.tab-button {
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-button:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: 600;
}

.empty {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-tertiary);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  flex-wrap: wrap;
}

.clear-filters-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--primary-color);
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary-color);
  text-decoration: underline;
  cursor: pointer;
  margin-top: 1rem;
  font-weight: 600;
}

.opportunities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.pagination button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 0.25rem;
  transition: background 0.2s, border-color 0.2s;
}

.pagination button:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: var(--border-hover);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  color: var(--text-secondary);
}
</style>
