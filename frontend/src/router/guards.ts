import { NavigationGuardNext, RouteLocationNormalized } from "vue-router";
import { useAuthStore } from "../stores/auth.store";

export async function authGuard(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  const authStore = useAuthStore();

  // Αν δεν έχουμε φορτώσει ακόμη user, κάνε hydrate από /auth/me
  // Το cookie θα σταλεί αυτόματα με το request
  if (!authStore.hydrated) {
    try {
      await authStore.fetchMe();
    } catch {
      // αν αποτύχει, το user θα είναι null
    }
  }

  if (authStore.isAuthenticated) {
    next();
  } else {
    next("/login");
  }
}

export async function adminGuard(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  const authStore = useAuthStore();

  // Αν δεν έχουμε φορτώσει ακόμη user, κάνε hydrate από /auth/me
  if (!authStore.hydrated) {
    try {
      await authStore.fetchMe();
    } catch {
      // ignore
    }
  }

  if (authStore.isAuthenticated && authStore.user?.role === "admin") {
    next();
  } else {
    next("/");
  }
}
