<template>
  <div class="admin-audit">
    <AdminBreadcrumbs />
    <h1>Audit Log</h1>
    <div v-if="loading" class="loading">Φόρτωση...</div>
    <div v-else class="table">
      <table>
        <thead>
          <tr>
            <th>Ημερομηνία</th>
            <th>Admin</th>
            <th>Ενέργεια</th>
            <th>Resource</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="audit in audits" :key="audit._id">
            <td>{{ formatDate(audit.createdAt) }}</td>
            <td>{{ audit.adminId?.email || "N/A" }}</td>
            <td>{{ audit.action }}</td>
            <td>{{ audit.resourceType }} ({{ audit.resourceId }})</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../../api/endpoints";
import AdminBreadcrumbs from "../../components/AdminBreadcrumbs.vue";

const audits = ref([]);
const loading = ref(true);

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString("el-GR");
}

onMounted(async () => {
  try {
    const response = await api.admin.audit({ limit: 100 });
    audits.value = response.data.audits;
  } catch (error) {
    console.error("Failed to fetch audit log:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.admin-audit {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--text-primary);
}

.admin-audit h1 {
  color: var(--text-primary);
  margin-bottom: 2rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.table {
  overflow-x: auto;
  margin-top: 2rem;
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
</style>
