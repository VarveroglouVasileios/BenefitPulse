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
      <div v-if="hasActiveFilters" class="active-filters">
        <div class="active-filters-chips">
          <span v-if="filters.search" class="filter-chip"
            >Αναζήτηση: «<strong>{{ filters.search }}</strong>»</span
          >
          <span v-if="filters.tag" class="filter-chip"
            >Κατηγορία: <strong>{{ tagLabel(filters.tag) }}</strong></span
          >
          <span v-if="filters.type" class="filter-chip"
            >Τύπος: <strong>{{ typeLabel(filters.type) }}</strong></span
          >
        </div>
        <button type="button" @click="clearFilters" class="clear-filters-btn">✕ Καθαρισμός Φίλτρων</button>
      </div>

      <div v-if="opportunities.length === 0" class="empty-state">
        <div class="empty-icon" aria-hidden="true">🔍</div>
        <h2 class="empty-title">Δεν βρέθηκαν αποτελέσματα</h2>
        <p class="empty-text">
          <template v-if="hasActiveFilters || activeTab !== 'all'">
            Δοκίμασε να αλλάξεις την καρτέλα ή να αφαιρέσεις τα φίλτρα — έτσι θα εμφανιστούν περισσότερες ευκαιρίες.
          </template>
          <template v-else>Αυτή τη στιγμή δεν υπάρχουν δημοσιευμένες εγγραφές που να ταιριάζουν.</template>
        </p>
        <div class="empty-actions">
          <button v-if="hasActiveFilters || activeTab !== 'all'" type="button" class="btn-reset" @click="clearFilters">
            Επαναφορά φίλτρων
          </button>
          <router-link v-else to="/" class="btn-secondary-link">Αρχική σελίδα</router-link>
        </div>
      </div>
      <div v-else class="opportunities-grid">
        <OpportunityCard
          v-for="opp in opportunities"
          :key="opp._id"
          :opportunity="opp"
        />
      </div>
      <div v-if="opportunities.length > 0" class="pagination">
        <button type="button" @click="prevPage" :disabled="page === 1">Προηγούμενο</button>
        <span>Σελίδα {{ page }} από {{ totalPages }}</span>
        <button type="button" @click="nextPage" :disabled="!hasMore">Επόμενο</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
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
const filters = ref({ type: "", kind: "", source: "", search: "", tag: "" });

const TAG_LABELS: Record<string, string> = {
  youth: "Νέοι",
  family: "Οικογένεια",
  unemployment: "Ανεργία",
  housing: "Στέγαση",
  disability: "ΑμεΑ",
};

const TYPE_LABELS: Record<string, string> = {
  subsidy: "Επίδομα",
  voucher: "Voucher",
  program: "Πρόγραμμα",
  public_call: "Προκήρυξη",
  asep_competition: "ΑΣΕΠ",
};

function tagLabel(slug: string) {
  return TAG_LABELS[slug] || slug;
}

function typeLabel(slug: string) {
  return TYPE_LABELS[slug] || slug;
}

const hasActiveFilters = computed(
  () =>
    !!(filters.value.search?.trim() || filters.value.type || filters.value.kind || filters.value.source || filters.value.tag),
);

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
  activeTab.value = "all";
  filters.value = { type: "", kind: "", source: "", search: "", tag: "" };
  page.value = 1;
  router.replace({ query: {} });
}

function syncFiltersFromRoute() {
  const q = route.query as Record<string, string | undefined>;
  const combined = (q.search || q.query || "").trim();
  filters.value.search = combined;
  filters.value.tag = typeof q.tag === "string" ? q.tag : "";
}

watch(() => route.query, syncFiltersFromRoute, { immediate: true });

watch(
  [activeTab, filters],
  () => {
    page.value = 1;
    fetchOpportunities();
  },
  { deep: true },
);

onMounted(() => {
  fetchOpportunities();
});
</script>

<style scoped>
.all-opportunities {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  min-width: 0;
  overflow-x: hidden;
  width: 100%;
}

@media (min-width: 640px) {
  .all-opportunities {
    padding: 2rem;
  }
}

.all-opportunities h1 {
  color: var(--text-primary);
  margin-bottom: 1.5rem;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--border-color);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.25rem;
}

.tab-button {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .tab-button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
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

.empty-state {
  text-align: center;
  padding: 3rem 1.5rem 4rem max(2rem, 6vw);
  max-width: 28rem;
  margin: 0 auto;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 2.75rem;
  line-height: 1;
  margin-bottom: 1rem;
  filter: grayscale(0.2);
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
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.btn-reset {
  appearance: none;
  border: none;
  cursor: pointer;
  padding: 0.65rem 1.25rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.95rem;
  background: var(--accent-primary);
  color: #fff;
  transition: background 0.2s, transform 0.15s;
}

.btn-reset:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn-secondary-link {
  display: inline-flex;
  align-items: center;
  padding: 0.65rem 1.25rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  text-decoration: none;
  background: var(--bg-secondary);
  transition: border-color 0.2s, background 0.2s;
}

.btn-secondary-link:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.active-filters-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.filter-chip {
  font-size: 0.875rem;
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
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-top: 1.5rem;
}

@media (min-width: 640px) {
  .opportunities-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.pagination {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
  padding: 0 0.5rem;
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
  font-size: 0.9rem;
}

@media (max-width: 480px) {
  .all-opportunities h1 {
    font-size: 1.5rem;
  }
}
</style>
