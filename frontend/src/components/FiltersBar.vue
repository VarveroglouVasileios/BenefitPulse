<template>
  <div class="filters-bar">
    <select v-model="localFilters.type" @change="updateFilters">
      <option value="">Όλοι οι τύποι</option>
      <option value="subsidy">Επίδομα</option>
      <option value="voucher">Voucher</option>
      <option value="program">Πρόγραμμα</option>
      <option value="public_call">Προκήρυξη</option>
      <option value="asep_competition">ΑΣΕΠ</option>
    </select>
    <input
      v-model="localFilters.search"
      type="text"
      placeholder="Αναζήτηση..."
      @input="updateFilters"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

interface Props {
  filters: {
    type?: string;
    search?: string;
  };
}

const props = defineProps<Props>();
const emit = defineEmits(["update:filters"]);

const localFilters = ref({
  type: props.filters.type || "",
  search: props.filters.search || "",
});

function updateFilters() {
  emit("update:filters", localFilters.value);
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
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.filters-bar select,
.filters-bar input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}

.filters-bar input {
  flex: 1;
}
</style>
