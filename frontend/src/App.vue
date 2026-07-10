<template>
  <div id="app">
    <a class="skip-link" href="#main-content">Μετάβαση στο κύριο περιεχόμενο</a>
    <NavBar />
    <main id="main-content" class="content" tabindex="-1">
      <router-view />
    </main>
    <Footer />
    <Chatbot />
    <CookieBanner />
    <Toast />
    
    <!-- Back to Top Button -->
    <Transition name="fade">
      <button 
        v-if="showBackToTop" 
        class="back-to-top"
        @click="scrollToTopSmooth"
        aria-label="Επιστροφή στην κορυφή"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick, ref, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useTracking } from "./composables/useTracking";
import { useAuthStore } from "./stores/auth.store";
import { useThemeStore } from "./stores/theme.store";
import NavBar from "./components/NavBar.vue";
import Footer from "./components/Footer.vue";
import Chatbot from "./components/Chatbot.vue";
import CookieBanner from "./components/CookieBanner.vue";
import Toast from "./components/Toast.vue";

const { trackPageview } = useTracking();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const router = useRouter();

const showBackToTop = ref(false);

function handleScroll() {
  showBackToTop.value = window.scrollY > 400;
}

function scrollToTopSmooth() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Force scroll to top on mount and after route changes
function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  // Also try document elements as fallback
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll);
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

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
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
  --primary-color: #2563eb;
  --accent-primary: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-light: #eff6ff;
  --link-color: #2563eb;
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
  --primary-color: #2563eb;
  --accent-primary: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-light: #1e3a8a;
  --link-color: #60a5fa;
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

.skip-link {
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 10000;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: var(--text-primary);
  color: var(--bg-primary);
  font-weight: 700;
  text-decoration: none;
  transform: translateY(-150%);
  transition: transform 0.15s ease;
}

.skip-link:focus {
  transform: translateY(0);
}

.back-to-top {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: var(--primary-color);
  color: white;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  z-index: 99;
  transition: transform 0.2s, background-color 0.2s;
}

.back-to-top:hover {
  background: var(--accent-hover);
  transform: translateY(-3px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .back-to-top {
    bottom: 1rem;
    right: 1rem;
    width: 2.5rem;
    height: 2.5rem;
  }
}
</style>
