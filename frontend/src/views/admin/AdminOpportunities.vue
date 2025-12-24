<template>
  <div class="admin-opportunities">
    <div class="header">
      <h1>Διαχείριση Ευκαιριών</h1>
      <router-link to="/admin/opportunities/new/edit" class="btn btn-primary"
        >Νέα Ευκαιρία</router-link
      >
    </div>
    <div class="filters">
      <select v-model="filters.status">
        <option value="">Όλα</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
    </div>
    <div v-if="loading" class="loading">Φόρτωση...</div>
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
          <tr v-for="opp in opportunities" :key="opp._id">
            <td>{{ opp.title }}</td>
            <td>{{ opp.type }}</td>
            <td>{{ opp.status }}</td>
            <td>{{ formatDate(opp.publishedAt) }}</td>
            <td>
              <router-link
                :to="`/admin/opportunities/${opp._id}/edit`"
                class="btn-small"
                >Επεξεργασία</router-link
              >
              <button
                v-if="opp.status === 'draft'"
                @click="publish(opp._id)"
                class="btn-small"
              >
                Publish
              </button>
              <button
                v-if="opp.status === 'published'"
                @click="unpublish(opp._id)"
                class="btn-small"
              >
                Unpublish
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useAdminStore } from "../../stores/admin.store";
import { api } from "../../api/endpoints";

const adminStore = useAdminStore();
const { opportunities, loading } = adminStore;
const filters = ref({ status: "" });

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("el-GR");
}

async function publish(id: string) {
  try {
    await api.admin.opportunities.publish(id);
    await adminStore.fetchOpportunities(filters.value);
  } catch (error) {
    alert("Σφάλμα");
  }
}

async function unpublish(id: string) {
  try {
    await api.admin.opportunities.unpublish(id);
    await adminStore.fetchOpportunities(filters.value);
  } catch (error) {
    alert("Σφάλμα");
  }
}

watch(
  filters,
  () => {
    adminStore.fetchOpportunities(filters.value);
  },
  { deep: true }
);

onMounted(() => {
  adminStore.fetchOpportunities();
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

.filters select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
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
  padding: 0.75rem;
  text-align: left;
  border-bottom: 2px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-weight: 600;
}

td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

tbody tr:hover {
  background: var(--bg-tertiary);
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

.btn-small {
  padding: 0.25rem 0.75rem;
  margin-right: 0.5rem;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.btn-small:hover {
  background: var(--accent-hover);
}
</style>
