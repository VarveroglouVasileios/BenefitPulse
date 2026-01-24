<template>
  <div class="register">
    <form @submit.prevent="handleRegister">
      <h1>Εγγραφή</h1>

      <div class="form-row">
        <div class="form-group">
          <label>Όνομα <span class="required">*</span></label>
          <input
            v-model="form.firstName"
            type="text"
            :class="{ error: errors.firstName }"
            @blur="validateField('firstName')"
          />
          <span v-if="errors.firstName" class="error-message">{{
            errors.firstName
          }}</span>
        </div>

        <div class="form-group">
          <label>Επώνυμο <span class="required">*</span></label>
          <input
            v-model="form.lastName"
            type="text"
            :class="{ error: errors.lastName }"
            @blur="validateField('lastName')"
          />
          <span v-if="errors.lastName" class="error-message">{{
            errors.lastName
          }}</span>
        </div>
      </div>

      <div class="form-group">
        <label>Email <span class="required">*</span></label>
        <input
          v-model="form.email"
          type="email"
          :class="{ error: errors.email }"
          @blur="validateField('email')"
        />
        <span v-if="errors.email" class="error-message">{{
          errors.email
        }}</span>
      </div>

      <div class="form-group">
        <label>Κωδικός <span class="required">*</span></label>
        <input
          v-model="form.password"
          type="password"
          :class="{ error: errors.password }"
          @blur="validateField('password')"
        />
        <span v-if="errors.password" class="error-message">{{
          errors.password
        }}</span>
        <div class="password-hints">
          <small>Ο κωδικός πρέπει να έχει:</small>
          <ul>
            <li :class="{ valid: passwordChecks.length }">
              Τουλάχιστον 8 χαρακτήρες
            </li>
            <li :class="{ valid: passwordChecks.uppercase }">
              Ένα κεφαλαίο γράμμα
            </li>
            <li :class="{ valid: passwordChecks.lowercase }">
              Ένα πεζό γράμμα
            </li>
            <li :class="{ valid: passwordChecks.number }">Έναν αριθμό</li>
          </ul>
        </div>
      </div>

      <div class="form-group">
        <label>Επιβεβαίωση Κωδικού <span class="required">*</span></label>
        <input
          v-model="form.passwordConfirm"
          type="password"
          :class="{ error: errors.passwordConfirm }"
          @blur="validateField('passwordConfirm')"
        />
        <span v-if="errors.passwordConfirm" class="error-message">{{
          errors.passwordConfirm
        }}</span>
      </div>

      <div class="form-group checkbox-group">
        <label>
          <input
            v-model="form.acceptTerms"
            type="checkbox"
            :class="{ error: errors.acceptTerms }"
            required
          />
          <span>
            Έχω διαβάσει και αποδέχομαι τους
            <router-link to="/terms" target="_blank">Όρους Χρήσης</router-link> και την
            <router-link to="/privacy" target="_blank">Πολιτική Απορρήτου</router-link>
            <span class="required">*</span>
          </span>
        </label>
        <span v-if="errors.acceptTerms" class="error-message">{{
          errors.acceptTerms
        }}</span>
        <small class="checkbox-hint">
          Η αποδοχή είναι υποχρεωτική για τη χρήση της πλατφόρμας.
        </small>
      </div>

      <button
        type="submit"
        :disabled="loading || !isFormValid"
        class="btn btn-primary"
      >
        {{ loading ? "Εγγραφή..." : "Εγγραφή" }}
      </button>

      <p>
        Έχετε ήδη λογαριασμό;
        <router-link to="/login">Συνδεθείτε</router-link>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth.store";
import { registerSchema } from "../../../../shared/src/index";

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  passwordConfirm: "",
  acceptTerms: false,
});

const errors = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  passwordConfirm: "",
  acceptTerms: "",
});

const loading = ref(false);

const passwordChecks = computed(() => ({
  length: form.password.length >= 8,
  uppercase: /[A-Z]/.test(form.password),
  lowercase: /[a-z]/.test(form.password),
  number: /[0-9]/.test(form.password),
}));

const isFormValid = computed(() => {
  return (
    form.firstName &&
    form.lastName &&
    form.email &&
    form.password &&
    form.passwordConfirm &&
    form.acceptTerms &&
    Object.values(errors).every((e) => !e) &&
    passwordChecks.value.length &&
    passwordChecks.value.uppercase &&
    passwordChecks.value.lowercase &&
    passwordChecks.value.number &&
    form.password === form.passwordConfirm
  );
});

function validateField(field: string) {
  const validationResult = registerSchema.safeParse({
    email: form.email,
    password: form.password,
    passwordConfirm: form.passwordConfirm,
    firstName: form.firstName,
    lastName: form.lastName,
    acceptTerms: form.acceptTerms,
  });

  if (!validationResult.success) {
    const fieldError = validationResult.error.errors.find(
      (e: any) => e.path[0] === field
    );
    if (fieldError) {
      (errors as any)[field] = fieldError.message;
    } else {
      (errors as any)[field] = "";
    }
  } else {
    (errors as any)[field] = "";
  }
}

function validateForm(): boolean {
  const validationResult = registerSchema.safeParse({
    email: form.email,
    password: form.password,
    passwordConfirm: form.passwordConfirm,
    firstName: form.firstName,
    lastName: form.lastName,
    acceptTerms: form.acceptTerms,
  });

  if (!validationResult.success) {
    validationResult.error.errors.forEach((error: any) => {
      const field = error.path[0] as string;
      (errors as any)[field] = error.message;
    });
    return false;
  }

  // Clear errors
  Object.keys(errors).forEach((key) => {
    (errors as any)[key] = "";
  });
  return true;
}

async function handleRegister() {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  try {
    await authStore.register({
      email: form.email,
      password: form.password,
      passwordConfirm: form.passwordConfirm,
      firstName: form.firstName,
      lastName: form.lastName,
      acceptTerms: form.acceptTerms,
    });
    router.push("/profile/wizard");
  } catch (error: any) {
    if (error.response?.data?.errors) {
      // Server-side validation errors
      error.response.data.errors.forEach((err: any) => {
        if (err.field && (errors as any)[err.field] !== undefined) {
          (errors as any)[err.field] = err.message;
        }
      });
    } else {
      alert(error.response?.data?.error || "Σφάλμα εγγραφής");
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
  text-align: center;
  color: var(--text-primary);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

.required {
  color: var(--error);
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  font-size: 1rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-group input.error {
  border-color: var(--error);
}

.error-message {
  display: block;
  color: var(--error);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.password-hints {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  border: 1px solid var(--border-color);
}

.password-hints small {
  color: var(--text-secondary);
}

.password-hints ul {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
  list-style: none;
}

.password-hints li {
  margin: 0.25rem 0;
  color: var(--text-tertiary);
}

.password-hints li.valid {
  color: var(--success);
}

.password-hints li.valid::before {
  content: "✓ ";
  color: #28a745;
}

.checkbox-group label {
  display: flex;
  align-items: start;
  gap: 0.5rem;
  font-weight: normal;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin-top: 0.25rem;
  cursor: pointer;
}

.checkbox-group a {
  color: var(--accent-primary);
  text-decoration: underline;
}

.checkbox-group span {
  color: var(--text-primary);
}

.checkbox-hint {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-tertiary);
  font-size: 0.875rem;
}

.btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
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

p {
  text-align: center;
  margin-top: 1.5rem;
  color: var(--text-secondary);
}

p a {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 600;
}

p a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
