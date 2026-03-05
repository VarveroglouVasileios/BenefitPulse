<template>
  <div class="admin-page">
    <div class="page-header">
      <router-link to="/admin" class="back-btn">
        <span class="icon">←</span> Πίσω στο Dashboard
      </router-link>
      <div class="header-content">
        <h1>Audit Log</h1>
        <p class="subtitle">Ιστορικό ενεργειών και αλλαγών στο σύστημα</p>
      </div>
    </div>

    <div v-if="loading && !initialized" class="loading-state">
      <div class="spinner"></div>
      <p>Φόρτωση ιστορικού...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="initialized && audits.length === 0" class="empty-state">
      <div class="empty-icon">📜</div>
      <h3>Καθαρό Ιστορικό</h3>
      <p>Δεν έχουν καταγραφεί ενέργειες ακόμη.</p>
    </div>

    <div v-else class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Χρονοσφραγίδα</th>
            <th>Admin</th>
            <th>Ενέργεια</th>
            <th>Resource</th>
            <th>Ενέργειες</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="audit in audits" :key="audit._id">
            <td class="date-cell">
              <span class="date">{{ formatDate(audit.createdAt).date }}</span>
              <span class="time">{{ formatDate(audit.createdAt).time }}</span>
            </td>
            <td>
              <div class="user-cell">
                <span class="avatar">👤</span>
                {{ audit.adminId?.email || "System/Unknown" }}
              </div>
            </td>
            <td>
              <span :class="['action-badge', getActionClass(audit.action)]">
                {{ audit.action }}
              </span>
            </td>
            <td class="resource-cell">
              <span class="resource-type">{{ audit.resourceType }}</span>
              <span class="resource-id">{{ shortId(audit.resourceId) }}</span>
            </td>
            <td class="actions-cell">
              <button
                v-if="canRestore(audit)"
                class="btn-restore"
                @click="restore(audit)"
              >
                <span>↩️</span> Επαναφορά
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../../api/endpoints";
// @ts-ignore
import ConfirmModal from "../../components/ConfirmModal.vue";

const audits = ref<any[]>([]);
const loading = ref(true);
const initialized = ref(false);

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
    modal.value.action = null;
  }, 300);
}

async function handleConfirm() {
  if (modal.value.action) {
    await modal.value.action();
  }
  closeModal();
}

function formatDate(dateStr: string | Date) {
  const date = new Date(dateStr);
  return {
    date: date.toLocaleDateString("el-GR", { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString("el-GR", { hour: '2-digit', minute: '2-digit' })
  };
}

function shortId(id: string): string {
  if (!id) return '';
  return '#' + id.substring(id.length - 6);
}

function getActionClass(action: string): string {
  if (action.includes('create')) return 'create';
  if (action.includes('update')) return 'update';
  if (action.includes('delete')) return 'delete';
  if (action.includes('publish')) return 'publish';
  if (action.includes('restore')) return 'create';
  return 'default';
}

function canRestore(audit: any): boolean {
  return audit.action === 'delete' && audit.resourceType === 'opportunity';
}

function restore(audit: any) {
  openModal(
    "Επαναφορά Στοιχείου",
    `Είστε βέβαιοι ότι θέλετε να επαναφέρετε το στοιχείο #${shortId(audit.resourceId).substring(1)};`,
    "primary",
    async () => {
      try {
        await api.admin.opportunities.restore(audit.resourceId);
        // Refresh log to see the new RESTORE action
        const response = await api.admin.audit({ limit: 100 });
        audits.value = response.data.audits || [];
      } catch (error) {
        console.error(error);
        alert("Αδυναμία επαναφοράς. Το στοιχείο μπορεί να υπάρχει ήδη ή να λείπουν δεδομένα.");
      }
    },
    "Επαναφορά"
  );
}

onMounted(async () => {
  loading.value = true;
  try {
    const response = await api.admin.audit({ limit: 100 });
    audits.value = response.data.audits || [];
  } catch (error) {
    console.error("Failed to fetch audit log:", error);
  } finally {
    loading.value = false;
    initialized.value = true;
  }
});
</script>

<style scoped>
/* Previous styles... */
/* Add new button style */
.btn-restore {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  background-color: var(--bg-primary);
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-restore:hover {
  background-color: var(--accent-primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.admin-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--text-primary);
  min-height: 80vh;
}
/* ... existing styles ... */




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

.back-btn:hover { color: var(--accent-primary); }

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0;
}

/* Loading & Empty */
.loading-state, .empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--bg-secondary);
  border-radius: 1rem;
  border: 1px solid var(--border-color);
  margin-top: 2rem;
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

@keyframes spin { to { transform: rotate(360deg); } }

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* Table */
.data-table-container {
  background: var(--bg-secondary);
  border-radius: 1rem;
  border: 1px solid var(--border-color);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.data-table { width: 100%; border-collapse: collapse; }

th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

tr:last-child td { border-bottom: none; }
tr:hover { background: var(--bg-tertiary); }

/* Cell Styles */
.date-cell {
  display: flex;
  flex-direction: column;
}

.date-cell .time {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar { filter: grayscale(1); opacity: 0.7; }

.action-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.action-badge.create { background: rgba(52, 211, 153, 0.1); color: #34d399; }
.action-badge.publish { background: rgba(52, 211, 153, 0.1); color: #34d399; }
.action-badge.update { background: rgba(96, 165, 250, 0.1); color: #60a5fa; }
.action-badge.delete { background: rgba(248, 113, 113, 0.1); color: #f87171; }
.action-badge.default { background: var(--bg-tertiary); color: var(--text-secondary); }

.resource-cell {
  font-family: monospace;
  font-size: 0.9rem;
}

.resource-type { color: var(--text-secondary); margin-right: 0.5rem; }
.resource-id { color: var(--text-primary); font-weight: 600; }
</style>
