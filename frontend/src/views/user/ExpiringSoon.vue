<template>
  <div class="expiring-soon">
    <h1>Λήγουν Σύντομα</h1>
    <p>Ευκαιρίες με προθεσμία εντός 30 ημερών</p>
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
  opportunitiesStore.fetchExpiringSoon(30);
});
</script>

<style scoped>
.expiring-soon {
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
