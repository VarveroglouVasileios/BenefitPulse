<template>
  <div class="admin-page">
    <div class="page-header">
      <router-link to="/admin" class="back-btn">
        <span class="icon">←</span> Πίσω στο Dashboard
      </router-link>
      <div class="header-content">
        <h1>Διαχείριση Ευκαιριών</h1>
        <router-link to="/admin/opportunities/new/edit" class="btn btn-primary">
          <span class="icon">+</span> Νέα Ευκαιρία
        </router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery"
          placeholder="Αναζήτηση..." 
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
      
      <div class="filter-group">
        <select v-model="filters.status" class="filter-select">
          <option value="">Όλες οι καταστάσεις</option>
          <option value="draft">Draft (Πρόχειρα)</option>
          <option value="published">Published (Δημοσιευμένα)</option>
          <option value="archived">Archived (Αρχειοθετημένα)</option>
        </select>
        
        <select v-model="filters.type" class="filter-select">
          <option value="">Όλοι οι τύποι</option>
          <option value="subsidy">Επιδότηση</option>
          <option value="voucher">Voucher</option>
          <option value="program">Πρόγραμμα</option>
          <option value="public_call">Προκήρυξη</option>
        </select>

        <label class="checkbox-filter" title="Εμφάνιση ειδήσεων, διαγωνισμών και υπηρεσιακών σελίδων">
          <input type="checkbox" v-model="filters.showTendersNews" />
          <span class="checkbox-label">Όλα (News/Service)</span>
        </label>
      </div>
    </div>

    <!-- Loading State: Show if loading OR not initialized -->
    <div v-if="loading || !initialized" class="loading-state">
      <div class="spinner"></div>
      <p>Φόρτωση δεδομένων...</p>
    </div>

    <!-- Empty State: Show ONLY if initialized AND not loading AND no data -->
    <div v-else-if="initialized && !loading && opportunities.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>Δεν βρέθηκαν ευκαιρίες</h3>
      <p>Δοκιμάστε να αλλάξετε τα φίλτρα ή δημιουργήστε μια νέα εγγραφή.</p>
      <div class="empty-actions">
        <button v-if="hasActiveFilters" @click="clearFilters" class="btn btn-outline">
          Καθαρισμός Φίλτρων
        </button>
        <router-link to="/admin/opportunities/new/edit" class="btn btn-secondary">
          Δημιουργία Νέας
        </router-link>
      </div>
    </div>

    <!-- Data Table: Show if we have data -->
    <div v-else class="data-table-container">
      <div v-if="loading" class="refresh-overlay">
        <div class="spinner-small"></div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Τίτλος</th>
            <th>Τύπος</th>
            <th>Κατάσταση</th>
            <th>Ημερομηνία</th>
            <th>Conf.</th>
            <th class="actions-col">Ενέργειες</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="opp in opportunities" :key="opp._id">
            <td class="title-cell">
              <div class="title-wrapper">
                <span class="title-text">{{ opp.title }}</span>
                <span v-if="opp.officialUrl" class="host-badge">
                  {{ getHostname(opp.officialUrl) }}
                </span>
              </div>
            </td>
            <td>
              <span :class="['badge-type', opp.type]">{{ getTypeLabel(opp.type) }}</span>
            </td>
            <td>
              <span :class="['status-dot', opp.status]"></span>
              {{ getStatusLabel(opp.status) }}
            </td>
            <td class="date-cell">
              {{ formatDate(opp.publishedAt) }}
            </td>
            <td class="conf-cell">
               <span :class="getConfidenceClass(opp.confidence)">{{ Math.round((opp.confidence || 0) * 100) }}%</span>
            </td>
            <td class="actions-cell">
              <div class="action-buttons">
                <router-link
                  :to="`/admin/opportunities/${opp._id}/edit`"
                  class="btn-action btn-edit"
                  title="Επεξεργασία"
                >
                  <span>✏️</span>
                  <span class="btn-label">Επεξεργασία</span>
                </router-link>
                
                <button
                  v-if="opp.status === 'draft'"
                  @click="publish(opp._id)"
                  class="btn-action btn-publish"
                  title="Δημοσίευση"
                >
                  <span>🚀</span>
                  <span class="btn-label">Δημοσίευση</span>
                </button>
                
                <button
                  v-if="opp.status === 'published'"
                  @click="unpublish(opp._id)"
                  class="btn-action btn-unpublish"
                  title="Απόσυρση"
                >
                  <span>⏸️</span>
                  <span class="btn-label">Απόσυρση</span>
                </button>
                
                <button
                  @click="remove(opp._id)"
                  class="btn-action btn-delete"
                  title="Διαγραφή"
                >
                  <span>🗑️</span>
                  <span class="btn-label">Διαγραφή</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Pagination Footer -->
    <div v-if="opportunities.length > 0" class="pagination-footer">
      <div class="pagination-info">
        Εμφάνιση {{ startItem }}-{{ endItem }} από {{ total || 0 }} αποτελέσματα
        <span v-if="loading" class="loading-indicator">(Ανανέωση...)</span>
      </div>
      <div class="pagination-controls">
        <button 
          @click="prevPage" 
          :disabled="page === 1"
          class="btn-page"
        >
          &laquo; Προηγούμενο
        </button> <!-- &laquo; is left angle quote -->
        
        <span class="page-current">Σελίδα {{ page }} από {{ totalPages }}</span>
        
        <button 
          @click="nextPage" 
          :disabled="page >= totalPages"
          class="btn-page"
        >
          Επόμενο &raquo;
        </button> <!-- &raquo; is right angle quote -->
      </div>
    </div>

  </div>
    <ConfirmModal
      :show="modal.show"
      :title="modal.title"
      :message="modal.message"
      :type="modal.type"
      :confirm-text="modal.confirmText"
      @confirm="handleConfirm"
      @cancel="closeModal"
    />
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { storeToRefs } from "pinia";
import { useAdminStore } from "../../stores/admin.store";
import { api } from "../../api/endpoints";
import { debounce } from "lodash";
// @ts-ignore
import ConfirmModal from "../../components/ConfirmModal.vue";

