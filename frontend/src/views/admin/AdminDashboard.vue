<template>
  <div class="admin-dashboard">
    <h1>Admin Dashboard</h1>
    <div v-if="metricsLoading" class="loading">Φόρτωση...</div>
    <div v-else-if="metrics" class="metrics">
      <div class="metric-card">
        <h3>Χρήστες</h3>
        <p class="big">{{ metrics.users.total }}</p>
        <p>Νέοι σήμερα: {{ metrics.users.newToday }}</p>
        <p>
          DAU: {{ metrics.users.dau }} | WAU: {{ metrics.users.wau }} | MAU:
          {{ metrics.users.mau }}
        </p>
      </div>
      <div class="metric-card">
        <h3>Περιεχόμενο</h3>
        <p class="big">{{ metrics.content.total }}</p>
        <p>Δημοσιευμένα: {{ metrics.content.published }}</p>
      </div>
      <div class="metric-card">
        <h3>Events</h3>
        <p class="big">{{ metrics.events.total }}</p>
      </div>
    </div>
    <div class="actions">
      <router-link to="/admin/opportunities" class="btn"
        >Διαχείριση Ευκαιριών</router-link
      >
      <router-link to="/admin/drafts" class="btn">Draft Queue</router-link>
      <router-link to="/admin/audit" class="btn">Audit Log</router-link>
      <router-link to="/admin/contact" class="btn">Επικοινωνία</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { useAdminStore } from "../../stores/admin.store";

const adminStore = useAdminStore();
const { metrics, metricsLoading } = storeToRefs(adminStore);
const route = useRoute();

// Fetch metrics on mount
onMounted(() => {
  adminStore.fetchMetrics();
});

// Re-fetch when route changes (e.g., navigating back to dashboard)
watch(() => route.path, (newPath) => {
  if (newPath === "/admin" || newPath === "/admin/") {
    adminStore.fetchMetrics();
  }
}, { immediate: false });
</script>

<style scoped>
.admin-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--text-primary);
}

.admin-dashboard h1 {
  color: var(--text-primary);
  margin-bottom: 2rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.metric-card {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.metric-card h3 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.metric-card p {
  color: var(--text-secondary);
  margin: 0.25rem 0;
}

.metric-card .big {
  font-size: 2rem;
  font-weight: bold;
  margin: 0.5rem 0;
  color: var(--text-primary);
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  background: var(--accent-primary);
  color: white;
  text-decoration: none;
  border-radius: 0.25rem;
  transition: background 0.2s;
}

.btn:hover {
  background: var(--accent-hover);
}
</style>
