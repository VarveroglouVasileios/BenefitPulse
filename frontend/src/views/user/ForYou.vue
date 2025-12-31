<template>
  <div class="for-you">
    <div class="header">
      <div>
        <h1>Για Εσάς</h1>
        <p>Ευκαιρίες που πιθανόν σας αφορούν</p>
      </div>
      <div class="header-actions">
        <router-link to="/profile/wizard" class="btn-update-profile">
          <span>✏️</span>
          <span>Ενημέρωση Προφίλ</span>
        </router-link>
        <div v-if="!loading && (matched.length > 0 || unknown.length > 0)" class="total-badge">
          <span class="total-number">{{ totalCount }}</span>
          <span class="total-label">{{ totalCount === 1 ? 'ευκαιρία' : 'ευκαιρίες' }}</span>
        </div>
      </div>
    </div>

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
        class="empty"
      >
        <p>
          Δεν βρέθηκαν ευκαιρίες. Συμπληρώστε το προφίλ σας για καλύτερες
          προτάσεις.
        </p>
        <router-link to="/profile/wizard" class="btn"
          >Ενημέρωση Προφίλ</router-link
        >
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { api } from "../../api/endpoints";
import OpportunityCard from "../../components/OpportunityCard.vue";

const matched = ref<any[]>([]);
const unknown = ref<any[]>([]);
const hasProfile = ref<boolean | null>(null);
const loading = ref(true);

// Computed total count
const totalCount = computed(() => matched.value.length + unknown.value.length);

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
  padding: 2rem;
}

.section {
  margin-top: 2rem;
}

.section.secondary {
  margin-top: 3rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-update-profile {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary-color, #4F46E5);
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.btn-update-profile:hover {
  background: var(--primary-color-dark, #4338CA);
}

.btn-update-profile span:first-child {
  font-size: 1.1rem;
}

.total-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary, #f3f4f6);
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1rem 1.5rem;
  min-width: 120px;
}

.total-number {
  font-size: 2rem;
  font-weight: bold;
  color: var(--primary-color, #4F46E5);
  line-height: 1;
}

.total-label {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  margin-top: 0.25rem;
  text-transform: lowercase;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
  }
  
  .header-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn-update-profile {
    width: 100%;
    justify-content: center;
  }
  
  .total-badge {
    width: 100%;
    flex-direction: row;
    gap: 0.5rem;
    justify-content: center;
  }
  
  .total-number {
    font-size: 1.5rem;
  }
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

.btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  margin-top: 1rem;
}
</style>
