<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-column">
        <h3>Product</h3>
        <ul>
          <li><router-link to="/">Αρχική</router-link></li>
          <li><router-link to="/opportunities">Όλες</router-link></li>
          <li><router-link to="/opportunities?status=open">Πηγές</router-link></li>
        </ul>
      </div>
      
      <div class="footer-column">
        <h3>Πηγές</h3>
        <ul>
          <li><a href="https://www.gov.gr" target="_blank" rel="noopener noreferrer">gov.gr</a></li>
          <li><a href="https://vouchers.gov.gr" target="_blank" rel="noopener noreferrer">vouchers.gov.gr</a></li>
          <li><a href="https://opeka.gr" target="_blank" rel="noopener noreferrer">ΟΠΕΚΑ</a></li>
          <li><a href="https://www.dypa.gov.gr" target="_blank" rel="noopener noreferrer">ΔΥΠΑ</a></li>
        </ul>
      </div>
      
      <div class="footer-column">
        <h3>Support / Legal</h3>
        <ul>
          <li><a href="#" @click.prevent="openContactModal('error')" class="footer-link-prominent">⚠️ Αναφορά λάθους</a></li>
          <li><a href="#" @click.prevent="openContactModal('source')" class="footer-link-prominent">💡 Πρότεινε πηγή</a></li>
          <li><a href="#" @click.prevent="openContactModal('general')">Επικοινωνία</a></li>
          <li><router-link to="/terms">Όροι</router-link></li>
          <li><router-link to="/privacy">Απόρρητο</router-link></li>
        </ul>
      </div>
    </div>
    
    <div class="footer-bottom">
      <div class="footer-status">
        <span class="status-badge">🟢 System status: Operational</span>
        <span class="status-text">Last scan: κάθε 30'</span>
      </div>
      <p>&copy; 2025 BenefitPulse</p>
      <p class="disclaimer-text">
        Δεν είμαστε επίσημος φορέας. Το BenefitPulse είναι aggregator που συλλέγει πληροφορίες από επίσημες πηγές.
      </p>
    </div>
    
    <ContactModal
      :is-open="contactModalOpen"
      :type="contactModalType"
      @close="closeContactModal"
    />
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "../stores/auth.store";
import ContactModal from "./ContactModal.vue";

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

const contactModalOpen = ref(false);
const contactModalType = ref<"error" | "source" | "general">("general");

function openContactModal(type: "error" | "source" | "general") {
  contactModalType.value = type;
  contactModalOpen.value = true;
}

function closeContactModal() {
  contactModalOpen.value = false;
}
</script>

<style scoped>
.footer {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  margin-top: 4rem;
  padding: 3rem 1.5rem 1.5rem;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.footer-column h3 {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.footer-column ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-column li {
  margin-bottom: 0.5rem;
}

.footer-column a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.footer-column a:hover {
  color: var(--accent-primary);
}

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.footer-status {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.status-text {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.footer-link-prominent {
  font-weight: 700 !important;
  color: var(--accent-primary) !important;
}


.disclaimer-text {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  max-width: 700px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

