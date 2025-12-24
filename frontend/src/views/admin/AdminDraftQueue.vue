<template>
  <div class="admin-drafts">
    <h1>Draft Queue</h1>
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else class="drafts-list">
      <div v-for="draft in drafts" :key="draft._id" class="draft-card">
        <h3>{{ draft.title }}</h3>
        <p>{{ draft.summary }}</p>
        <div class="meta">
          <span>Confidence: {{ (draft.confidence * 100).toFixed(0) }}%</span>
          <span>Source: {{ draft.source }}</span>
        </div>
        <div class="actions">
          <router-link
            :to="`/admin/opportunities/${draft._id}/edit`"
            class="btn btn-primary"
            >Επεξεργασία</router-link
          >
          <button @click="publish(draft._id)" class="btn btn-primary">Publish</button>
          <button 
            @click="openDeleteModal(draft._id, draft.title)" 
            class="btn btn-danger"
            :disabled="deletingId === draft._id"
          >
            {{ deletingId === draft._id ? 'Διαγραφή...' : 'Διαγραφή' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>⚠️ Επιβεβαίωση Διαγραφής</h2>
          <button class="close-btn" @click="closeDeleteModal" aria-label="Κλείσιμο">×</button>
        </div>
        
        <div class="modal-body">
          <p class="warning-text">
            Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το draft;
          </p>
          <div class="draft-preview">
            <strong>{{ draftToDelete?.title }}</strong>
          </div>
          <p class="warning-note">
            ⚠️ <strong>Προσοχή:</strong> Αυτή η ενέργεια είναι <strong>μη αναστρέψιμη</strong>. 
            Το draft θα διαγραφεί οριστικά από τη βάση δεδομένων και δεν θα μπορεί να ανακτηθεί.
          </p>
        </div>

        <div class="modal-footer">
          <button @click="closeDeleteModal" class="btn btn-cancel">
            Ακύρωση
          </button>
          <button 
            @click="confirmDelete" 
            class="btn btn-confirm-delete"
            :disabled="deletingId !== null"
          >
            {{ deletingId ? 'Διαγραφή...' : 'Ναι, Διαγραφή' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../../api/endpoints";

const drafts = ref([]);
const loading = ref(true);
const deletingId = ref<string | null>(null);
const showDeleteModal = ref(false);
const draftToDelete = ref<{ id: string; title: string } | null>(null);

async function fetchDrafts() {
  try {
    const response = await api.admin.draftQueue();
    drafts.value = response.data;
  } catch (error) {
    console.error("Failed to fetch drafts:", error);
  } finally {
    loading.value = false;
  }
}

async function publish(id: string) {
  try {
    await api.admin.opportunities.publish(id);
    await fetchDrafts();
  } catch (error) {
    alert("Σφάλμα κατά τη δημοσίευση");
  }
}

function openDeleteModal(id: string, title: string) {
  draftToDelete.value = { id, title };
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  if (deletingId.value === null) {
    showDeleteModal.value = false;
    draftToDelete.value = null;
  }
}

async function confirmDelete() {
  if (!draftToDelete.value) return;
  
  const id = draftToDelete.value.id;
  deletingId.value = id;
  
  try {
    await api.admin.opportunities.delete(id);
    // Remove from list immediately for better UX
    drafts.value = drafts.value.filter((draft: any) => draft._id !== id);
    // Close modal after successful deletion
    showDeleteModal.value = false;
    draftToDelete.value = null;
  } catch (error: any) {
    alert(`Σφάλμα κατά τη διαγραφή: ${error.response?.data?.error || error.message}`);
    // Re-fetch on error to ensure consistency
    await fetchDrafts();
  } finally {
    deletingId.value = null;
  }
}

onMounted(fetchDrafts);
</script>

<style scoped>
.admin-drafts {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--text-primary);
}

.admin-drafts h1 {
  color: var(--text-primary);
  margin-bottom: 2rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.drafts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;
}

.draft-card {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.draft-card h3 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.draft-card p {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.meta {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-danger {
  background: var(--error);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Delete Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 100%;
  border: 1px solid var(--border-color);
  overflow: hidden;
  animation: modalSlideIn 0.2s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.modal-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 2rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s;
  line-height: 1;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
}

.warning-text {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
  font-weight: 500;
}

.draft-preview {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 4px solid var(--error);
  margin: 1rem 0;
}

.draft-preview strong {
  color: var(--text-primary);
  font-size: 1rem;
  word-break: break-word;
}

.warning-note {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
}

.dark .warning-note {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
}

.warning-note strong {
  color: var(--error);
}

.modal-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: var(--border-hover);
}

.btn-confirm-delete {
  background: var(--error);
  color: white;
  font-weight: 600;
}

.btn-confirm-delete:hover:not(:disabled) {
  background: #dc2626;
  opacity: 0.9;
}

@media (max-width: 640px) {
  .modal-content {
    margin: 1rem;
  }

  .modal-footer {
    flex-direction: column-reverse;
  }

  .modal-footer .btn {
    width: 100%;
  }
}
</style>
