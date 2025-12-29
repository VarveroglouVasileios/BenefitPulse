<template>
  <div class="opportunity-card">
    <div class="header">
      <h3>{{ opportunity.title }}</h3>
      <Badge :type="opportunity.type" />
    </div>
    <div class="badges">
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
    <router-link 
      :to="`/opportunities/${opportunity._id}`" 
      class="link"
      :aria-label="`Δείτε περισσότερα για ${opportunity.title}`"
    >
      Δείτε περισσότερα →
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Opportunity } from "../../../shared/src/types";
// @ts-ignore - Vue SFC default export
import Badge from "./Badge.vue";

interface Props {
  opportunity: Opportunity;
}

const props = defineProps<Props>();

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
  if (isExpired.value) return "Έληξε";
  if (isExpiringSoon.value) return "Λήγει σύντομα";
  if (props.opportunity.deadlineAt) return "Ανοικτό";
  return "Άγνωστο";
});

const statusClass = computed(() => {
  if (isExpired.value) return "status-expired";
  if (isExpiringSoon.value) return "status-expiring";
  if (props.opportunity.deadlineAt) return "status-open";
  return "status-unknown";
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
  padding: 1.5rem;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.opportunity-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-hover);
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

.header h3 {
  flex: 1;
  margin-right: 1rem;
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

.meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-tertiary);
  margin-bottom: 1rem;
}

.unknown-deadline {
  font-style: italic;
  color: var(--text-tertiary);
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
</style>
