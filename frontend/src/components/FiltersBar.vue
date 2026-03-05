<template>
  <div class="filters-bar">
    <button
      class="filters-toggle"
      :class="{ expanded: filtersExpanded }"
      @click="filtersExpanded = !filtersExpanded"
      :aria-expanded="filtersExpanded"
    >
      Φίλτρα
      <span v-if="activeCount > 0" class="filter-count">{{ activeCount }}</span>
      <svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <div v-show="filtersExpanded" class="filters-panel">
      <div class="filter-group type-filter">
        <span class="filter-label">Τύπος προγράμματος</span>
        <div class="type-chips">
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            class="chip"
            :class="{ active: localFilters.type === opt.value }"
            @click="setType(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="filter-group search-group">
        <label class="filter-label" for="filter-search">Αναζήτηση</label>
        <input
          id="filter-search"
          v-model="localFilters.search"
          type="search"
          placeholder="Όροι αναζήτησης..."
          class="search-input"
          @input="debouncedUpdate"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";

interface Props {
  filters: {
    type?: string;
    search?: string;
    source?: string;
    kind?: string;
  };
}

const props = defineProps<Props>();
const emit = defineEmits(["update:filters"]);

const filtersExpanded = ref(true);
const localFilters = ref({
  type: props.filters.type || "",
  search: props.filters.search || "",
});

const typeOptions = [
  { value: "", label: "Όλα" },
  { value: "subsidy", label: "Επίδομα" },
  { value: "voucher", label: "Voucher" },
  { value: "program", label: "Πρόγραμμα" },
  { value: "public_call", label: "Προκήρυξη" },
  { value: "asep_competition", label: "ΑΣΕΠ" },
];

const activeCount = computed(() => {
  let n = 0;
  if (localFilters.value.type) n++;
  if (localFilters.value.search?.trim()) n++;
  return n;
});

let searchDebounce: ReturnType<typeof setTimeout>;

function setType(value: string) {
  localFilters.value.type = value;
  updateFilters();
}

function debouncedUpdate() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(updateFilters, 300);
}

function updateFilters() {
  emit("update:filters", { ...props.filters, ...localFilters.value });
}

watch(
  () => props.filters,
  (newFilters) => {
    localFilters.value = {
      type: newFilters.type || "",
      search: newFilters.search || "",
    };
  },
  { deep: true }
);
</script>

<style scoped>
.filters-bar {
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--bg-secondary);
}

.filters-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.filters-toggle:hover {
  background: var(--bg-tertiary);
}

.chevron {
  margin-left: auto;
  transition: transform 0.2s;
}

.filters-toggle.expanded .chevron {
  transform: rotate(180deg);
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--accent-primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
}

.filters-panel {
  padding: 0 1rem 1rem;
  border-top: 1px solid var(--border-color);
}

.filter-group {
  margin-top: 1rem;
}

.filter-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.chip.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-light);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

@media (min-width: 768px) {
  .filters-toggle {
    display: none;
  }

  .filters-panel {
    display: flex !important;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: flex-end;
    border-top: none;
    padding: 1rem;
  }

  .filter-group {
    margin-top: 0;
  }

  .filter-group.type-filter {
    flex: 1;
    min-width: 0;
  }

  .filter-group.search-group {
    flex: 0 0 280px;
  }
}
</style>