const adminStore = useAdminStore();
const { opportunities, loading, total, page, limit } = storeToRefs(adminStore);
// 220: filters definition update
const filters = ref({ status: "", type: "", showTendersNews: false });




const totalPages = computed(() => Math.ceil(total.value / limit.value));
const startItem = computed(() => (page.value - 1) * limit.value + 1);
const endItem = computed(() => Math.min(page.value * limit.value, total.value));

function nextPage() {
  if (page.value < totalPages.value) {
    adminStore.setPage(page.value + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function prevPage() {
  if (page.value > 1) {
    adminStore.setPage(page.value - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
const searchQuery = ref("");
const initialized = ref(false);

// Modal state
const modal = ref({
  show: false,
  title: "",
  message: "",
  type: "primary" as "primary" | "danger" | "warning",
  confirmText: "Επιβεβαίωση",
  action: null as (() => Promise<void>) | null,
});

function openModal(
  title: string,
  message: string,
  type: "primary" | "danger" | "warning",
  action: () => Promise<void>,
  confirmText = "Επιβεβαίωση"
) {
  modal.value = {
    show: true,
    title,
    message,
    type,
    confirmText,
    action,
  };
}

function closeModal() {
  modal.value.show = false;
  setTimeout(() => {
    modal.value.action = null; // Clear action after animation
  }, 300);
}

async function handleConfirm() {
  if (modal.value.action) {
    await modal.value.action();
  }
  closeModal();
}

const hasActiveFilters = computed(() => {
  return filters.value.status !== "" || filters.value.type !== "" || searchQuery.value !== "";
});

function clearFilters() {
  filters.value.status = "";
  filters.value.type = "";
  searchQuery.value = "";
  // Watcher will trigger fetch
}

function formatDate(date: string | Date): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("el-GR", { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    subsidy: 'Επιδότηση',
    voucher: 'Voucher',
    program: 'Πρόγραμμα',
    public_call: 'Προκήρυξη',
    asep_competition: 'ΑΣΕΠ',
    job_listing: 'Εργασία'
  };
  return map[type] || type;
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    published: 'Active',
    archived: 'Archived',
    rejected: 'Rejected'
  };
  return map[status] || status;
}

function getConfidenceClass(conf: number = 0): string {
  if (conf >= 0.8) return 'conf-high';
  if (conf >= 0.5) return 'conf-med';
  return 'conf-low';
}

function publish(id: string) {
  openModal(
    "Δημοσίευση Ευκαιρίας",
    "Είστε βέβαιοι ότι θέλετε να δημοσιεύσετε αυτή την ευκαιρία;",
    "primary",
    async () => {
      try {
        await api.admin.opportunities.publish(id);
        await fetchData();
      } catch (error) {
        alert("Σφάλμα κατά τη δημοσίευση");
      }
    },
    "Δημοσίευση"
  );
}

function unpublish(id: string) {
  openModal(
    "Απόσυρση Ευκαιρίας",
    "Η ευκαιρία θα μεταφερθεί ξανά στα πρόχειρα (drafts).",
    "warning",
    async () => {
      try {
        await api.admin.opportunities.unpublish(id);
        await fetchData();
      } catch (error) {
        alert("Σφάλμα κατά την απόσυρση");
      }
    },
    "Απόσυρση"
  );
}

function remove(id: string) {
  openModal(
    "Διαγραφή Ευκαιρίας",
    "Είστε βέβαιοι για την οριστική διαγραφή; Αυτή η ενέργεια δεν αναιρείται.",
    "danger",
    async () => {
      try {
        await api.admin.opportunities.delete(id);
        await fetchData();
      } catch (error) {
        console.error(error);
        alert("Σφάλμα κατά τη διαγραφή");
      }
    },
    "Διαγραφή"
  );
}

const fetchData = async () => {
  // Ensure loading is true explicitly
  adminStore.loading = true; 
  try {
    await adminStore.fetchOpportunities({
      ...filters.value,
      search: searchQuery.value
    });
  } catch (e) {
    console.error("Fetch error:", e);
  } finally {
    // Only set initialized after the FIRST successful fetch attempt
    initialized.value = true;
  }
};



watch(
  filters,
  () => {
    adminStore.setPage(1); // Reset to page 1 to avoid empty results
    // The store action handles the fetch, so we don't need to call fetchData() manually if setPage does it
    // But currently fetchData uses local state search query, so let's call fetchData directly after resetting page state
    // Actually setPage triggers fetch, but with its own params. Let's act strictly:
    // adminStore.page = 1; (reactive) -> setPage updates state and fetches.
  },
  { deep: true }
);

// Better watcher implementation:
watch(
  [filters, searchQuery],
  () => {
    // Reset page to 1 on any filter/search change
    adminStore.page = 1; 
    debouncedFetch();
  },
  { deep: true }
);

const debouncedFetch = debounce(() => {
  fetchData();
}, 300);

onMounted(() => {
  // Initial fetch
  fetchData();
});
</script>

<style scoped>
.admin-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--text-primary);
  min-height: 80vh;
}

/* Header */
.page-header {
  margin-bottom: 2rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--accent-primary);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

/* Filters */
.filters-bar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-primary);
  opacity: 0.7;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.5;
}

.filter-group {
  display: flex;
  gap: 1rem;
}

.filter-select {
  padding: 0.5rem 1rem;
  min-width: 150px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
}

/* Table */
.data-table-container {
  background: var(--bg-secondary);
  border-radius: 1rem;
  border: 1px solid var(--border-color);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  position: relative;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover {
  background: var(--bg-tertiary);
}

/* Cell Styles */
.title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.title-text {
  font-weight: 500;
  color: var(--text-primary);
}

.host-badge {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.8;
}

.badge-type {
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.badge-type.subsidy { background: rgba(52, 211, 153, 0.1); color: #34d399; }
.badge-type.voucher { background: rgba(96, 165, 250, 0.1); color: #60a5fa; }
.badge-type.program { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
.badge-type.public_call { background: rgba(167, 139, 250, 0.1); color: #a78bfa; }

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.status-dot.published { background: #34d399; box-shadow: 0 0 8px #34d399; }
.status-dot.draft { background: #9ca3af; }
.status-dot.archived { background: #f87171; }

.conf-high { color: #34d399; font-weight: bold; }
.conf-med { color: #fbbf24; }
.conf-low { color: #f87171; }

/* Actions */
.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.btn-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

/* Modifiers */
.btn-edit:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--bg-tertiary);
}

.btn-publish {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
}
.btn-publish:hover {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.btn-unpublish {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.3);
}
.btn-unpublish:hover {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.btn-delete {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}
.btn-delete:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: var(--accent-primary);
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* Loading & Empty States */
.loading-state, .empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--bg-secondary);
  border-radius: 1rem;
  border: 1px solid var(--border-color);
}

.refresh-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--bg-tertiary);
  padding: 0.5rem;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 10;
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

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: var(--accent-primary);
  border-right-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

/* Pagination */
.pagination-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 0;
  border-top: 1px solid var(--border-color);
  margin-top: 1rem;
}

.pagination-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-page {
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-page:hover:not(:disabled) {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-current {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filters-bar {
    flex-direction: column;
  }
  
  .filter-group {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .checkbox-filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-secondary);
    padding: 0.5rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
  }
  
  .checkbox-filter:hover {
    border-color: var(--accent-primary);
  }
  
  .filter-select {
    width: 100%;
  }
  
  .data-table-container {
    overflow-x: auto;
  }

  .pagination-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    text-align: center;
  }
}
  .filter-group {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .checkbox-filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-secondary);
    padding: 0.5rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
  }
  
  .checkbox-filter:hover {
    border-color: var(--accent-primary);
  }
  
  .checkbox-filter input[type="checkbox"] {
    accent-color: var(--accent-primary);
    width: 1rem;
    height: 1rem;
  }
</style>
