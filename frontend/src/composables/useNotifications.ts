import { ref } from "vue";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

export function useNotifications() {
  function showToast(message: string, type: Toast["type"] = "success", duration = 3000) {
    const id = nextId++;
    toasts.value.push({ id, message, type, duration });

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  function removeToast(id: number) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  return {
    toasts,
    showToast,
    removeToast,
  };
}
