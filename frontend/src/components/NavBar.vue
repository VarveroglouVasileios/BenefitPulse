<template>
  <header class="navbar">
    <div class="container">
      <div class="brand">
        <router-link to="/" class="brand-link" @click="closeMobileMenu">
          <img src="/logo.svg" alt="BenefitPulse Logo" class="logo" />
          <span class="brand-text">BenefitPulse</span>
        </router-link>
      </div>
      
      <!-- Hamburger Button (Mobile Only) -->
      <button
        class="hamburger"
        @click="toggleMobileMenu"
        :aria-label="isMobileMenuOpen ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'"
        :aria-expanded="isMobileMenuOpen"
        type="button"
      >
        <span class="hamburger-icon">
          <span class="line" :class="{ open: isMobileMenuOpen }"></span>
          <span class="line" :class="{ open: isMobileMenuOpen }"></span>
          <span class="line" :class="{ open: isMobileMenuOpen }"></span>
        </span>
      </button>

      <!-- Desktop Navigation -->
      <nav class="desktop-nav">
        <router-link to="/" @click="closeMobileMenu">Αρχική</router-link>
        <router-link to="/opportunities" @click="closeMobileMenu">Όλες</router-link>
        <router-link to="/trending" @click="closeMobileMenu">Δημοφιλή</router-link>
        <router-link v-if="isAuthenticated" to="/for-you" @click="closeMobileMenu">Για Εσάς</router-link>
        <router-link v-if="isAuthenticated" to="/bookmarks" @click="closeMobileMenu"
          >Αγαπημένα</router-link
        >
        <router-link v-if="isAdmin" to="/admin" @click="closeMobileMenu">Admin</router-link>
      </nav>

      <!-- Mobile Navigation Menu -->
      <nav class="mobile-nav" :class="{ open: isMobileMenuOpen }">
        <router-link to="/" @click="closeMobileMenu">Αρχική</router-link>
        <router-link to="/opportunities" @click="closeMobileMenu">Όλες</router-link>
        <router-link to="/trending" @click="closeMobileMenu">Δημοφιλή</router-link>
        <router-link v-if="isAuthenticated" to="/for-you" @click="closeMobileMenu">Για Εσάς</router-link>
        <router-link v-if="isAuthenticated" to="/bookmarks" @click="closeMobileMenu"
          >Αγαπημένα</router-link
        >
        <router-link v-if="isAdmin" to="/admin" @click="closeMobileMenu">Admin</router-link>
      </nav>

      <div class="actions">
        <!-- Global Search -->
        <div class="search-container">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Αναζήτηση..." 
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch" aria-label="Αναζήτηση">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
        </div>

        <button 
          v-if="isSupported && permission !== 'denied'" 
          @click="handleNotificationClick" 
          class="btn"
          :class="{ 'btn-success': isSubscribed }"
          :aria-label="isSubscribed ? 'Οι ειδοποιήσεις είναι ενεργές' : 'Ενεργοποίηση Ειδοποιήσεων'"
          :title="isSubscribed ? 'Οι ειδοποιήσεις είναι ενεργές' : 'Ενεργοποίηση Ειδοποιήσεων'"
          :disabled="loading"
        >
          <span v-if="loading">⏳</span>
          <span v-else-if="isSubscribed">✅</span>
          <span v-else>🔔</span>
        </button>

        <!-- <button v-if="showInstallButton" @click="installPWA" class="btn btn-install">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Εγκατάσταση</span>
        </button> -->
        <button
          class="theme-toggle"
          @click="toggleTheme"
          :aria-label="
            theme === 'light'
              ? 'Ενεργοποίηση dark mode'
              : 'Ενεργοποίηση light mode'
          "
          :aria-pressed="theme === 'dark'"
          type="button"
        >
          <span v-if="theme === 'light'" aria-hidden="true">🌙</span>
          <span v-else aria-hidden="true">☀️</span>
        </button>
        <template v-if="isAuthenticated">
          <span class="user">{{ user?.firstName || user?.email }}</span>
          <button class="btn" @click="handleLogout">Αποσύνδεση</button>
        </template>
        <template v-else>
          <router-link class="btn" to="/login" @click="closeMobileMenu">Σύνδεση</router-link>
          <router-link class="btn btn-primary" to="/register" @click="closeMobileMenu"
            >Εγγραφή</router-link
          >
        </template>
      </div>
      </div>
    <Toast 
      :show="toast.show" 
      :message="toast.message" 
      :type="toast.type" 
      @close="toast.show = false" 
    />
  </header>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
// import { api } from "../api/endpoints";
import { useAuthStore } from "../stores/auth.store";
import { useThemeStore } from "../stores/theme.store";
// import { usePWA } from "../composables/usePWA";
import { useNotifications } from "../composables/useNotifications";
import Toast from "./Toast.vue";

const authStore = useAuthStore();
const themeStore = useThemeStore();
const router = useRouter();
const route = useRoute();
// const { showInstallButton, installPWA } = usePWA();

const user = computed(() => authStore.user);
const isAuthenticated = computed(() => authStore.isAuthenticated);
const isAdmin = computed(() => authStore.isAdmin);
const theme = computed(() => themeStore.theme);

const isMobileMenuOpen = ref(false);

