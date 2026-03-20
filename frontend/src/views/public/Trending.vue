<template>
  <div class="trending">
    <h1>Δημοφιλή</h1>
    <div v-if="loading" class="opportunities-grid">
      <SkeletonOpportunityCard v-for="n in 8" :key="n" />
    </div>
    <template v-else>
      <div v-if="opportunities.length === 0" class="empty-state">
        <div class="empty-icon" aria-hidden="true">📊</div>
        <h2 class="empty-title">Δεν βρέθηκαν δημοφιλή αυτή τη στιγμή</h2>
        <p class="empty-text">Δοκίμασε να δεις όλες τις ευκαιρίες ή την αρχική.</p>
        <div class="empty-actions">
          <router-link to="/opportunities" class="btn-link">Όλες οι ευκαιρίες</router-link>
          <router-link to="/" class="btn-link secondary">Αρχική</router-link>
        </div>
      </div>
      <div v-else class="opportunities-grid">
        <OpportunityCard
          v-for="opp in opportunities"
          :key="opp._id"
          :opportunity="opp"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../../api/endpoints";
import OpportunityCard from "../../components/OpportunityCard.vue";
import SkeletonOpportunityCard from "../../components/SkeletonOpportunityCard.vue";

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

.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  max-width: 26rem;
  margin: 2rem auto 0;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  background: var(--bg-secondary);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.empty-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.empty-text {
  margin: 0;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1.25rem;
}

.btn-link {
  display: inline-flex;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  background: var(--accent-primary);
  color: #fff;
}

.btn-link.secondary {
  background: transparent;
  color: var(--accent-primary);
  border: 1px solid var(--border-color);
}
</style>
