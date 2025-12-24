import { NavigationGuardNext, RouteLocationNormalized } from "vue-router";
import { useAuthStore } from "../stores/auth.store";

export async function authGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  const authStore = useAuthStore();

  // Αν υπάρχει token αλλά δεν έχουμε φορτώσει ακόμη user, κάνε hydrate από /auth/me
  if (authStore.token && !authStore.user) {
    try {
      await authStore.fetchMe();
    } catch {
      // αν αποτύχει, θα καθαριστεί το token από το store/http interceptor
    }
  }

  if (authStore.isAuthenticated) {
    next();
  } else {
    next("/login");
  }
}

export async function adminGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  const authStore = useAuthStore();

  if (authStore.token && !authStore.user) {
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
