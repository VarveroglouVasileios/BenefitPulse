<template>
  <nav class="admin-breadcrumbs" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
      <li class="breadcrumb-item">
        <router-link to="/admin" class="breadcrumb-link">
          <span class="breadcrumb-icon">🏠</span>
          Admin Dashboard
        </router-link>
      </li>
      <li v-if="currentPage" class="breadcrumb-item">
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-current">{{ currentPage }}</span>
      </li>
    </ol>
    <button @click="goBack" class="back-button" aria-label="Πίσω">
      <span class="back-icon">←</span>
      Πίσω
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const pageTitles: Record<string, string> = {
  '/admin/drafts': 'Draft Queue',
  '/admin/opportunities': 'Διαχείριση Ευκαιριών',
  '/admin/audit': 'Audit Log',
  '/admin/contact': 'Επικοινωνία',
};

const currentPage = computed(() => {
  const path = route.path;
  // Check for exact matches first
  if (pageTitles[path]) {
    return pageTitles[path];
  }
  // Check for edit routes
  if (path.includes('/admin/opportunities/') && path.includes('/edit')) {
    if (path.includes('/new/edit')) {
      return 'Νέα Ευκαιρία';
    }
    return 'Επεξεργασία Ευκαιρίας';
  }
  return null;
});

function goBack() {
  // If we're on a sub-page (like edit), go to parent list
  if (route.path.includes('/edit')) {
    // Extract parent path (e.g., /admin/opportunities/123/edit -> /admin/opportunities)
    const parts = route.path.split('/').filter(Boolean);
    // Remove last 2 parts (id and 'edit')
    const parentParts = parts.slice(0, -2);
    const parentPath = '/' + parentParts.join('/') || '/admin/opportunities';
    router.push(parentPath);
  } else if (route.path !== '/admin' && route.path !== '/admin/') {
    // If we're on any admin page (not dashboard), go to dashboard
    router.push('/admin');
  } else {
    // If we're already on dashboard, go to home
    router.push('/');
  }
}
</script>

<style scoped>
.admin-breadcrumbs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0.5rem;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
  font-size: 0.9rem;
}

.breadcrumb-link:hover {
  color: var(--accent-primary);
}

.breadcrumb-icon {
  font-size: 1rem;
}

.breadcrumb-separator {
  color: var(--text-secondary);
  font-size: 1.2rem;
  margin: 0 0.25rem;
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.back-button:hover {
  background: var(--bg-secondary);
  border-color: var(--border-hover);
  color: var(--accent-primary);
}

.back-icon {
  font-size: 1.2rem;
  line-height: 1;
}

@media (max-width: 640px) {
  .admin-breadcrumbs {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .back-button {
    width: 100%;
    justify-content: center;
  }
}
</style>

