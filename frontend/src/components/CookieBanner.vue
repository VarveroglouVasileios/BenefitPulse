<template>
  <div v-if="showBanner" class="cookie-banner">
    <div class="cookie-content">
      <div class="cookie-text">
        <p>
          <strong>Χρήση Cookies:</strong> Χρησιμοποιούμε cookies για την
          καλύτερη εμπειρία σας στην πλατφόρμα. Συνεχίζοντας, αποδέχεστε τη
          χρήση cookies σύμφωνα με την
          <router-link to="/privacy">Πολιτική Απορρήτου</router-link>.
        </p>
      </div>
      <div class="cookie-actions">
        <button @click="acceptCookies" class="btn btn-accept">Αποδοχή</button>
        <button @click="rejectCookies" class="btn btn-reject">Απόρριψη</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useCookieConsentStore } from "../stores/cookieConsent.store";

const cookieConsentStore = useCookieConsentStore();
const showBanner = ref(false);

onMounted(() => {
  // Check if consent has been given (stored in memory via Pinia)
  const consent = cookieConsentStore.getConsent();
  if (!consent) {
    showBanner.value = true;
  }
});

function acceptCookies() {
  cookieConsentStore.setConsent("accepted");
  showBanner.value = false;
  // Initialize tracking if consent is given
  // This will be handled by useTracking composable checking consent
}

function rejectCookies() {
  cookieConsentStore.setConsent("rejected");
  showBanner.value = false;
  // Do not initialize tracking - useTracking will check consent before sending any data
}
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-top: 2px solid var(--accent-primary);
  box-shadow: 0 -4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding: 1.5rem;
}

.cookie-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.cookie-text {
  flex: 1;
  min-width: 300px;
}

.cookie-text p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.6;
  font-size: 0.9rem;
}

.cookie-text strong {
  color: var(--link-color);
  font-weight: 600;
}

.cookie-text a {
  color: var(--link-color);
  text-decoration: underline;
}

.cookie-actions {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-accept {
  background: var(--accent-primary);
  color: white;
}

.btn-accept:hover {
  background: var(--accent-hover);
}

.btn-reject {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.btn-reject:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

@media (max-width: 768px) {
  .cookie-content {
    flex-direction: column;
    align-items: stretch;
  }

  .cookie-actions {
    width: 100%;
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
