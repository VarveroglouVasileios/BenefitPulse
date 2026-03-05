<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="show" class="toast-container" :class="type">
        <div class="toast-content">
          <span class="icon">{{ icon }}</span>
          <p class="message">{{ message }}</p>
        </div>
        <button class="close-btn" @click="$emit('close')">OK</button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

const props = defineProps<{
  show: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const icon = computed(() => {
  switch (props.type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'info': return 'ℹ️';
    default: return '📢';
  }
});

watch(() => props.show, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      emit('close');
    }, props.duration || 3000);
  }
});
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  border-radius: 50px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 300px;
  justify-content: space-between;
  border: 1px solid rgba(0,0,0,0.05);
}

.toast-container.success {
  border-left: 4px solid var(--accent-primary, #4caf50);
}
.toast-container.error {
  border-left: 4px solid #f44336;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon {
  font-size: 1.25rem;
}

.message {
  margin: 0;
  font-weight: 500;
  color: #333;
  font-size: 0.95rem;
}

.close-btn {
  background: var(--accent-primary, #2563eb);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 0.9;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .toast-container {
    background: rgba(30, 30, 35, 0.95);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .message {
    color: #e2e2e2;
  }
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
