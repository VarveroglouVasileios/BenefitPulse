<template>
  <div class="admin-contact">
    <div class="header">
      <h1>Διαχείριση Επικοινωνίας</h1>
      <div class="filters">
        <select v-model="selectedType" @change="fetchSubmissions" class="filter-select">
          <option value="">Όλοι οι τύποι</option>
          <option value="error">Αναφορά λάθους</option>
          <option value="source">Πρόταση πηγής</option>
          <option value="general">Γενική επικοινωνία</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else-if="submissions.length === 0" class="empty">
      Δεν υπάρχουν υποβολές επικοινωνίας.
    </div>
    <div v-else class="submissions-list">
      <div v-for="submission in submissions" :key="submission._id" class="submission-card">
        <div class="submission-header">
          <div class="submission-meta">
            <span class="type-badge" :class="`type-${submission.type}`">
              {{ getTypeLabel(submission.type) }}
            </span>
            <span class="date">{{ formatDate(submission.createdAt) }}</span>
          </div>
        </div>
        
        <div class="submission-content">
          <div class="field">
            <strong>Από:</strong> {{ submission.name }} ({{ submission.email }})
          </div>
          <div class="field">
            <strong>Θέμα:</strong> {{ submission.subject }}
          </div>
          <div class="field">
            <strong>Μήνυμα:</strong>
            <div class="message">{{ submission.message }}</div>
          </div>
        </div>

        <div class="submission-actions">
          <button 
            @click="openReplyModal(submission)" 
            class="btn btn-primary"
          >
            Απάντηση
          </button>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button 
        @click="changePage(page - 1)" 
        :disabled="page === 1"
        class="btn btn-secondary"
      >
        Προηγούμενο
      </button>
      <span>Σελίδα {{ page }} από {{ totalPages }}</span>
      <button 
        @click="changePage(page + 1)" 
        :disabled="page === totalPages"
        class="btn btn-secondary"
      >
        Επόμενο
      </button>
    </div>

    <!-- Reply Modal -->
    <div v-if="replyModalOpen" class="modal-overlay" @click="closeReplyModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Απάντηση σε {{ selectedSubmission?.name }}</h2>
          <button class="close-btn" @click="closeReplyModal">×</button>
        </div>
        
        <div v-if="selectedSubmission" class="original-message">
          <h3>Αρχικό μήνυμα:</h3>
          <div class="message-box">{{ selectedSubmission.message }}</div>
        </div>

        <form @submit.prevent="sendReply" class="reply-form">
          <div class="form-group">
            <label>Η απάντησή σας:</label>
            <textarea 
              v-model="replyMessage" 
              rows="8" 
              required
              placeholder="Γράψτε την απάντησή σας..."
              class="reply-textarea"
            ></textarea>
          </div>

          <div v-if="replyError" class="error-box">
            {{ replyError }}
          </div>

          <div v-if="replySuccess" class="success-box">
            Η απάντηση στάλθηκε επιτυχώς!
          </div>

          <div class="form-actions">
            <button type="button" @click="closeReplyModal" class="btn btn-secondary">
              Ακύρωση
            </button>
            <button type="submit" :disabled="replyLoading" class="btn btn-primary">
              {{ replyLoading ? "Αποστολή..." : "Αποστολή Email" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { api } from "../../api/endpoints";

interface ContactSubmission {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  type: "error" | "source" | "general";
  createdAt: string;
}

const submissions = ref<ContactSubmission[]>([]);
const loading = ref(true);
const selectedType = ref("");
const page = ref(1);
const limit = 10;
const total = ref(0);

const replyModalOpen = ref(false);
const selectedSubmission = ref<ContactSubmission | null>(null);
const replyMessage = ref("");
const replyLoading = ref(false);
const replyError = ref("");
const replySuccess = ref(false);

const totalPages = computed(() => Math.ceil(total.value / limit));

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    error: "Αναφορά λάθους",
    source: "Πρόταση πηγής",
    general: "Γενική επικοινωνία",
  };
  return labels[type] || type;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("el-GR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function fetchSubmissions() {
  loading.value = true;
  try {
    const response = await api.admin.contact.list({
      page: page.value,
      limit,
      type: selectedType.value || undefined,
    });
    submissions.value = response.data.submissions;
    total.value = response.data.total;
  } catch (error: any) {
    console.error("Failed to fetch submissions:", error);
  } finally {
    loading.value = false;
  }
}

function changePage(newPage: number) {
  page.value = newPage;
  fetchSubmissions();
}

function openReplyModal(submission: ContactSubmission) {
  selectedSubmission.value = submission;
  replyMessage.value = "";
  replyError.value = "";
  replySuccess.value = false;
  replyModalOpen.value = true;
}

function closeReplyModal() {
  replyModalOpen.value = false;
  selectedSubmission.value = null;
  replyMessage.value = "";
  replyError.value = "";
  replySuccess.value = false;
}

async function sendReply() {
  if (!selectedSubmission.value) return;

  replyLoading.value = true;
  replyError.value = "";
  replySuccess.value = false;

  try {
    await api.admin.contact.reply(
      selectedSubmission.value._id,
      replyMessage.value
    );
    replySuccess.value = true;
    setTimeout(() => {
      closeReplyModal();
      fetchSubmissions();
    }, 1500);
  } catch (error: any) {
    replyError.value =
      error.response?.data?.error || "Σφάλμα κατά την αποστολή";
  } finally {
    replyLoading.value = false;
  }
}

onMounted(() => {
  fetchSubmissions();
});
</script>

<style scoped>
.admin-contact {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0;
  color: var(--text-primary);
}

.filters {
  display: flex;
  gap: 1rem;
}

.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
}

.loading,
.empty {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.submissions-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.submission-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: box-shadow 0.2s;
}

.submission-card:hover {
  box-shadow: var(--shadow-md);
}

.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.submission-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.type-error {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error);
}

.dark .type-error {
  background: rgba(239, 68, 68, 0.3);
}

.type-source {
  background: rgba(59, 130, 246, 0.2);
  color: var(--accent-primary);
}

.dark .type-source {
  background: rgba(59, 130, 246, 0.3);
}

.type-general {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.date {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.submission-content {
  margin-bottom: 1rem;
}

.field {
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.field strong {
  color: var(--text-primary);
}

.message {
  margin-top: 0.5rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 0.5rem;
  white-space: pre-wrap;
  line-height: 1.6;
}

.submission-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 1rem;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-lg);
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.5rem;
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
  transition: background 0.2s, color 0.2s;
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.original-message {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.original-message h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.message-box {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  white-space: pre-wrap;
  line-height: 1.6;
  color: var(--text-secondary);
}

.reply-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.reply-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 1rem;
  font-family: inherit;
  background: var(--bg-secondary);
  color: var(--text-primary);
  resize: vertical;
  min-height: 200px;
}

.reply-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.error-box {
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  border: 1px solid var(--error);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.success-box {
  padding: 0.75rem 1rem;
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
  border: 1px solid var(--success);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .admin-contact {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>



