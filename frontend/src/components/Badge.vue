<template>
  <span v-if="type" :class="['badge', `badge-${type}`]">
    {{ label }}
  </span>
  <span
    v-else-if="count !== undefined && count !== null"
    class="badge badge-count"
  >
    {{ count }}
  </span>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import type { OpportunityType } from "@shared/types";

export default defineComponent({
  name: "Badge",
  props: {
    type: String as () => OpportunityType | undefined,
    count: Number,
  },
  setup(props) {
    const label = computed(() => {
      const labels: Record<OpportunityType, string> = {
        subsidy: "Επίδομα",
        voucher: "Voucher",
        program: "Πρόγραμμα",
        public_call: "Προκήρυξη",
        asep_competition: "ΑΣΕΠ",
        manual: "Αποτελέσματα / Νέα",
        decision: "Απόφαση",
      };
      return props.type ? labels[props.type] : "";
    });

    return { label };
  },
});
</script>

<style scoped>
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.badge-subsidy {
  background: #28a745;
  color: white;
}

.badge-voucher {
  background: #17a2b8;
  color: white;
}

.badge-program {
  background: #ffc107;
  color: #333;
}

.badge-public_call {
  background: #6f42c1;
  color: white;
}

.badge-asep_competition {
  background: #dc3545;
  color: white;
}

.badge-manual {
  background: #6c757d;
  color: white;
}

.badge-count {
  background: #007bff;
  color: white;
}
</style>
