<template>
  <div class="for-you">
    <h1>Για Εσάς</h1>
    <p>Ευκαιρίες που πιθανόν σας αφορούν</p>

    <div v-if="loading" class="loading">Φόρτωση...</div>

    <template v-else>
      <section v-if="matched.length" class="section">
        <h2>Ταιριάζουν στο προφίλ σας</h2>
        <div class="opportunities-grid">
          <OpportunityCard
            v-for="opp in matched"
            :key="opp._id"
            :opportunity="opp"
          />
        </div>
      </section>

      <section v-if="unknown.length" class="section secondary">
        <h2>Ίσως σας αφορούν (χρειάζονται περισσότερα στοιχεία)</h2>
        <p class="hint">
          Αυτές οι ευκαιρίες δεν έχουν πλήρη κριτήρια επιλεξιμότητας. Ελέγξτε τις
          λεπτομέρειες στην επίσημη σελίδα.
        </p>
        <div class="opportunities-grid">
          <OpportunityCard
            v-for="opp in unknown"
            :key="opp._id"
            :opportunity="opp"
          />
        </div>
      </section>

      <div
        v-if="!matched.length && !unknown.length"
        class="empty-state"
      >
        <div class="empty-illustration">
          <div class="sparkle-pulse"></div>
          <div class="empty-icon" aria-hidden="true">✨</div>
        </div>
        <h2 class="empty-title">Χρειαζόμαστε περισσότερα στοιχεία</h2>
        <p class="empty-text">
          Συμπληρώστε το προφίλ σας για να βρούμε τις ευκαιρίες που ταιριάζουν ακριβώς στις ανάγκες σας.
        </p>
        <div class="empty-actions">
          <router-link to="/profile/wizard" class="btn-primary-link">Ενημέρωση Προφίλ</router-link>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../../api/endpoints";
import OpportunityCard from "../../components/OpportunityCard.vue";

const matched = ref<any[]>([]);
const unknown = ref<any[]>([]);
const hasProfile = ref<boolean | null>(null);
const loading = ref(true);

onMounted(async () => {
  loading.value = true;
  try {
    const [matchedRes, forYouRes] = await Promise.all([
      api.opportunities.matched(),
      api.opportunities.forYou(),
    ]);

    matched.value = (matchedRes.data || []).map(
      (item: any) => item.opportunity
    );
    unknown.value = forYouRes.data.unknown || [];
    hasProfile.value = forYouRes.data.hasProfile ?? true;
  } catch (error) {
    console.error("Failed to fetch ForYou opportunities:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.for-you {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

@media (min-width: 640px) {
  .for-you {
    padding: 2rem;
  }
}

.section {
  margin-top: 2rem;
}

.section.secondary {
  margin-top: 3rem;
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

.sparkle-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  background: var(--primary-color);
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
