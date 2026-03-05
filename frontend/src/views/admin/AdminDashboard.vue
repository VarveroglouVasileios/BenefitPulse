<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1>Admin Dashboard</h1>
      <p class="subtitle">Επισκόπηση συστήματος και μετρικές</p>
    </div>

    <!-- Metrics Grid -->
    <div v-if="metricsLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Φόρτωση μετρικών...</p>
    </div>
    
    <div v-else-if="metrics" class="metrics-grid">
      <!-- Users Card -->
      <div class="metric-card primary">
        <div class="card-icon">👥</div>
        <div class="card-content">
          <h3>Χρήστες</h3>
          <p class="big-number">{{ metrics.users.total }}</p>
          <div class="stats-row">
            <span class="stat-item">
              <span class="dot green"></span> +{{ metrics.users.newToday }} σήμερα
            </span>
          </div>
          <div class="stats-mini">
            <span>Active (Today): <strong>{{ metrics.users.dau }}</strong></span>
            <span>Active (30d): <strong>{{ metrics.users.mau }}</strong></span>
          </div>
        </div>
      </div>

      <!-- Content Card -->
      <div class="metric-card secondary">
        <div class="card-icon">📄</div>
        <div class="card-content">
          <h3>Περιεχόμενο</h3>
          <p class="big-number">{{ metrics.content.total }}</p>
          <div class="stats-row">
            <span class="stat-item">
              <span class="dot blue"></span> {{ metrics.content.published }} δημοσιευμένα
            </span>
          </div>
        </div>
      </div>

      <!-- Events Card -->
      <div class="metric-card tertiary">
        <div class="card-icon">⚡</div>
        <div class="card-content">
          <h3>Interactions</h3>
          <p class="big-number">{{ metrics.events.total }}</p>
          <div class="stats-row">
            <span class="stat-item">Clicks, Views, Submissions</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section-title">Γρήγορες Ενέργειες</div>
    <div class="actions-grid">
      <router-link to="/admin/opportunities" class="action-card">
        <div class="action-icon">💼</div>
        <div class="action-info">
          <h3>Διαχείριση Ευκαιριών</h3>
          <p>Προβολή, επεξεργασία και δημοσίευση</p>
        </div>
      </router-link>

      <router-link to="/admin/drafts" class="action-card">
        <div class="action-icon">📝</div>
        <div class="action-info">
          <h3>Draft Queue</h3>
          <p>Εκκρεμείς εγγραφές για έλεγχο</p>
        </div>
      </router-link>

      <router-link to="/admin/audit" class="action-card">
        <div class="action-icon">🛡️</div>
        <div class="action-info">
          <h3>Audit Log</h3>
          <p>Ιστορικό ενεργειών συστήματος</p>
        </div>
      </router-link>

      <router-link to="/admin/contact" class="action-card">
        <div class="action-icon">📬</div>
        <div class="action-info">
          <h3>Επικοινωνία</h3>
          <p>Μηνύματα χρηστών</p>
        </div>
      </router-link>
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
  min-height: 80vh;
}

.dashboard-header {
  margin-bottom: 3rem;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 4rem;
  background: var(--bg-secondary);
  border-radius: 1rem;
  border: 1px solid var(--border-color);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--bg-tertiary);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.metric-card {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 1rem;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
}

.metric-card.primary::before { background: #34d399; }
.metric-card.secondary::before { background: #60a5fa; }
.metric-card.tertiary::before { background: #fbbf24; }

.card-icon {
  font-size: 2rem;
  background: var(--bg-tertiary);
  width: 60px;
  height: 60px;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-content {
  flex: 1;
}

.metric-card h3 {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.5rem 0;
}

.big-number {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
  line-height: 1;
}

.stats-row {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.stats-mini {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  gap: 1rem;
}

.stats-mini strong {
  color: var(--text-primary);
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 0.25rem;
}
.dot.green { background: #34d399; }
.dot.blue { background: #60a5fa; }

/* Actions Grid */
.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.action-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 1.5rem;
  text-decoration: none;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-card:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
}

.action-icon {
  font-size: 2rem;
}

.action-info h3 {
  color: var(--text-primary);
  font-size: 1.1rem;
  margin: 0 0 0.25rem 0;
}

.action-info p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-header h1 {
    font-size: 2rem;
  }
  
  .metric-card {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
