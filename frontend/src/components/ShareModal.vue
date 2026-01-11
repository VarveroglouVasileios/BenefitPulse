<template>
  <Transition name="fade">
    <div v-if="show" class="modal-backdrop" @click="$emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Κοινοποίηση</h3>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
        
        <div class="modal-body">
          <div class="share-grid">
            <!-- WhatsApp -->
            <a :href="whatsappUrl" target="_blank" rel="noopener noreferrer" class="share-item whatsapp">
              <div class="icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </div>
              <span>WhatsApp</span>
            </a>

            <!-- Facebook -->
            <a :href="facebookUrl" target="_blank" rel="noopener noreferrer" class="share-item facebook">
              <div class="icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </div>
              <span>Facebook</span>
            </a>

            <!-- Twitter/X -->
            <a :href="twitterUrl" target="_blank" rel="noopener noreferrer" class="share-item twitter">
              <div class="icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>
              </div>
              <span>X</span>
            </a>

            <!-- Viber -->
            <a :href="viberUrl" class="share-item viber">
              <div class="icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.3 16c-1.3.8-3 .4-4.8-1.4-1.8-1.8-2.2-3.5-1.4-4.8.8-1.3.5-2.7-1-3.8-1.2-1-2.4-.7-2.9.1C6.6 7 5 9.4 6.3 12.3c2 4.3 5.4 7.7 9.7 9.7 2.9 1.3 5.3-.6 6.2-1.9.8-.5 1.1-1.7.1-2.9-1.1-1.5-2.5-1.8-3.8-1z"></path></svg>
              </div>
              <span>Viber</span>
            </a>

            <!-- Email -->
            <a :href="emailUrl" class="share-item email">
              <div class="icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
              <span>Email</span>
            </a>

            <!-- Copy Link -->
            <button @click="copyLink" class="share-item copy">
              <div class="icon-circle">
                <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span>{{ copied ? 'Αντιγράφηκε' : 'Αντιγραφή' }}</span>
            </button>

            <!-- Native Share (More) -->
            <button v-if="canNativeShare" @click="nativeShare" class="share-item more">
              <div class="icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
              </div>
              <span>Άλλα...</span>
            </button>
          </div>
          
          <div class="share-link-preview">
            <input type="text" :value="url" readonly @click="copyLink">
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';

const props = defineProps<{
  show: boolean;
  url: string;
  title: string;
  text: string;
}>();

const emit = defineEmits(['close']);

const copied = ref(false);
const canNativeShare = ref(false);

onMounted(() => {
  if (typeof navigator !== 'undefined' && typeof navigator.share !== 'undefined') {
    canNativeShare.value = true;
  }
});

const encodedUrl = computed(() => encodeURIComponent(props.url));
const encodedText = computed(() => encodeURIComponent(props.text));
const encodedTitle = computed(() => encodeURIComponent(props.title));

const facebookUrl = computed(() => 
  `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl.value}`
);

const twitterUrl = computed(() => 
  `https://twitter.com/intent/tweet?text=${encodedText.value}&url=${encodedUrl.value}`
);

const whatsappUrl = computed(() => 
  `https://wa.me/?text=${encodedText.value}%20${encodedUrl.value}`
);

const viberUrl = computed(() => 
  `viber://forward?text=${encodedText.value}%20${encodedUrl.value}`
);

const emailUrl = computed(() => 
  `mailto:?subject=${encodedTitle.value}&body=${encodedText.value}%0A%0A${encodedUrl.value}`
);

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.url);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
}

async function nativeShare() {
  if (!navigator.share) return;
  try {
    await navigator.share({
      title: props.title,
      text: props.text,
      url: props.url
    });
    emit('close');
  } catch (err) {
    console.log('Share canceled or failed', err);
  }
}
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
  align-items: flex-end; /* Mobile bottom sheet style */
  z-index: 1000;
}

@media (min-width: 640px) {
  .modal-backdrop {
    align-items: center;
  }
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  border-top-left-radius: 1.5rem;
  border-top-right-radius: 1.5rem;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.1);
  transform-origin: bottom center;
}

@media (min-width: 640px) {
  .modal-content {
    border-radius: 1rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    transform-origin: center;
    width: 90%;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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

.share-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.share-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background 0.2s;
  color: var(--text-primary);
}

.share-item:hover .icon-circle {
  transform: scale(1.05);
}

/* Brand Colors */
.facebook .icon-circle { color: white; background: #1877F2; }
.twitter .icon-circle { color: white; background: #000000; }
.whatsapp .icon-circle { color: white; background: #25D366; }
.viber .icon-circle { color: white; background: #7360f2; }
.email .icon-circle { color: white; background: #EA4335; }
.copy .icon-circle { color: var(--text-primary); background: var(--border-color); }
.more .icon-circle { color: var(--text-primary); background: var(--bg-tertiary); border: 1px solid var(--border-color); }

.share-link-preview {
  background: var(--bg-tertiary);
  padding: 0.75rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
}

.share-link-preview input {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
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
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-from .modal-content,
.fade-leave-to .modal-content {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .fade-enter-from .modal-content,
  .fade-leave-to .modal-content {
    transform: scale(0.95);
  }
}
</style>
