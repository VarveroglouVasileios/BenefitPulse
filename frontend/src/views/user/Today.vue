<template>
  <div class="today">
    <h1>Σήμερα</h1>
    <p>Νέες ευκαιρίες που δημοσιεύτηκαν σήμερα</p>
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
import { onMounted } from "vue";
import { useOpportunitiesStore } from "../../stores/opportunities.store";
import OpportunityCard from "../../components/OpportunityCard.vue";

const opportunitiesStore = useOpportunitiesStore();
const { opportunities, loading } = opportunitiesStore;

onMounted(() => {
  opportunitiesStore.fetchToday();
});
</script>

<style scoped>
.today {
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
