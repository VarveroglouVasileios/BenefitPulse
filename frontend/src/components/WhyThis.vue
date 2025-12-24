<template>
  <div class="why-this">
    <h3>Γιατί το βλέπω;</h3>
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else-if="reasons">
      <div v-if="reasons.matched && reasons.reasons.length > 0">
        <p><strong>Αυτή η ευκαιρία πιθανόν να σας αφορά γιατί:</strong></p>
        <ul>
          <li v-for="(reason, index) in reasons.reasons" :key="index">
            {{ reason }}
          </li>
        </ul>
      </div>
      <div v-else>
        <p>
          Δεν υπάρχουν συγκεκριμένοι λόγοι. Συμπληρώστε το προφίλ σας για
          καλύτερες προτάσεις.
        </p>
      </div>
      <div
        v-if="reasons.missingFields && reasons.missingFields.length > 0"
        class="missing"
      >
        <p><strong>Λείπουν στοιχεία:</strong></p>
        <ul>
          <li v-for="(field, index) in reasons.missingFields" :key="index">
            {{ field }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/endpoints";

interface Props {
  opportunityId: string;
}

const props = defineProps<Props>();

type MatchReasons = {
  matched: boolean;
  reasons: string[];
  missingFields: string[];
};

const reasons = ref<MatchReasons | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const response = await api.opportunities.matchReasons(props.opportunityId);
    reasons.value = response.data;
  } catch (error) {
    console.error("Failed to fetch match reasons:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.why-this {
  background: #e7f3ff;
  border: 1px solid #b3d9ff;
  padding: 1.5rem;
  border-radius: 0.5rem;
  margin-top: 2rem;
}

.why-this ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.missing {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #b3d9ff;
}
</style>
