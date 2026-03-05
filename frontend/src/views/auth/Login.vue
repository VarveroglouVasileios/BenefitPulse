<template>
  <div class="login">
    <form @submit.prevent="handleLogin">
      <h1>Σύνδεση</h1>
      <div class="form-group">
        <label>Email</label>
        <input v-model="email" type="email" required />
      </div>
      <div class="form-group">
        <label>Κωδικός</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit" :disabled="loading" class="btn btn-primary">
        {{ loading ? "Σύνδεση..." : "Σύνδεση" }}
      </button>
      <div v-if="errorMessage" class="error-box">{{ errorMessage }}</div>
      <p>
        Δεν έχετε λογαριασμό;
        <router-link to="/register">Εγγραφείτε</router-link>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth.store";

const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");

async function handleLogin() {
  errorMessage.value = "";
  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    router.push("/for-you");
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || "Σφάλμα σύνδεσης";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login {
  max-width: 400px;
  margin: 4rem auto;
  padding: 2rem;
}

.login h1 {
  color: var(--text-primary);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 0.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-box {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.25rem;
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  border: 1px solid var(--error);
  font-size: 0.95rem;
}

.login p {
  margin-top: 1rem;
  text-align: center;
  color: var(--text-secondary);
}

.login a {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 600;
}

.login a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}
</style>
