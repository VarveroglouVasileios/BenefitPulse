<template>
  <div class="skeleton-card">
    <div class="skeleton-header">
      <div class="skeleton-title shimmer"></div>
      <div class="skeleton-badge shimmer"></div>
    </div>
    <div class="skeleton-badges">
      <div class="skeleton-small-badge shimmer"></div>
    </div>
    <div class="skeleton-body">
      <div class="skeleton-line full shimmer"></div>
      <div class="skeleton-line full shimmer"></div>
      <div class="skeleton-line three-quarter shimmer"></div>
    </div>
    
    <div class="skeleton-meta-box">
      <div class="skeleton-meta-row shimmer"></div>
      <div class="skeleton-meta-row shimmer"></div>
      <div class="skeleton-meta-row shimmer"></div>
    </div>

    <div class="skeleton-deadline shimmer"></div>

    <div class="skeleton-actions">
      <div class="skeleton-link shimmer"></div>
      <div class="skeleton-share shimmer"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

@media (min-width: 640px) {
  .skeleton-card {
    padding: 1.5rem;
  }
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.skeleton-title {
  height: 1.2rem;
  width: 70%;
  background: var(--bg-tertiary);
  border-radius: 0.25rem;
}

.skeleton-badge {
  height: 1.5rem;
  width: 60px;
  background: var(--bg-tertiary);
  border-radius: 999px;
}

.skeleton-badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.skeleton-small-badge {
  height: 1rem;
  width: 40px;
  background: var(--bg-tertiary);
  border-radius: 999px;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.skeleton-line {
  height: 0.85rem;
  background: var(--bg-tertiary);
  border-radius: 0.25rem;
}

.skeleton-line.full {
  width: 100%;
}

.skeleton-line.three-quarter {
  width: 75%;
}

.skeleton-meta-box {
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.skeleton-meta-row {
  height: 0.75rem;
  width: 50%;
  background: var(--border-color);
  border-radius: 0.25rem;
}

.skeleton-deadline {
  height: 0.85rem;
  width: 40%;
  background: var(--bg-tertiary);
  border-radius: 0.25rem;
  margin-bottom: auto;
}

.skeleton-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}

.skeleton-link {
  height: 1rem;
  width: 120px;
  background: var(--bg-tertiary);
  border-radius: 0.25rem;
}

.skeleton-share {
  height: 2rem;
  width: 2rem;
  background: var(--bg-tertiary);
  border-radius: 50%;
}

.shimmer {
  position: relative;
  overflow: hidden;
  background-color: var(--bg-tertiary);
}

.shimmer::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.2) 20%,
    rgba(255, 255, 255, 0.5) 60%,
    rgba(255, 255, 255, 0)
  );
  animation: shimmer 2s infinite;
  content: '';
}

.dark .shimmer::after {
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.05) 20%,
    rgba(255, 255, 255, 0.1) 60%,
    rgba(255, 255, 255, 0)
  );
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
