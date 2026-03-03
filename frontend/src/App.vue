<template>
  <div id="app">
    <NavBar />
    <main class="content">
      <router-view />
    </main>
    <Footer />
    <Chatbot />
    <CookieBanner />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useTracking } from "./composables/useTracking";
import { useAuthStore } from "./stores/auth.store";
import { useThemeStore } from "./stores/theme.store";
import NavBar from "./components/NavBar.vue";
import Footer from "./components/Footer.vue";
import Chatbot from "./components/Chatbot.vue";
import CookieBanner from "./components/CookieBanner.vue";

const { trackPageview } = useTracking();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const router = useRouter();

// Force scroll to top on mount and after route changes
function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  // Also try document elements as fallback
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

onMounted(async () => {
  // Immediately scroll to top (before any async operations)
  scrollToTop();
  
  // Scroll again after DOM is ready
  await nextTick();
  scrollToTop();
  
  // Scroll again after a short delay to override browser's saved scroll position
  setTimeout(() => {
    scrollToTop();
  }, 50);
  
  // Non-blocking fetch
  authStore.fetchMe().then(async () => {
      // Load theme only after we know who the user is
      if (authStore.isAuthenticated && authStore.user) {
        await nextTick();
        themeStore.loadTheme();
      }
  });

  trackPageview(window.location.pathname);
  
  // Final scroll to top after everything is loaded
  setTimeout(() => {
    scrollToTop();
  }, 100);
});

// Watch for route changes and scroll to top
watch(() => router.currentRoute.value.path, () => {
  nextTick(() => {
    scrollToTop();
    setTimeout(() => scrollToTop(), 50);
  });
});

// Watch for auth changes (e.g., after login/logout)
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated && authStore.user) {
    themeStore.loadTheme();
  } else if (!isAuthenticated) {
    // Reset to system theme when logged out
    themeStore.userTheme = null;
    themeStore.applyTheme(themeStore.systemTheme);
  }
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Light mode colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --border-color: #e5e7eb;
  --border-hover: #d1d5db;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --primary-color: #3b82f6;
  --accent-primary: #3b82f6;
  --accent-hover: #2563eb;
  --accent-light: #eff6ff;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
}

.dark {
  /* Dark mode colors */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  --border-color: #334155;
  --border-hover: #475569;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  --primary-color: #3b82f6;
  --accent-primary: #3b82f6;
  --accent-hover: #60a5fa;
  --accent-light: #1e3a8a;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
}

html {
  scroll-behavior: auto !important;
  overflow-anchor: none;
  overflow-x: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
  overflow-anchor: none;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
  background-color: var(--bg-primary);
  overflow-x: hidden;
  max-width: 100vw;
}

.content {
  min-height: calc(100vh - 56px);
  padding-top: 0.5rem;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  background-color: var(--bg-primary);
}
</style>
