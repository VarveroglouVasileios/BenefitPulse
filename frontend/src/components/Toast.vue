<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
        @click="removeToast(toast.id)"
      >
        <span class="icon">
          <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <svg v-else-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </span>
        <span class="message">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useNotifications } from "../composables/useNotifications";

const { toasts, removeToast } = useNotifications();
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 280px;
  max-width: 90vw;
  cursor: pointer;
}

.toast.success {
  border-left: 4px solid var(--success);
}

.toast.error {
  border-left: 4px solid var(--error);
}

.toast.info {
  border-left: 4px solid var(--primary-color);
}

.icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.success .icon { color: var(--success); }
.error .icon { color: var(--error); }
.info .icon { color: var(--primary-color); }

.message {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
