<template>
  <div class="not-found">
    <div class="content">
      <h1>404</h1>
      <h2>Η σελίδα δεν βρέθηκε</h2>
      <p>
        Η σελίδα που ψάχνετε ίσως έχει μετακινηθεί ή διαγραφεί.
      </p>
      <router-link to="/" class="btn btn-primary">
        Επιστροφή στην Αρχική
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// No script needed for this simple static page
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
}

.content {
  max-width: 500px;
}

h1 {
  font-size: 6rem;
  font-weight: 800;
  color: var(--primary-color);
  margin: 0;
  line-height: 1;
  opacity: 0.1;
}

h2 {
  font-size: 2rem;
  color: var(--text-primary);
  margin-top: -1rem;
  margin-bottom: 1rem;
}

p {
  color: var(--text-secondary);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}
</style>
