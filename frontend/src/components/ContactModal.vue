<template>
  <div v-if="isOpen" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button class="close-btn" @click="close" aria-label="Κλείσιμο">×</button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="contact-form">
        <div class="form-group">
          <label for="name">Όνομα <span class="required">*</span></label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            placeholder="Το όνομά σας"
          />
        </div>
        
        <div class="form-group">
          <label for="email">Email <span class="required">*</span></label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            placeholder="email@example.com"
          />
        </div>
        
        <div class="form-group">
          <label for="subject">Θέμα <span class="required">*</span></label>
          <input
            id="subject"
            v-model="form.subject"
            type="text"
            required
            :placeholder="subjectPlaceholder"
          />
        </div>
        
        <div class="form-group">
          <label for="message">Μήνυμα <span class="required">*</span></label>
          <textarea
            id="message"
            v-model="form.message"
            required
            rows="6"
            placeholder="Περιγράψτε το θέμα σας..."
          ></textarea>
        </div>
        
        <div v-if="errorMessage" class="error-box">
          {{ errorMessage }}
        </div>
        
        <div v-if="successMessage" class="success-box">
          {{ successMessage }}
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="close">
            Ακύρωση
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? "Αποστολή..." : "Αποστολή" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { api } from "../api/endpoints";

interface Props {
  isOpen: boolean;
  type: "error" | "source" | "general";
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const form = ref({
  name: "",
  email: "",
  subject: "",
  message: "",
});

const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const title = ref("");
const subjectPlaceholder = ref("");

watch(
  () => props.type,
  (newType) => {
    if (newType === "error") {
      title.value = "Αναφορά Λάθους";
      subjectPlaceholder.value = "π.χ. Λάθος πληροφορία σε ευκαιρία";
      form.value.subject = "Αναφορά λάθους";
      form.value.message = "";
    } else if (newType === "source") {
      title.value = "Πρόταση Νέας Πηγής";
      subjectPlaceholder.value = "π.χ. Προσθήκη νέας επίσημης πηγής";
      form.value.subject = "Πρόταση νέας πηγής";
      form.value.message = "";
    } else {
      title.value = "Επικοινωνία";
      subjectPlaceholder.value = "Θέμα επικοινωνίας";
      form.value.subject = "";
      form.value.message = "";
    }
  },
  { immediate: true }
);

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      errorMessage.value = "";
      successMessage.value = "";
      if (props.type === "error") {
        form.value.message = "";
      } else if (props.type === "source") {
        form.value.message = "";
      }
    }
  }
);

function close() {
  emit("close");
  // Reset form after closing
  setTimeout(() => {
    form.value = {
      name: "",
      email: "",
      subject: "",
      message: "",
    };
    errorMessage.value = "";
    successMessage.value = "";
  }, 300);
}

async function handleSubmit() {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await api.contact.submit({
      name: form.value.name,
      email: form.value.email,
      subject: form.value.subject,
      message: form.value.message,
      type: props.type,
    });

    successMessage.value = "Το μήνυμά σας στάλθηκε επιτυχώς! Θα σας απαντήσουμε το συντομότερο δυνατό.";
    
    setTimeout(() => {
      close();
    }, 2000);
  } catch (error: any) {
    errorMessage.value =
      error.response?.data?.error || "Σφάλμα κατά την αποστολή. Παρακαλώ δοκιμάστε ξανά.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
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
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-lg);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  color: var(--text-primary);
  font-size: 1.5rem;
  margin: 0;
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

.contact-form {
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

.required {
  color: var(--error);
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 1rem;
  font-family: inherit;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
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
  margin-top: 2rem;
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

.btn-secondary:hover {
  background: var(--bg-secondary);
  border-color: var(--border-hover);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 600px) {
  .modal-content {
    margin: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>

