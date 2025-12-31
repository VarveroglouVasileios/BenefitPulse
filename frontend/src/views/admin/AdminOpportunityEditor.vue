<template>
  <div class="admin-editor">
    <AdminBreadcrumbs />
    <h1>{{ isNew ? "Νέα Ευκαιρία" : "Επεξεργασία Ευκαιρίας" }}</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Τίτλος</label>
        <input v-model="form.title" required />
      </div>
      <div class="form-group">
        <label>Περίληψη</label>
        <textarea v-model="form.summary" required rows="5"></textarea>
      </div>
      <div class="form-group">
        <label>Επίσημος Σύνδεσμος</label>
        <input v-model="form.officialUrl" type="url" required />
      </div>
      <div class="form-group">
        <label>Τύπος</label>
        <select v-model="form.type" required>
          <option value="subsidy">Επίδομα</option>
          <option value="voucher">Voucher</option>
          <option value="program">Πρόγραμμα</option>
          <option value="public_call">Προκήρυξη</option>
          <option value="asep_competition">ΑΣΕΠ</option>
          <option value="manual">Χειροκίνητο</option>
        </select>
      </div>
      <div class="form-group">
        <label>Κατάσταση</label>
        <select v-model="form.status" required>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <button type="submit" :disabled="loading" class="btn btn-primary">
        {{ loading ? "Αποθήκευση..." : "Αποθήκευση" }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../../api/endpoints";
import AdminBreadcrumbs from "../../components/AdminBreadcrumbs.vue";

const route = useRoute();
const router = useRouter();

const isNew = computed(() => route.params.id === "new");
const loading = ref(false);

const form = ref({
  title: "",
  summary: "",
  officialUrl: "",
  type: "manual",
  status: "draft",
});

onMounted(async () => {
  if (!isNew.value) {
    try {
      const response = await api.admin.opportunities.get(
        route.params.id as string
      );
      const opp = response.data;
      form.value = {
        title: opp.title,
        summary: opp.summary,
        officialUrl: opp.officialUrl,
        type: opp.type,
        status: opp.status,
      };
    } catch (error) {
      alert("Σφάλμα φόρτωσης");
    }
  }
});

async function handleSubmit() {
  loading.value = true;
  try {
    if (isNew.value) {
      await api.admin.opportunities.create(form.value);
    } else {
      await api.admin.opportunities.update(
        route.params.id as string,
        form.value
      );
    }
    router.push("/admin/opportunities");
  } catch (error) {
    alert("Σφάλμα αποθήκευσης");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.admin-editor {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--text-primary);
}

.admin-editor h1 {
  color: var(--text-primary);
  margin-bottom: 2rem;
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

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 0.25rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--accent-primary);
  color: white;
  transition: background 0.2s;
}

.btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
