<template>
  <div class="profile-wizard">
    <h1>Δημιουργία Προφίλ</h1>
    <p>Βοηθήστε μας να σας προτείνουμε τις σωστές ευκαιρίες</p>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Ηλικιακή ομάδα</label>
        <select v-model="profile.ageRange">
          <option value="">Επιλέξτε...</option>
          <option value="18-24">18-24</option>
          <option value="25-34">25-34</option>
          <option value="35-44">35-44</option>
          <option value="45-54">45-54</option>
          <option value="55-64">55-64</option>
          <option value="65+">65+</option>
        </select>
      </div>
      <div class="form-group">
        <label>Εισοδηματική κατηγορία</label>
        <select v-model="profile.incomeRange">
          <option value="">Επιλέξτε...</option>
          <option value="<10k">&lt;10k</option>
          <option value="10-20k">10-20k</option>
          <option value="20-30k">20-30k</option>
          <option value="30-40k">30-40k</option>
          <option value="40-50k">40-50k</option>
          <option value="50k+">50k+</option>
        </select>
      </div>
      <div class="form-group">
        <label>Επαγγελματική κατάσταση</label>
        <select v-model="profile.employmentStatus">
          <option value="">Επιλέξτε...</option>
          <option value="unemployed">Άνεργος</option>
          <option value="employed">Μισθωτός</option>
          <option value="self_employed">Αυτοαπασχολούμενος</option>
          <option value="pensioner">Συνταξιούχος</option>
          <option value="other">Άλλη</option>
        </select>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" v-model="profile.isStudent" />
          Είμαι φοιτητής/φοιτήτρια
        </label>
      </div>
      <div class="form-group">
        <label>Περιοχή</label>
        <select v-model="profile.region">
          <option value="">Επιλέξτε...</option>
          <option value="attiki">Αττική</option>
          <option value="thessaloniki">Θεσσαλονίκη</option>
          <option value="crete">Κρήτη</option>
          <option value="peloponnese">Πελοπόννησος</option>
          <option value="macedonia">Μακεδονία</option>
          <option value="thrace">Θράκη</option>
          <option value="epirus">Ήπειρος</option>
          <option value="thessaly">Θεσσαλία</option>
          <option value="central_greece">Στερεά Ελλάδα</option>
          <option value="western_greece">Δυτική Ελλάδα</option>
          <option value="aegean_islands">Αιγαίο</option>
          <option value="ionian_islands">Ιόνιο</option>
          <option value="other">Άλλο</option>
        </select>
      </div>
      <button type="submit" :disabled="loading" class="btn btn-primary">
        {{ loading ? "Αποθήκευση..." : "Αποθήκευση" }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useProfileStore } from "../../stores/profile.store";

const router = useRouter();
const profileStore = useProfileStore();

const profile = ref({
  ageRange: "",
  incomeRange: "",
  employmentStatus: "",
  isStudent: false,
  region: "",
});

const loading = ref(false);

onMounted(async () => {
  await profileStore.fetchProfile();
  if (profileStore.profile) {
    profile.value = {
      ageRange: profileStore.profile.ageRange || "",
      incomeRange: profileStore.profile.incomeRange || "",
      employmentStatus: profileStore.profile.employmentStatus || "",
      isStudent: profileStore.profile.isStudent || false,
      region: profileStore.profile.region || "",
    };
  }
});

async function handleSubmit() {
  loading.value = true;
  try {
    await profileStore.updateProfile({
      ageRange: (profile.value.ageRange || undefined) as any,
      incomeRange: (profile.value.incomeRange || undefined) as any,
      employmentStatus: (profile.value.employmentStatus || undefined) as any,
      isStudent: profile.value.isStudent,
      region: (profile.value.region || undefined) as any,
    });
    router.push("/for-you");
  } catch (error) {
    alert("Σφάλμα αποθήκευσης προφίλ");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.profile-wizard {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-group label {
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 0.25rem;
  font-weight: 600;
  cursor: pointer;
  background: #007bff;
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
