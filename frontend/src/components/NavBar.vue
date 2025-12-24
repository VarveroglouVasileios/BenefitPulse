<template>
  <header class="navbar">
    <div class="container">
      <div class="brand">
        <router-link to="/">BenefitPulse</router-link>
      </div>
      <nav>
        <router-link to="/">Αρχική</router-link>
        <router-link to="/opportunities">Όλες</router-link>
        <router-link to="/trending">Δημοφιλή</router-link>
        <router-link v-if="isAuthenticated" to="/for-you">Για Εσάς</router-link>
        <router-link v-if="isAuthenticated" to="/bookmarks"
          >Αγαπημένα</router-link
        >
        <router-link v-if="isAdmin" to="/admin">Admin</router-link>
      </nav>
      <div class="actions">
        <button class="theme-toggle" @click="toggleTheme" :aria-label="theme === 'light' ? 'Ενεργοποίηση dark mode' : 'Ενεργοποίηση light mode'">
          <span v-if="theme === 'light'">🌙</span>
          <span v-else>☀️</span>
        </button>
        <template v-if="isAuthenticated">
          <span class="user">{{ user?.firstName || user?.email }}</span>
          <button class="btn" @click="handleLogout">Αποσύνδεση</button>
        </template>
        <template v-else>
          <router-link class="btn" to="/login">Σύνδεση</router-link>
          <router-link class="btn btn-primary" to="/register"
            >Εγγραφή</router-link
          >
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.store";
import { useThemeStore } from "../stores/theme.store";

const authStore = useAuthStore();
const themeStore = useThemeStore();
const router = useRouter();

const user = computed(() => authStore.user);
const isAuthenticated = computed(() => authStore.isAuthenticated);
const isAdmin = computed(() => authStore.isAdmin);
const theme = computed(() => themeStore.theme);

function toggleTheme() {
  themeStore.toggleTheme();
}

async function handleLogout() {
  await authStore.logout();
  router.push("/");
}
</script>

<style scoped>
.navbar {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 0.75rem 0;
  box-shadow: var(--shadow-md);
  border-bottom: 1px solid var(--border-color);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand a {
  color: var(--text-primary);
  font-weight: 700;
  font-size: 1.2rem;
  text-decoration: none;
}

nav {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

nav a {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 600;
  padding: 0.35rem 0.5rem;
  border-radius: 0.35rem;
  transition: background 0.2s, color 0.2s;
}

nav a.router-link-active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

nav a:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.theme-toggle {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.35rem 0.75rem;
  border-radius: 0.35rem;
  cursor: pointer;
  font-size: 1.2rem;
  transition: background 0.2s, border-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
}

.theme-toggle:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
}

.user {
  color: var(--text-secondary);
  font-weight: 600;
}

.btn {
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  padding: 0.35rem 0.75rem;
  border-radius: 0.35rem;
  cursor: pointer;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
}

.btn-primary {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #fff;
}

.btn-primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

@media (max-width: 768px) {
  .container {
    flex-wrap: wrap;
  }
  nav {
    width: 100%;
    justify-content: center;
  }
  .actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