function toggleTheme() {
  themeStore.toggleTheme();
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

// Close mobile menu when route changes
watch(() => route.path, () => {
  closeMobileMenu();
});

// async function sendTestNotification() {
//   try {
//     await api.notifications.test();
//     alert("Test notification sent!");
//   } catch (error) {
//     console.error("Failed to send test notification:", error);
//     alert("Failed to send test notification");
//   }
// }

async function handleLogout() {
  await authStore.logout();
  closeMobileMenu();
  router.push("/");
}

const searchQuery = ref("");

function handleSearch() {
  if (!searchQuery.value.trim()) return;
  router.push({
    path: "/opportunities",
    query: { search: searchQuery.value },
  });
  searchQuery.value = ""; // Clear after search
  closeMobileMenu();
}



const { enableNotifications: _enableNotifications, disableNotifications, isSubscribed, isSupported, permission, loading } = useNotifications();

const toast = ref({
  show: false,
  message: "",
  type: "info" as "success" | "error" | "info"
});

function showToast(message: string, type: "success" | "error" | "info" = "info") {
  toast.value = {
    show: true,
    message,
    type
  };
}

async function handleNotificationClick() {
  if (isSubscribed.value) {
    // Direct unsubscribe interaction
    try {
      await disableNotifications();
      showToast("Οι ειδοποιήσεις απενεργοποιήθηκαν.", "info");
    } catch (error) {
       showToast("Σφάλμα απενεργοποίησης.", "error");
    }
  } else {
    try {
      await _enableNotifications();
      // Only show success toast if actually subscribed (permission granted etc)
      if (isSubscribed.value) {
         showToast("Επιτυχής εγγραφή στις ειδοποιήσεις!", "success");
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error);
      showToast("Σφάλμα: " + (error as Error).message, "error");
    }
  }
}
</script>

<style scoped>
.navbar {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 0.75rem 0;
  box-shadow: var(--shadow-md);
  border-bottom: 1px solid var(--border-color);
  position: sticky; /* Make navbar sticky */
  top: 0;
  z-index: 100;
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

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-weight: 700;
  font-size: 1.2rem;
  text-decoration: none;
  transition: opacity 0.2s;
}

.brand-link:hover {
  opacity: 0.8;
}

.logo {
  width: 32px;
  height: 32px;
  display: block;
  flex-shrink: 0;
}

.brand-text {
  display: inline-block;
}

@media (max-width: 480px) {
  .brand-text {
    display: none;
  }
  .logo {
    width: 28px;
    height: 28px;
  }
}

/* Desktop Navigation */
.desktop-nav {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.desktop-nav a {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 600;
  padding: 0.35rem 0.5rem;
  border-radius: 0.35rem;
  transition: background 0.2s, color 0.2s;
}

.desktop-nav a.router-link-active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.desktop-nav a:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

/* Hamburger Button */
.hamburger {
  display: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.25rem;
  z-index: 1001;
}

.hamburger-icon {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 24px;
  height: 18px;
  position: relative;
}

.hamburger-icon .line {
  width: 100%;
  height: 3px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  transform-origin: center;
  position: absolute;
  left: 0;
}

.hamburger-icon .line:nth-child(1) {
  top: 0;
}

.hamburger-icon .line:nth-child(2) {
  top: 50%;
  transform: translateY(-50%);
}

.hamburger-icon .line:nth-child(3) {
  bottom: 0;
}

.hamburger-icon .line.open:nth-child(1) {
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}

.hamburger-icon .line.open:nth-child(2) {
  opacity: 0;
  transform: translateY(-50%) scale(0);
}

.hamburger-icon .line.open:nth-child(3) {
  bottom: auto;
  top: 50%;
  transform: translateY(-50%) rotate(-45deg);
}

/* Mobile Navigation */
.mobile-nav {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  flex-direction: column;
  padding: 1rem;
  gap: 0.5rem;
  z-index: 1000;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
}

.mobile-nav.open {
  max-height: 500px;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.mobile-nav a {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-radius: 0.35rem;
  transition: background 0.2s, color 0.2s;
  display: block;
}

.mobile-nav a.router-link-active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.mobile-nav a:hover {
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

.btn-success {
  background: transparent; /* Or a subtle green bg */
  color: var(--primary-color);
  border-color: transparent;
  cursor: default;
}

.btn-install {
  color: var(--text-primary);
  border: 1px solid var(--text-primary);
  background: transparent;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-install:hover {
  background: var(--bg-tertiary);
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
    position: relative;
    flex-wrap: nowrap;
  }
  
  .hamburger {
    display: flex;
  }
  
  .desktop-nav {
    display: none;
  }
  
  .mobile-nav {
    display: flex;
  }
  
  .actions {
    gap: 0.5rem;
  }
  
  .user {
    display: none;
  }
  
  .btn {
    font-size: 0.875rem;
    padding: 0.3rem 0.6rem;
  }

  .btn-install span {
    display: none;
  }
  
  .btn-install svg {
    display: block;
  }
}

@media (max-width: 480px) {
  .actions {
    gap: 0.25rem;
  }
  
  .btn {
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
  }
  
  .theme-toggle {
    min-width: 2rem;
    padding: 0.25rem 0.5rem;
  }
}

.search-container {
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0.25rem 0.5rem;
  margin-right: 0.5rem;
}

.search-input {
  background: transparent;
  border: none;
  border-radius: 999px;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  outline: none;
  width: 150px;
  transition: width 0.2s;
}

.search-input:focus {
  width: 200px;
}

.search-btn {
  background: transparent;
  border: none;
  padding: 0.25rem;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn:hover {
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .search-input {
    width: 100px;
  }
  .search-input:focus {
    width: 140px;
  }
}

@media (max-width: 480px) {
  .search-container {
    padding: 0.25rem;
    margin-right: 0.25rem;
  }
  .search-input {
    width: 0;
    padding: 0;
    opacity: 0;
    pointer-events: none;
  }
  .search-container:focus-within .search-input {
    width: 120px;
    padding: 0.25rem 0.5rem;
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
