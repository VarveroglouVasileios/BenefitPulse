<template>
  <div
    class="opportunity-card"
    role="button"
    tabindex="0"
    @click="goToDetail"
    @keydown.enter="goToDetail"
    @keydown.space.prevent="goToDetail"
  >
    <div class="header">
      <h3>{{ opportunity.title }}</h3>
      <Badge :type="opportunity.type" />
    </div>
    <div class="badges">
      <span v-if="isNew" class="badge new-badge">NEW</span>
      <span v-if="isExpiringSoon" class="badge expiring">EXPIRING</span>
      <span v-if="isExpired" class="badge expired">EXPIRED</span>
    </div>
    <p class="summary">
      {{ opportunity.summary && opportunity.summary.length > 150
        ? opportunity.summary.substring(0, 150) + '...'
        : (opportunity.summary || 'Δεν υπάρχει περιγραφή') }}
    </p>
    
    <!-- Meta fields -->
    <div class="card-meta">
      <div class="meta-row">
        <span class="meta-label">Πηγή:</span>
        <span class="meta-value">{{ getSourceLabel(opportunity.source) }}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Κατάσταση:</span>
        <span class="meta-value status-badge" :class="statusClass">
          {{ statusLabel }}
        </span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Ενημερώθηκε:</span>
        <span class="meta-value">{{ formatDate(opportunity.updatedAt || opportunity.publishedAt) }}</span>
      </div>
    </div>
    
    <div class="meta">
      <span v-if="opportunity.deadlineAt">
        Προθεσμία: {{ formatDate(opportunity.deadlineAt) }}
      </span>
      <span v-else class="unknown-deadline">Κατάσταση: άγνωστη — έλεγξε στο επίσημο link</span>
    </div>
    <div class="actions">
      <span class="link" :aria-label="`Δείτε περισσότερα για ${opportunity.title}`">
        Δείτε περισσότερα →
      </span>
      
      <button 
        class="share-btn"
        data-no-nav
        @click="handleShare"
        aria-label="Κοινοποίηση"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
      </button>
    </div>

    <Teleport to="body">
      <ShareModal
        :show="showShareModal"
        :url="shareUrl"
        :title="shareTitle"
        :text="shareText"
        @close="showShareModal = false"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Opportunity } from "@shared/types";
// @ts-ignore - Vue SFC default export
import Badge from "./Badge.vue";
import ShareModal from "./ShareModal.vue";

interface Props {
  opportunity: Opportunity;
}

const props = defineProps<Props>();
const router = useRouter();
const showShareModal = ref(false);
const canNativeShare = ref(false);

onMounted(() => {
  if (typeof navigator !== "undefined" && typeof navigator.share !== "undefined") {
    canNativeShare.value = true;
  }
});

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const shareUrl = computed(() => `${window.location.origin}/opportunities/${props.opportunity._id}`);
const shareTitle = computed(() => `BenefitPulse: ${props.opportunity.title}`);
const shareText = computed(() => `Δείτε αυτό: ${props.opportunity.title}`);

