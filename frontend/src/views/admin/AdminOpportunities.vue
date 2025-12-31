<template>
  <div class="admin-opportunities">
    <AdminBreadcrumbs />
    <div class="header">
      <h1>Διαχείριση Ευκαιριών</h1>
      <router-link to="/admin/opportunities/new/edit" class="btn btn-primary"
        >Νέα Ευκαιρία</router-link
      >
    </div>
    <div class="stats-bar">
      <div class="stats-item">
        <span class="stats-label">Σύνολο:</span>
        <span class="stats-value">{{ totalCount }}</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">Εμφανίζονται:</span>
        <span class="stats-value">{{ opportunitiesList.length }}</span>
      </div>
      <div class="stats-breakdown" v-if="statusBreakdown">
        <span class="stats-badge published">{{ statusBreakdown.published || 0 }} Δημοσιευμένα</span>
        <span class="stats-badge draft">{{ statusBreakdown.draft || 0 }} Draft</span>
        <span class="stats-badge archived">{{ statusBreakdown.archived || 0 }} Archived</span>
      </div>
    </div>
    <div class="filters">
      <select v-model="filters.status" @change="currentPage = 1; fetchData()">
        <option value="">Όλα</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
      <select v-model="pageSize" @change="changePageSize(Number(pageSize))" class="page-size-select">
        <option :value="20">20 ανά σελίδα</option>
        <option :value="50">50 ανά σελίδα</option>
        <option :value="100">100 ανά σελίδα</option>
      </select>
    </div>
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else-if="error" class="error-message">
      <p>⚠️ Σφάλμα κατά τη φόρτωση: {{ error }}</p>
      <button @click="fetchData" class="btn btn-primary">Δοκιμή ξανά</button>
    </div>
    <div v-else-if="opportunitiesList.length === 0" class="empty-state">
      <p>Δεν βρέθηκαν ευκαιρίες.</p>
      <p v-if="filters.status" class="empty-note">
        Προσπαθείτε να φιλτράρετε με status: <strong>{{ filters.status }}</strong>
      </p>
    </div>
    <div v-else class="table">
      <table>
        <thead>
          <tr>
            <th>Τίτλος</th>
            <th>Τύπος</th>
            <th>Κατάσταση</th>
            <th>Ημερομηνία</th>
            <th>Ενέργειες</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="opp in opportunitiesList" :key="opp._id" :class="`status-${opp.status}`">
            <td class="title-cell">
              <div class="title-wrapper">
                <span class="title-text" :title="opp.title">{{ truncateTitle(opp.title) }}</span>
              </div>
            </td>
            <td class="type-cell">
              <span class="type-badge" :class="`type-${opp.type}`">{{ getTypeLabel(opp.type) }}</span>
            </td>
            <td class="status-cell">
              <span class="status-badge" :class="`status-${opp.status}`">{{ getStatusLabel(opp.status) }}</span>
            </td>
            <td class="date-cell">{{ formatDate(opp.publishedAt) }}</td>
            <td class="actions-cell">
              <div class="actions-wrapper">
                <router-link
                  :to="`/admin/opportunities/${opp._id}/edit`"
                  class="btn-action btn-edit"
                  title="Επεξεργασία"
                >
                  ✏️ Επεξεργασία
                </router-link>
                <button
                  v-if="opp.status === 'draft' || opp.status === 'archived'"
                  @click="publish(opp._id)"
                  class="btn-action btn-publish"
                  title="Δημοσίευση"
                >
                  ✅ Δημοσίευση
                </button>
                <button
                  v-if="opp.status === 'published'"
                  @click="unpublish(opp._id)"
                  class="btn-action btn-unpublish"
                  title="Αποδημοσίευση"
                >
                  🔒 Αποδημοσίευση
                </button>
                <button
                  v-if="opp.status === 'archived'"
                  @click="restore(opp._id)"
                  class="btn-action btn-restore"
                  title="Επαναφορά"
                >
                  🔄 Επαναφορά
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          @click="changePage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          ← Προηγούμενη
        </button>
        <span class="pagination-info">
          Σελίδα {{ currentPage }} από {{ totalPages }} (Σύνολο: {{ opportunitiesTotal }})
        </span>
        <button 
          @click="changePage(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Επόμενη →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { storeToRefs } from "pinia";
import { useAdminStore } from "../../stores/admin.store";
import { api } from "../../api/endpoints";
import AdminBreadcrumbs from "../../components/AdminBreadcrumbs.vue";

const adminStore = useAdminStore();
// Use storeToRefs to make state reactive
const { opportunities, opportunitiesTotal, loading } = storeToRefs(adminStore);
const filters = ref({ status: "" });
const error = ref<string | null>(null);
const currentPage = ref(1);
const pageSize = ref(50); // Show 50 items per page
const totalPages = computed(() => Math.ceil((opportunitiesTotal.value || 0) / pageSize.value));

// Computed to ensure we always have an array
const opportunitiesList = computed(() => {
  return Array.isArray(opportunities.value) ? opportunities.value : [];
});

// Total count (from backend or current list if filtered)
const totalCount = computed(() => {
  if (filters.value.status) {
    // If filtered, show count of filtered items
    return opportunitiesList.value.length;
  }
  // Otherwise show total from backend
  return opportunitiesTotal.value || opportunitiesList.value.length;
});

