<template>
  <div class="admin-drafts">
    <AdminBreadcrumbs />
    <h1>Draft Queue</h1>
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else-if="error" class="error-message">
      <p>⚠️ Σφάλμα κατά τη φόρτωση: {{ error }}</p>
      <button @click="fetchDrafts" class="btn btn-primary">Δοκιμή ξανά</button>
    </div>
    <div v-else-if="drafts.length === 0" class="empty-state">
      <p>✅ Δεν υπάρχουν items που χρειάζονται review.</p>
      <p class="empty-note">
        Το Draft Queue εμφανίζει items με:
        <ul>
          <li>Status "draft"</li>
          <li>Low confidence (&lt; 60%)</li>
          <li>Missing deadlines</li>
          <li>Unknown criteria</li>
        </ul>
      </p>
    </div>
    <div v-else class="drafts-list">
      <div class="drafts-header">
        <p class="drafts-count">Βρέθηκαν {{ drafts.length }} items που χρειάζονται review</p>
      </div>
      <div v-for="draft in drafts" :key="draft._id" class="draft-card">
        <div class="draft-header">
          <h3>{{ draft.title }}</h3>
          <div class="status-badges">
            <span v-if="draft.status === 'draft'" class="badge badge-draft">Draft</span>
            <span v-else-if="draft.status === 'published'" class="badge badge-published">Published</span>
            <span v-if="draft.confidence < 0.6" class="badge badge-low-confidence">Low Confidence</span>
            <span v-if="!draft.deadlineAt && !draft.applicationEndAt" class="badge badge-missing-dates">Missing Dates</span>
            <span v-if="draft.criteriaUnknown" class="badge badge-unknown-criteria">Unknown Criteria</span>
          </div>
        </div>
        <p>{{ draft.summary || 'Δεν υπάρχει περίληψη' }}</p>
        <div class="meta">
          <span>Confidence: {{ ((draft.confidence || 0) * 100).toFixed(0) }}%</span>
          <span>Source: {{ draft.source }}</span>
          <span v-if="draft.deadlineAt">Deadline: {{ formatDate(draft.deadlineAt) }}</span>
          <span v-else-if="draft.applicationEndAt">Application End: {{ formatDate(draft.applicationEndAt) }}</span>
          <span v-else>No deadline</span>
        </div>
        <div class="actions">
          <router-link
            :to="`/admin/opportunities/${draft._id}/edit`"
            class="btn btn-primary"
            >Επεξεργασία</router-link
          >
          <button 
            v-if="draft.status !== 'published'" 
            @click="openPublishModal(draft._id, draft.title)" 
            class="btn btn-success"
            :disabled="publishingId === draft._id"
          >
            {{ publishingId === draft._id ? 'Δημοσίευση...' : 'Δημοσίευση' }}
          </button>
          <button 
            v-if="draft.status === 'published'"
            @click="openUnpublishModal(draft._id, draft.title)"
            class="btn btn-warning"
            :disabled="unpublishingId === draft._id"
          >
            {{ unpublishingId === draft._id ? 'Αποδημοσίευση...' : 'Αποδημοσίευση' }}
          </button>
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

    <!-- Publish Confirmation Modal -->
    <div v-if="showPublishModal" class="modal-overlay" @click="closePublishModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>✅ Επιβεβαίωση Δημοσίευσης</h2>
          <button class="close-btn" @click="closePublishModal" aria-label="Κλείσιμο">×</button>
        </div>
        
        <div class="modal-body">
          <p class="warning-text">
            Είστε σίγουροι ότι θέλετε να δημοσιεύσετε αυτό το item;
          </p>
          <div class="draft-preview">
            <strong>{{ draftToPublish?.title }}</strong>
          </div>
          <p class="warning-note publish-note">
            ⚠️ <strong>Προσοχή:</strong> Μετά τη δημοσίευση, το item θα είναι <strong>ορατό στους χρήστες</strong> 
            στην πλατφόρμα. Βεβαιωθείτε ότι όλα τα δεδομένα είναι σωστά και πλήρη.
          </p>
        </div>

        <div class="modal-footer">
          <button @click="closePublishModal" class="btn btn-cancel">
            Ακύρωση
          </button>
          <button 
            @click="confirmPublish" 
            class="btn btn-confirm-publish"
            :disabled="publishingId !== null"
          >
            {{ publishingId ? 'Δημοσίευση...' : 'Ναι, Δημοσίευση' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Unpublish Confirmation Modal -->
    <div v-if="showUnpublishModal" class="modal-overlay" @click="closeUnpublishModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>⚠️ Επιβεβαίωση Αποδημοσίευσης</h2>
          <button class="close-btn" @click="closeUnpublishModal" aria-label="Κλείσιμο">×</button>
        </div>
        
        <div class="modal-body">
          <p class="warning-text">
            Είστε σίγουροι ότι θέλετε να αποδημοσιεύσετε αυτό το item;
          </p>
          <div class="draft-preview">
            <strong>{{ draftToUnpublish?.title }}</strong>
          </div>
          <p class="warning-note unpublish-note">
            ⚠️ <strong>Προσοχή:</strong> Μετά την αποδημοσίευση, το item <strong>δεν θα είναι ορατό</strong> 
            στους χρήστες. Θα μεταφερθεί σε status "draft" και θα χρειάζεται εκ νέου δημοσίευση για να εμφανιστεί.
          </p>
        </div>

        <div class="modal-footer">
          <button @click="closeUnpublishModal" class="btn btn-cancel">
            Ακύρωση
          </button>
          <button 
            @click="confirmUnpublish" 
            class="btn btn-confirm-unpublish"
            :disabled="unpublishingId !== null"
          >
            {{ unpublishingId ? 'Αποδημοσίευση...' : 'Ναι, Αποδημοσίευση' }}
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
import AdminBreadcrumbs from "../../components/AdminBreadcrumbs.vue";

const drafts = ref([]);
const loading = ref(true);
const error = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const publishingId = ref<string | null>(null);
const unpublishingId = ref<string | null>(null);
const showDeleteModal = ref(false);
const showPublishModal = ref(false);
const showUnpublishModal = ref(false);
const draftToDelete = ref<{ id: string; title: string } | null>(null);
const draftToPublish = ref<{ id: string; title: string } | null>(null);
const draftToUnpublish = ref<{ id: string; title: string } | null>(null);

function formatDate(date: string | Date): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('el-GR', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
}

async function fetchDrafts() {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.admin.draftQueue();
    drafts.value = response.data || [];
    console.log(`✅ Loaded ${drafts.value.length} draft items`);
  } catch (err: any) {
    console.error("Failed to fetch drafts:", err);
    error.value = err.response?.data?.error || err.message || 'Άγνωστο σφάλμα';
  } finally {
    loading.value = false;
  }
}

function openPublishModal(id: string, title: string) {
  draftToPublish.value = { id, title };
  showPublishModal.value = true;
}

function closePublishModal() {
  if (publishingId.value === null) {
    showPublishModal.value = false;
    draftToPublish.value = null;
  }
}

async function confirmPublish() {
  if (!draftToPublish.value) return;
  
  const id = draftToPublish.value.id;
  publishingId.value = id;
  
  try {
    await api.admin.opportunities.publish(id);
    await fetchDrafts();
    showPublishModal.value = false;
    draftToPublish.value = null;
  } catch (error: any) {
    alert(`Σφάλμα κατά τη δημοσίευση: ${error.response?.data?.error || error.message}`);
    await fetchDrafts();
  } finally {
    publishingId.value = null;
  }
}

function openUnpublishModal(id: string, title: string) {
  draftToUnpublish.value = { id, title };
  showUnpublishModal.value = true;
}

function closeUnpublishModal() {
  if (unpublishingId.value === null) {
    showUnpublishModal.value = false;
    draftToUnpublish.value = null;
  }
}

async function confirmUnpublish() {
  if (!draftToUnpublish.value) return;
  
  const id = draftToUnpublish.value.id;
  unpublishingId.value = id;
  
  try {
    await api.admin.opportunities.unpublish(id);
    await fetchDrafts();
    showUnpublishModal.value = false;
    draftToUnpublish.value = null;
  } catch (error: any) {
    alert(`Σφάλμα κατά την αποδημοσίευση: ${error.response?.data?.error || error.message}`);
    await fetchDrafts();
  } finally {
    unpublishingId.value = null;
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

.drafts-header {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.drafts-count {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-secondary);
}

.empty-state p {
  margin-bottom: 1rem;
}

.empty-note {
  margin-top: 2rem;
  text-align: left;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.empty-note ul {
  margin-top: 0.5rem;
  padding-left: 1.5rem;
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

.draft-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.draft-header h3 {
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  min-width: 200px;
}

.status-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-draft {
  background: rgba(251, 191, 36, 0.2);
  color: #d97706;
  border: 1px solid rgba(251, 191, 36, 0.4);
}

.badge-low-confidence {
  background: rgba(239, 68, 68, 0.2);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.badge-missing-dates {
  background: rgba(59, 130, 246, 0.2);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.badge-unknown-criteria {
  background: rgba(139, 92, 246, 0.2);
  color: #7c3aed;
  border: 1px solid rgba(139, 92, 246, 0.4);
}

.badge-published {
  background: rgba(16, 185, 129, 0.2);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.4);
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

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
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

.publish-note {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.dark .publish-note {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
}

.publish-note strong {
  color: #059669;
}

.unpublish-note {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.dark .unpublish-note {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
}

.unpublish-note strong {
  color: #d97706;
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

.btn-confirm-publish {
  background: #10b981;
  color: white;
  font-weight: 600;
}

.btn-confirm-publish:hover:not(:disabled) {
  background: #059669;
  opacity: 0.9;
}

.btn-confirm-unpublish {
  background: #f59e0b;
  color: white;
  font-weight: 600;
}

.btn-confirm-unpublish:hover:not(:disabled) {
  background: #d97706;
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
