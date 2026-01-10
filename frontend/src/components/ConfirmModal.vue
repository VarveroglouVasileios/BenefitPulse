<template>
  <Transition name="fade">
    <div v-if="show" class="modal-backdrop" @click="$emit('cancel')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" @click="$emit('cancel')">×</button>
        </div>
        <div class="modal-body">
          <p>{{ message }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="$emit('cancel')">
            {{ cancelText || 'Ακύρωση' }}
          </button>
          <button 
            class="btn" 
            :class="type === 'danger' ? 'btn-danger' : 'btn-primary'" 
            @click="$emit('confirm')"
          >
            {{ confirmText || 'Επιβεβαίωση' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'danger' | 'warning';
}>();

defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  border-radius: 1rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transform-origin: center;
  transition: all 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-body {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-color);
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .modal-content {
  transition: transform 0.3s ease;
}

.fade-enter-from .modal-content,
.fade-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
