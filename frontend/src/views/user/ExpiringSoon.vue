<template>
  <div class="expiring-soon">
    <h1>Λήγουν Σύντομα</h1>
    <p>Ευκαιρίες με προθεσμία εντός 30 ημερών</p>
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else-if="opportunities.length === 0" class="empty-state">
      <div class="empty-illustration">
        <div class="clock-pulse"></div>
        <div class="empty-icon" aria-hidden="true">⏳</div>
      </div>
      <h2 class="empty-title">Όλα υπό έλεγχο</h2>
      <p class="empty-text">
        Δεν υπάρχουν ευκαιρίες που να λήγουν άμεσα. Μπορείτε να περιηγηθείτε σε όλες τις διαθέσιμες παροχές.
      </p>
      <div class="empty-actions">
        <router-link to="/opportunities" class="btn-primary-link">Δείτε όλες τις ευκαιρίες</router-link>
      </div>
    </div>
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
  padding: 1rem;
}

@media (min-width: 640px) {
  .expiring-soon {
    padding: 2rem;
  }
}

.opportunities-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 2rem;
}

@media (min-width: 640px) {
  .opportunities-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

.empty-state {
  text-align: center;
  padding: 4rem 1.5rem;
  max-width: 32rem;
  margin: 0 auto;
  color: var(--text-secondary);
}

.empty-illustration {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  font-size: 3rem;
  z-index: 2;
}

.clock-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  background: var(--warning);
  opacity: 0.1;
  border-radius: 50%;
  animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.1; }
  100% { transform: scale(0.8); opacity: 0.3; }
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
}

.btn-primary-link {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  font-weight: 600;
  background: var(--primary-color);
  color: white;
  text-decoration: none;
  transition: transform 0.2s, background-color 0.2s;
}

.btn-primary-link:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
</style>
