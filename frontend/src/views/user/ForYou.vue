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
  padding: 2rem;
}

.section {
  margin-top: 2rem;
}

.section.secondary {
  margin-top: 3rem;
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
