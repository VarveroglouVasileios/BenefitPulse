<template>
  <div class="skeleton-card">
    <div class="skeleton-header">
      <div class="skeleton-title"></div>
      <div class="skeleton-badge"></div>
    </div>
    <div class="skeleton-body">
      <div class="skeleton-line full"></div>
      <div class="skeleton-line full"></div>
      <div class="skeleton-line three-quarter"></div>
    </div>
    <div class="skeleton-footer">
      <div class="skeleton-meta"></div>
      <div class="skeleton-meta"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.skeleton-title {
  height: 1.5rem;
  width: 70%;
  background: var(--border-color);
  border-radius: 0.25rem;
  animation: pulse 1.5s infinite;
}

.skeleton-badge {
  height: 1.5rem;
  width: 20%;
  background: var(--border-color);
  border-radius: 999px;
  animation: pulse 1.5s infinite;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-line {
  height: 0.75rem;
  background: var(--border-color);
  border-radius: 0.25rem;
  animation: pulse 1.5s infinite;
}

.skeleton-line.full {
  width: 100%;
}

.skeleton-line.three-quarter {
  width: 75%;
}

.skeleton-footer {
  display: flex;
  gap: 1rem;
  margin-top: auto;
}

.skeleton-meta {
  height: 0.75rem;
  width: 30%;
  background: var(--border-color);
  border-radius: 0.25rem;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
</style>
