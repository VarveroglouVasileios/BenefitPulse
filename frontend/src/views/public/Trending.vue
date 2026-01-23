<template>
  <div class="trending">
    <h1>Δημοφιλή</h1>
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else class="opportunities-grid">
      <OpportunityCard
        v-for="opp in opportunities"
        :key="opp._id"
        :opportunity="opp"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../../api/endpoints";
import OpportunityCard from "../../components/OpportunityCard.vue";

const opportunities = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const response = await api.opportunities.trending(24);
    opportunities.value = response.data;
  } catch (error) {
    console.error("Failed to fetch trending:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.trending {
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
</style>