async function handleShare(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  if (canNativeShare.value) {
    try {
      await navigator.share({
        title: shareTitle.value,
        text: shareText.value,
        url: shareUrl.value,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        showShareModal.value = true;
      }
    }
  } else {
    showShareModal.value = true;
  }
}

function goToDetail(e?: Event) {
  if (e) {
    const target = e.target as HTMLElement;
    if (target.closest(".share-btn") || target.closest("[data-no-nav]")) return;
  }
  router.push(`/opportunities/${props.opportunity._id}`);
}

const isNew = computed(() => {
  const publishedDate = props.opportunity.publishedAt || props.opportunity.createdAt;
  if (!publishedDate) return false;
  
  const published = new Date(publishedDate).getTime();
  const now = Date.now();
  const diffHours = (now - published) / (1000 * 60 * 60);
  
  return diffHours <= 48; // New if published within last 48 hours
});

const isExpired = computed(() => {
  if (!props.opportunity.deadlineAt) return false;
  const deadline = new Date(props.opportunity.deadlineAt).getTime();
  const now = Date.now();
  return deadline < now;
});

const isExpiringSoon = computed(() => {
  if (!props.opportunity.deadlineAt) return false;
  const deadline = new Date(props.opportunity.deadlineAt).getTime();
  const now = Date.now();
  const diffDays = (deadline - now) / MS_PER_DAY;
  return diffDays >= 0 && diffDays <= 7;
});

const statusLabel = computed(() => {
  // First check computed expiry states
  if (isExpired.value) return "Έληξε";
  if (isExpiringSoon.value) return "Λήγει σύντομα";
  
  // Check backend badge if available
  const badge = (props.opportunity as any).badge;
  const appStatus = badge?.applicationStatus || (props.opportunity as any).applicationStatus;
  
  if (appStatus) {
    const statusMap: Record<string, string> = {
      "open": "Ανοικτό",
      "upcoming": "Προσεχώς",
      "closed": "Έκλεισε",
      "expired": "Έληξε",
      "results": "Αποτελέσματα",
      "news": "Νέα",
      "processing": "Σε επεξεργασία",
      "unknown": "Σε επεξεργασία", // Map unknown to friendly label
    };
    return statusMap[appStatus] || appStatus;
  }
  
  // Fallback for items without badge
  if (props.opportunity.deadlineAt) return "Ανοικτό";
  return "Σε επεξεργασία";
});

const statusClass = computed(() => {
  if (isExpired.value) return "status-expired";
  if (isExpiringSoon.value) return "status-expiring";
  
  // Check backend badge
  const badge = (props.opportunity as any).badge;
  const appStatus = badge?.applicationStatus || (props.opportunity as any).applicationStatus;
  
  if (appStatus) {
    const classMap: Record<string, string> = {
      "open": "status-open",
      "upcoming": "status-upcoming",
      "closed": "status-expired",
      "expired": "status-expired",
      "results": "status-results",
      "news": "status-news",
      "processing": "status-processing",
      "unknown": "status-processing", // Use same style as processing
    };
    return classMap[appStatus] || "status-unknown";
  }
  
  if (props.opportunity.deadlineAt) return "status-open";
  return "status-processing";
});

function getSourceLabel(source: string): string {
  const sourceMap: Record<string, string> = {
    "gov.gr": "gov.gr",
    "vouchers.gov.gr": "vouchers.gov.gr",
    "dypa": "ΔΥΠΑ",
    "opeka": "ΟΠΕΚΑ",
  };
  return sourceMap[source.toLowerCase()] || source;
}

function formatDate(date: string | Date): string {
  if (!date) return "Άγνωστη ημερομηνία";
  
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Relative dates for recent items
  if (diffDays === 0) return "Σήμερα";
  if (diffDays === 1) return "Χθες";
  if (diffDays > 1 && diffDays < 7) return `πριν ${diffDays} ημέρες`;
  if (diffDays >= 7 && diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `πριν ${weeks} ${weeks === 1 ? 'εβδομάδα' : 'εβδομάδες'}`;
  }
  
  // Absolute date for older items
  return d.toLocaleDateString("el-GR", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
</script>

<style scoped>
.opportunity-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1rem;
  transition: box-shadow 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  min-width: 0;
}

.opportunity-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-hover);
}

.opportunity-card:focus {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.badge {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.expiring {
  background-color: #fff3cd;
  color: #856404;
}

.badge.expired {
  background-color: #f8d7da;
  color: #721c24;
}

.badge.new-badge {
  background-color: #d1e7dd;
  color: #0f5132;
  border: 1px solid #badbcc;
}

.header h3 {
  flex: 1;
  margin-right: 1rem;
  font-size: 1rem;
  line-height: 1.3;
}

@media (min-width: 640px) {
  .opportunity-card {
    padding: 1.5rem;
  }
  .header h3 {
    font-size: 1.1rem;
  }
}

.summary {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.meta-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.meta-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.meta-value {
  color: var(--text-primary);
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-open {
  background: #d1fae5;
  color: #065f46;
}

.status-expiring {
  background: #fef3c7;
  color: #92400e;
}

.status-expired {
  background: #fee2e2;
  color: #991b1b;
}

.status-unknown {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.status-processing {
  background: #fef3c7;
  color: #92400e;
}

.status-upcoming {
  background: #dbeafe;
  color: #1e40af;
}

.status-results {
  background: #ede9fe;
  color: #5b21b6;
}

.status-news {
  background: #ccfbf1;
  color: #0f766e;
}

.meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-tertiary);
  margin-bottom: auto; /* Push actions to bottom if card height is fixed, but here it helps spacing */
}

.unknown-deadline {
  font-style: italic;
  color: var(--text-tertiary);
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}

.link {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.link:hover {
  color: var(--accent-hover);
}

.share-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  position: relative;
}

.share-btn:hover {
  background: var(--bg-tertiary);
  color: var(--accent-primary);
}

.copied-msg {
  position: absolute;
  top: -30px;
  right: 0;
  background: black;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