// Status breakdown from current list
const statusBreakdown = computed(() => {
  if (filters.value.status) {
    // Don't show breakdown if filtered
    return null;
  }
  const breakdown = {
    published: 0,
    draft: 0,
    archived: 0,
  };
  opportunitiesList.value.forEach((opp: any) => {
    if (opp.status === 'published') breakdown.published++;
    else if (opp.status === 'draft') breakdown.draft++;
    else if (opp.status === 'archived') breakdown.archived++;
  });
  return breakdown;
});

function formatDate(date: string | Date): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString("el-GR");
}

function truncateTitle(title: string, maxLength: number = 80): string {
  if (!title) return 'Χωρίς τίτλο';
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'subsidy': 'Επίδομα',
    'voucher': 'Voucher',
    'program': 'Πρόγραμμα',
    'public_call': 'Προκήρυξη',
    'asep_competition': 'ΑΣΕΠ',
    'manual': 'Χειροκίνητο',
  };
  return labels[type] || type;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'draft': 'Προσχέδιο',
    'published': 'Δημοσιευμένο',
    'archived': 'Αρχειοθετημένο',
    'rejected': 'Απορριφθέν',
  };
  return labels[status] || status;
}

async function fetchData() {
  error.value = null;
  try {
    await adminStore.fetchOpportunities({
      ...filters.value,
      page: currentPage.value,
      limit: pageSize.value,
    });
  } catch (err: any) {
    console.error("Failed to fetch opportunities:", err);
    error.value = err.response?.data?.error || err.message || 'Άγνωστο σφάλμα';
  }
}

function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchData();
  }
}

function changePageSize(newSize: number) {
  pageSize.value = newSize;
  currentPage.value = 1; // Reset to first page
  fetchData();
}

async function publish(id: string) {
  try {
    await api.admin.opportunities.publish(id);
    await fetchData();
  } catch (err: any) {
    alert(`Σφάλμα κατά τη δημοσίευση: ${err.response?.data?.error || err.message}`);
  }
}

async function unpublish(id: string) {
  try {
    await api.admin.opportunities.unpublish(id);
    await fetchData();
  } catch (err: any) {
    alert(`Σφάλμα κατά την αποδημοσίευση: ${err.response?.data?.error || err.message}`);
  }
}

async function restore(id: string) {
  try {
    await api.admin.opportunities.restore(id);
    await fetchData();
  } catch (err: any) {
    alert(`Σφάλμα κατά την επαναφορά: ${err.response?.data?.error || err.message}`);
  }
}

watch(
  filters,
  () => {
    currentPage.value = 1; // Reset to first page when filter changes
    fetchData();
  },
  { deep: true }
);

onMounted(() => {
  // Always fetch on mount, even if store has data (in case of refresh)
  fetchData();
});
</script>

<style scoped>
.admin-opportunities {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--text-primary);
}

.admin-opportunities h1 {
  color: var(--text-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.filters {
  margin-bottom: 1.5rem;
}

.stats-bar {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stats-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.stats-value {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.stats-breakdown {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
  flex-wrap: wrap;
}

.stats-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.stats-badge.published {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.stats-badge.draft {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.stats-badge.archived {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.filters select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.filters select:hover {
  border-color: var(--border-hover);
}

.page-size-select {
  margin-left: auto;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.pagination-btn {
  padding: 0.5rem 1rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
  color: var(--accent-primary);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.filters select {
  padding: 0.625rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filters select:hover {
  border-color: var(--accent-primary);
}

.filters select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.table {
  overflow-x: auto;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  vertical-align: middle;
}

tbody tr {
  transition: background-color 0.2s ease;
}

tbody tr:hover {
  background: var(--bg-tertiary);
}

tbody tr.status-published {
  border-left: 3px solid #10b981;
}

tbody tr.status-draft {
  border-left: 3px solid #f59e0b;
}

tbody tr.status-archived {
  border-left: 3px solid #6b7280;
  opacity: 0.7;
}

.title-cell {
  max-width: 400px;
}

.title-wrapper {
  display: flex;
  align-items: center;
}

.title-text {
  font-weight: 500;
  line-height: 1.5;
  word-break: break-word;
}

.type-cell,
.status-cell {
  white-space: nowrap;
}

.type-badge,
.status-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.type-badge {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.type-subsidy {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.2);
}

.type-voucher {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border-color: rgba(139, 92, 246, 0.2);
}

.type-program {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.2);
}

.status-badge {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.status-published {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.2);
}

.status-draft {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.2);
}

.status-archived {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border-color: rgba(107, 114, 128, 0.2);
}

.status-rejected {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
}

.date-cell {
  white-space: nowrap;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.actions-cell {
  white-space: nowrap;
}

.actions-wrapper {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: var(--accent-primary);
  color: white;
  text-decoration: none;
  border-radius: 0.25rem;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-action {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
}

.btn-edit {
  background: var(--accent-primary);
  color: white;
}

.btn-edit:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-publish {
  background: #10b981;
  color: white;
}

.btn-publish:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.btn-unpublish {
  background: #f59e0b;
  color: white;
}

.btn-unpublish:hover {
  background: #d97706;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
}

.btn-restore {
  background: #6366f1;
  color: white;
}

.btn-restore:hover {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
}

.error-message {
  text-align: center;
  padding: 2rem;
  color: var(--error);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  margin: 2rem 0;
}

.error-message p {
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-secondary);
}

.empty-state p {
  margin-bottom: 0.5rem;
}

.empty-note {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.empty-note strong {
  color: var(--text-primary);
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}
</style>
