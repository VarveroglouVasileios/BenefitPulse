<template>
  <div class="admin-page">
    <div class="page-header">
      <router-link to="/admin" class="back-btn">
        <span class="icon">←</span> Πίσω στο Dashboard
      </router-link>
      <div class="header-content">
        <h1>Draft Queue</h1>
        <div class="badge-count" v-if="drafts.length > 0">{{ drafts.length }} Εκκρεμή</div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !initialized" class="loading-state">
      <div class="spinner"></div>
      <p>Φόρτωση Queue...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="initialized && drafts.length === 0" class="empty-state">
      <div class="empty-icon">✓</div>
      <h3>Όλα καθαρά!</h3>
      <p>Δεν υπάρχουν εκκρεμή drafts για έλεγχο.</p>
      <router-link to="/admin" class="btn btn-secondary">
        Επιστροφή στο Dashboard
      </router-link>
    </div>

    <!-- Drafts List -->
    <div v-else class="drafts-grid">
      <div v-for="draft in drafts" :key="draft._id" class="draft-card">
        <div class="draft-header">
          <span class="confidence-badge" :class="getConfidenceClass(draft.confidence)">
            {{ (draft.confidence * 100).toFixed(0) }}% Confidence
          </span>
          <span class="source-tag">{{ getHostname(draft.source) }}</span>
        </div>
        
        <h3>{{ draft.title }}</h3>
        
        <p class="summary">{{ truncate(draft.summary || '', 150) }}</p>

        <div class="draft-actions">
          <router-link
            :to="`/admin/opportunities/${draft._id}/edit`"
            class="btn btn-outline"
          >
            ✏️ Επεξεργασία
          </router-link>
          
          <button @click="publish(draft._id)" class="btn btn-primary">
            🚀 Δημοσίευση
          </button>
          
          <button 
            @click="openDeleteModal(draft._id, draft.title)" 
            class="btn-icon danger"
            :disabled="deletingId === draft._id"
            title="Διαγραφή"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>⚠️ Επιβεβαίωση Διαγραφής</h2>
          <button class="close-btn" @click="closeDeleteModal">×</button>
        </div>
        
        <div class="modal-body">
          <p class="warning-text">
            Διαγραφή του draft;
          </p>
          <div class="draft-preview">
            <strong>{{ draftToDelete?.title }}</strong>
          </div>
          <p class="warning-note">
            Αυτή η ενέργεια δεν αναιρείται.
          </p>
        </div>

        <div class="modal-footer">
          <button @click="closeDeleteModal" class="btn btn-ghost">Ακύρωση</button>
          <button 
            @click="confirmDelete" 
            class="btn btn-danger-action"
            :disabled="deletingId !== null"
          >
            {{ deletingId ? 'Διαγραφή...' : 'Διαγραφή' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../../api/endpoints";

const drafts = ref<any[]>([]);
const loading = ref(true);
const initialized = ref(false);
const deletingId = ref<string | null>(null);
const showDeleteModal = ref(false);
const draftToDelete = ref<{ id: string; title: string } | null>(null);

async function fetchDrafts() {
  loading.value = true;
  try {
    const response = await api.admin.draftQueue();
    drafts.value = response.data;
  } catch (error) {
    console.error("Failed to fetch drafts:", error);
  } finally {
    loading.value = false;
    initialized.value = true;
  }
}

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

function getHostname(url: string | undefined): string {
  if (!url) return 'Unknown';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getConfidenceClass(conf: number): string {
  if (conf >= 0.8) return 'high';
  if (conf >= 0.5) return 'med';
  return 'low';
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
    drafts.value = drafts.value.filter((draft: any) => draft._id !== id);
    showDeleteModal.value = false;
    draftToDelete.value = null;
  } catch (error: any) {
    alert(`Σφάλμα: ${error.message}`);
    await fetchDrafts();
  } finally {
    deletingId.value = null;
  }
}

onMounted(fetchDrafts);
</script>

<style scoped>
.admin-page {
  max-width: 1200px;
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
  align-items: center;
  gap: 1rem;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.badge-count {
  background: var(--accent-primary);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 600;
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
  font-size: 4rem;
  margin-bottom: 1rem;
  color: var(--accent-success); /* Making it look positive "All clear" */
  opacity: 0.8;
}

/* Drafts Grid */
.drafts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.draft-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.draft-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.draft-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.confidence-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
}

.confidence-badge.high { background: rgba(52, 211, 153, 0.1); color: #34d399; }
.confidence-badge.med { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
.confidence-badge.low { background: rgba(248, 113, 113, 0.1); color: #f87171; }

.source-tag {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
}

.draft-card h3 {
  font-size: 1.1rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  line-height: 1.4;
}

.summary {
  font-size: 0.9rem;
  color: var(--text-secondary);
  flex: 1;
  margin-bottom: 1.5rem;
}

.draft-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-primary { background: var(--accent-primary); color: white; }
.btn-primary:hover { background: var(--accent-hover); }

.btn-outline { 
  background: transparent; 
  border: 1px solid var(--border-color); 
  color: var(--text-primary); 
}
.btn-outline:hover { border-color: var(--text-secondary); }

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  margin-left: auto;
  transition: all 0.2s;
}

.btn-icon.danger:hover {
  background: rgba(248, 113, 113, 0.1);
  border-color: #f87171;
  color: #f87171;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 1rem;
  width: 90%;
  max-width: 450px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.modal-header {
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 { margin: 0; font-size: 1.2rem; }

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body { padding: 1.5rem; }

.draft-preview {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 0.5rem;
  margin: 1rem 0;
  border-left: 3px solid #f87171;
}

.modal-footer {
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn-ghost { background: transparent; color: var(--text-secondary); }
.btn-ghost:hover { color: var(--text-primary); }

.btn-danger-action { background: #f87171; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer; }
.btn-danger-action:hover { background: #ef4444; }
</style>
