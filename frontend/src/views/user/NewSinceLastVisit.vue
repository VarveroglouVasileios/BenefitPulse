<template>
  <div class="new-since-last-visit">
    <h1>Νέα από την Τελευταία Επίσκεψη</h1>
    <Badge v-if="opportunities.length > 0" :count="opportunities.length" />
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else class="opportunities-grid">
      <OpportunityCard
        v-for="opp in opportunities"
        :key="opp._id"
        :opportunity="opp"
      />
    </div>
    <div v-if="!loading && opportunities.length === 0" class="empty">
      <p>Δεν υπάρχουν νέα από την τελευταία επίσκεψή σας</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useOpportunitiesStore } from "../../stores/opportunities.store";
import OpportunityCard from "../../components/OpportunityCard.vue";
import Badge from "../../components/Badge.vue";

const opportunitiesStore = useOpportunitiesStore();
const { opportunities, loading } = opportunitiesStore;

onMounted(() => {
  opportunitiesStore.fetchNewSinceLastVisit();
});
</script>

<style scoped>
.new-since-last-visit {
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
