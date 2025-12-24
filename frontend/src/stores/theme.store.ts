import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "../api/endpoints";
import { useAuthStore } from "./auth.store";

type Theme = "light" | "dark";

function applyTheme(newTheme: Theme) {
  const root = document.documentElement;
  if (newTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// Get system preference theme
function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export const useThemeStore = defineStore("theme", () => {
  const authStore = useAuthStore();
  const userTheme = ref<Theme | null>(null);
  const systemTheme = ref<Theme>(getSystemTheme());
  const isLoadingTheme = ref(false);

  // Computed theme: user preference if logged in and set, otherwise system preference
  const theme = computed<Theme>(() => {
    if (authStore.isAuthenticated && userTheme.value) {
      return userTheme.value;
    }
    return systemTheme.value;
  });

  async function loadTheme() {
    if (isLoadingTheme.value) return; // Prevent concurrent loads
    
    if (!authStore.isAuthenticated) {
      userTheme.value = null;
      applyTheme(systemTheme.value);
      return;
    }

    isLoadingTheme.value = true;
    try {
      const response = await api.profile.get();
      const profileTheme = response.data.theme;
      if (profileTheme === "light" || profileTheme === "dark") {
        userTheme.value = profileTheme;
        applyTheme(profileTheme);
      } else {
        // No theme saved, use system preference
        userTheme.value = null;
        applyTheme(systemTheme.value);
      }
    } catch (error) {
      console.error("Failed to load theme from profile:", error);
      // On error, keep current theme (don't reset)
    } finally {
      isLoadingTheme.value = false;
    }
  }

  async function setTheme(newTheme: Theme) {
    // Update local state immediately for instant feedback
    if (authStore.isAuthenticated) {
      userTheme.value = newTheme;
    } else {
      systemTheme.value = newTheme;
    }
    applyTheme(newTheme);

    // Save to backend if authenticated
    if (authStore.isAuthenticated) {
      try {
        const response = await api.profile.updateTheme(newTheme);
        // Verify the save was successful
        if (response.data.theme === newTheme) {
          userTheme.value = newTheme;
        } else {
          console.warn("Theme save response mismatch:", response.data.theme, "expected:", newTheme);
        }
      } catch (error) {
        console.error("Failed to save theme to profile:", error);
        // Keep the local state even if save fails (user sees the change)
      }
    }
  }

  function toggleTheme() {
    setTheme(theme.value === "light" ? "dark" : "light");
  }

  // Watch for system theme changes (only for anonymous users)
  if (typeof window !== "undefined") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (e) => {
      const newSystemTheme = e.matches ? "dark" : "light";
      systemTheme.value = newSystemTheme;
      
      // Only apply if user is not logged in or doesn't have a saved preference
      if (!authStore.isAuthenticated || !userTheme.value) {
        applyTheme(newSystemTheme);
      }
    });
  }

  // Initialize theme from system preference (before login/profile load)
  applyTheme(systemTheme.value);

  return {
    theme,
    userTheme,
    systemTheme,
    setTheme,
    toggleTheme,
    loadTheme,
    applyTheme,
  };
});

