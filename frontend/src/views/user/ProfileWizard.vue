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
          <option value="selfEmployed">Αυτοαπασχολούμενος</option>
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
          <option value="eastern_macedonia_thrace">Ανατολική Μακεδονία και Θράκη</option>
          <option value="central_macedonia">Κεντρική Μακεδονία</option>
          <option value="western_macedonia">Δυτική Μακεδονία</option>
          <option value="epirus">Ήπειρος</option>
          <option value="thessaly">Θεσσαλία</option>
          <option value="central_greece">Στερεά Ελλάδα</option>
          <option value="ionian_islands">Ιόνια Νησιά</option>
          <option value="western_greece">Δυτική Ελλάδα</option>
          <option value="peloponnese">Πελοπόννησος</option>
          <option value="attiki">Αττική</option>
          <option value="north_aegean">Βόρειο Αιγαίο</option>
          <option value="south_aegean">Νότιο Αιγαίο</option>
          <option value="crete">Κρήτη</option>
        </select>
      </div>

      <!-- Education & Work Section -->
      <div class="section-divider">
        <h2>Εκπαίδευση & Εργασία</h2>
        <p class="section-description">Βοηθήστε μας να σας προτείνουμε σχετικές θέσεις εργασίας</p>
      </div>

      <div class="form-group">
        <label>Επίπεδο Εκπαίδευσης</label>
        <select v-model="profile.educationLevel">
          <option value="">Επιλέξτε...</option>
          <option value="None">Καμία</option>
          <option value="YE">Υποχρεωτική Εκπαίδευση</option>
          <option value="DE">Δευτεροβάθμια Εκπαίδευση</option>
          <option value="TE">Τεχνολογική Εκπαίδευση</option>
          <option value="PE">Πανεπιστημιακή Εκπαίδευση</option>
          <option value="Master">Μεταπτυχιακό</option>
          <option value="PhD">Διδακτορικό</option>
        </select>
        <div v-if="validationErrors?.find((e) => e.field === 'educationLevel')" class="error-message">
          {{ validationErrors.find((e) => e.field === 'educationLevel')?.message }}
        </div>
      </div>

      <div class="form-group">
        <label>Κατηγορία Πτυχίου / Ειδικότητα</label>
        <input
          type="text"
          v-model="degreeCategoryInput"
          @blur="updateDegreeCategories"
          placeholder="π.χ. Πληροφορική, Οικονομικά, Μηχανικοί..."
          class="input-text"
        />
        <p class="hint-text">Μπορείτε να προσθέσετε πολλές κατηγορίες, χωρισμένες με κόμμα</p>
        <div v-if="profile.degreeCategories && profile.degreeCategories.length > 0" class="tags-list">
          <span
            v-for="(cat, index) in profile.degreeCategories"
            :key="index"
            class="tag"
          >
            {{ cat }}
            <button
              type="button"
              @click="removeDegreeCategory(index)"
              class="tag-remove"
              aria-label="Αφαίρεση"
            >
              ×
            </button>
          </span>
        </div>
        <div v-if="validationErrors?.find((e) => e.field === 'degreeCategories')" class="error-message">
          {{ validationErrors.find((e) => e.field === 'degreeCategories')?.message }}
        </div>
      </div>

      <div class="form-group">
        <label>Έτη Εργασιακής Εμπειρίας</label>
        <input
          type="number"
          v-model.number="profile.workExperienceYears"
          min="0"
          max="50"
          placeholder="0"
          class="input-number"
        />
        <div v-if="validationErrors?.find((e) => e.field === 'workExperienceYears')" class="error-message">
          {{ validationErrors.find((e) => e.field === 'workExperienceYears')?.message }}
        </div>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="profile.driverLicense" />
          Διαθέτω άδεια οδήγησης
        </label>
      </div>

      <!-- Hard Skills Section -->
      <div class="section-divider">
        <h2>Δεξιότητες & Ικανότητες</h2>
        <p class="section-description">Προσθέστε τις τεχνικές και επαγγελματικές σας δεξιότητες για καλύτερο matching με θέσεις εργασίας</p>
      </div>

      <div class="form-group">
        <label>Προσθήκη Νέας Δεξιότητας</label>
        <div class="skill-input-group">
          <input
            type="text"
            v-model="newSkill.name"
            placeholder="π.χ. JavaScript, Microsoft Office, Project Management..."
            class="input-text skill-name-input"
          />
          <select v-model="newSkill.category" class="skill-category-select">
            <option value="">Κατηγορία...</option>
            <option value="technical">Τεχνικές (Προγραμματισμός, IT)</option>
            <option value="software">Λογισμικό (MS Office, Adobe, κλπ)</option>
            <option value="language">Γλώσσες</option>
            <option value="certification">Πιστοποιήσεις</option>
            <option value="professional">Επαγγελματικές (Διοίκηση, Λογιστική, κλπ)</option>
            <option value="other">Άλλες</option>
          </select>
          <select v-model="newSkill.level" class="skill-level-select">
            <option value="">Επίπεδο...</option>
            <option value="beginner">Αρχάριος</option>
            <option value="intermediate">Μέτριος</option>
            <option value="advanced">Προχωρημένος</option>
            <option value="expert">Ειδικός</option>
          </select>
          <input
            type="number"
            v-model.number="newSkill.yearsOfExperience"
            min="0"
            max="50"
            placeholder="Έτη"
            class="input-number skill-years-input"
          />
          <button
            type="button"
            @click="addHardSkill"
            :disabled="!newSkill.name || !newSkill.category"
            class="btn btn-secondary btn-add-skill"
          >
            Προσθήκη
          </button>
        </div>
        <div v-if="validationErrors?.find((e) => e.field === 'hardSkills')" class="error-message">
          {{ validationErrors.find((e) => e.field === 'hardSkills')?.message }}
        </div>
      </div>

      <div v-if="profile.hardSkills && profile.hardSkills.length > 0" class="skills-list">
        <div
          v-for="(skill, index) in profile.hardSkills"
          :key="index"
          class="skill-item"
        >
          <div class="skill-info">
            <span class="skill-name">{{ skill.name }}</span>
            <span class="skill-badge skill-category">{{ getCategoryLabel(skill.category) }}</span>
            <span v-if="skill.level" class="skill-badge skill-level">{{ getLevelLabel(skill.level) }}</span>
            <span v-if="skill.yearsOfExperience" class="skill-years">{{ skill.yearsOfExperience }} έτη</span>
          </div>
          <button
            type="button"
            @click="removeHardSkill(index)"
            class="skill-remove"
            aria-label="Αφαίρεση"
          >
            ×
          </button>
        </div>
      </div>
      <div v-else class="no-skills-hint">
        <p>Δεν έχετε προσθέσει δεξιότητες ακόμα. Προσθέστε τουλάχιστον μία για καλύτερο matching.</p>
      </div>

      <div v-if="errorMessage || (validationErrors && validationErrors.length > 0)" class="error-box">
        <div v-if="errorMessage">{{ errorMessage }}</div>
        <div v-if="validationErrors && validationErrors.length > 0">
          <strong>Σφάλματα επικύρωσης:</strong>
          <ul style="margin: 0.5rem 0 0 1.5rem; padding: 0;">
            <li v-for="(err, index) in validationErrors" :key="index">
              {{ getFieldLabel(err.field) }}: {{ err.message }}
            </li>
          </ul>
        </div>
      </div>
      <button type="submit" :disabled="loading" class="btn btn-primary">
        {{ loading ? "Αποθήκευση..." : "Αποθήκευση" }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
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
  // Education & Work
  educationLevel: "",
  degreeCategories: [] as string[],
  workExperienceYears: undefined as number | undefined,
  driverLicense: false,
  // Hard Skills
  hardSkills: [] as Array<{
    name: string;
    category: "technical" | "software" | "language" | "certification" | "professional" | "other";
    level?: "beginner" | "intermediate" | "advanced" | "expert";
    yearsOfExperience?: number;
  }>,
});

const degreeCategoryInput = ref("");
const newSkill = ref({
  name: "",
  category: "" as "" | "technical" | "software" | "language" | "certification" | "professional" | "other",
  level: "" as "" | "beginner" | "intermediate" | "advanced" | "expert",
  yearsOfExperience: undefined as number | undefined,
});

const loading = ref(false);
const errorMessage = ref("");
const validationErrors = ref<Array<{ field: string; message: string }>>([]);

// Helper function to convert empty strings to undefined
function cleanValue(value: string | undefined): string | undefined {
  return value && value.trim() !== "" ? value : undefined;
}

// Helper function to get Greek field labels
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    ageRange: "Ηλικιακή ομάδα",
    incomeRange: "Εισοδηματική κατηγορία",
    employmentStatus: "Επαγγελματική κατάσταση",
    isStudent: "Κατάσταση φοιτητή",
    region: "Περιοχή",
    educationLevel: "Επίπεδο Εκπαίδευσης",
    degreeCategories: "Κατηγορία Πτυχίου",
    workExperienceYears: "Έτη Εργασιακής Εμπειρίας",
    driverLicense: "Άδεια Οδήγησης",
    hardSkills: "Δεξιότητες",
  };
  return labels[field] || field;
}

// Helper functions for Hard Skills
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    technical: "Τεχνικές",
    software: "Λογισμικό",
    language: "Γλώσσες",
    certification: "Πιστοποιήσεις",
    professional: "Επαγγελματικές",
    other: "Άλλες",
  };
  return labels[category] || category;
}

function getLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    beginner: "Αρχάριος",
    intermediate: "Μέτριος",
    advanced: "Προχωρημένος",
    expert: "Ειδικός",
  };
  return labels[level] || level;
}

function addHardSkill() {
  if (!newSkill.value.name || !newSkill.value.category) return;
  
  profile.value.hardSkills.push({
    name: newSkill.value.name.trim(),
    category: newSkill.value.category,
    level: newSkill.value.level || undefined,
    yearsOfExperience: newSkill.value.yearsOfExperience || undefined,
  });
  
  // Reset form
  newSkill.value = {
    name: "",
    category: "",
    level: "",
    yearsOfExperience: undefined,
  };
}

function removeHardSkill(index: number) {
  profile.value.hardSkills.splice(index, 1);
}

// Helper function to update degree categories from input
function updateDegreeCategories() {
  if (!degreeCategoryInput.value.trim()) return;
  
  const categories = degreeCategoryInput.value
    .split(",")
    .map((cat) => cat.trim())
    .filter((cat) => cat.length > 0);
  
  // Add new categories that don't already exist
  categories.forEach((cat) => {
    if (!profile.value.degreeCategories.includes(cat)) {
      profile.value.degreeCategories.push(cat);
    }
  });
  
  degreeCategoryInput.value = "";
}

// Helper function to remove a degree category
function removeDegreeCategory(index: number) {
  profile.value.degreeCategories.splice(index, 1);
}

onMounted(async () => {
  await profileStore.fetchProfile();
  if (profileStore.profile) {
    profile.value = {
      ageRange: profileStore.profile.ageRange || "",
      incomeRange: profileStore.profile.incomeRange || "",
      employmentStatus: profileStore.profile.employmentStatus || "",
      isStudent: profileStore.profile.isStudent || false,
      region: profileStore.profile.region || "",
      // Education & Work
      educationLevel: profileStore.profile.educationLevel || "",
      degreeCategories: profileStore.profile.degreeCategories || [],
      workExperienceYears: profileStore.profile.workExperienceYears,
      driverLicense: profileStore.profile.driverLicense || false,
      // Hard Skills
      hardSkills: profileStore.profile.hardSkills || [],
    };
  }
});

async function handleSubmit() {
  loading.value = true;
  errorMessage.value = "";
  validationErrors.value = [];
  
  try {
    // Clean empty strings to undefined before sending
    const updates: Record<string, any> = {};
    
    if (profile.value.ageRange && profile.value.ageRange.trim() !== "") {
      updates.ageRange = profile.value.ageRange;
    }
    if (profile.value.incomeRange && profile.value.incomeRange.trim() !== "") {
      updates.incomeRange = profile.value.incomeRange;
    }
    if (profile.value.employmentStatus && profile.value.employmentStatus.trim() !== "") {
      updates.employmentStatus = profile.value.employmentStatus;
    }
    if (profile.value.region && profile.value.region.trim() !== "") {
      updates.region = profile.value.region;
    }
    updates.isStudent = profile.value.isStudent;
    
    // Education & Work
    if (profile.value.educationLevel && profile.value.educationLevel.trim() !== "") {
      updates.educationLevel = profile.value.educationLevel;
    }
    if (profile.value.degreeCategories && profile.value.degreeCategories.length > 0) {
      updates.degreeCategories = profile.value.degreeCategories;
    }
    if (profile.value.workExperienceYears !== undefined && profile.value.workExperienceYears !== null) {
      updates.workExperienceYears = profile.value.workExperienceYears;
    }
    updates.driverLicense = profile.value.driverLicense;
    
    // Hard Skills
    if (profile.value.hardSkills && profile.value.hardSkills.length > 0) {
      updates.hardSkills = profile.value.hardSkills;
    }
    
    await profileStore.updateProfile(updates);
    router.push("/for-you");
  } catch (error: any) {
    // Handle validation errors from backend
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      validationErrors.value = error.response.data.errors;
      errorMessage.value = error.response.data.error || "Υπάρχουν σφάλματα επικύρωσης";
    } else {
      // Show generic error message
      const errorText = error.response?.data?.error || 
                       error.response?.data?.message || 
                       error.message || 
                       "Σφάλμα αποθήκευσης προφίλ. Παρακαλώ δοκιμάστε ξανά.";
      errorMessage.value = errorText;
    }
    
    // Scroll to error message
    await nextTick();
    const errorBox = document.querySelector('.error-box');
    if (errorBox) {
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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

.form-group select,
.form-group .input-text,
.form-group .input-number {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  font-size: 1rem;
}

.form-group .input-number {
  -moz-appearance: textfield;
}

.form-group .input-number::-webkit-outer-spin-button,
.form-group .input-number::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.section-divider {
  margin: 2rem 0 1.5rem 0;
  padding-top: 2rem;
  border-top: 2px solid #e5e7eb;
}

.section-divider h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.section-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.hint-text {
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.tag-remove {
  background: none;
  border: none;
  color: #3730a3;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.tag-remove:hover {
  background: #c7d2fe;
}

.error-message {
  margin-top: 0.5rem;
  color: #dc2626;
  font-size: 0.875rem;
}

.skill-input-group {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 0.8fr auto;
  gap: 0.5rem;
  align-items: start;
}

.skill-name-input {
  min-width: 0;
}

.skill-category-select,
.skill-level-select {
  min-width: 0;
}

.skill-years-input {
  min-width: 0;
  width: 100%;
}

.btn-add-skill {
  white-space: nowrap;
  padding: 0.75rem 1rem;
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.skill-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.skill-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.skill-name {
  font-weight: 600;
  color: #1f2937;
}

.skill-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.skill-category {
  background: #dbeafe;
  color: #1e40af;
}

.skill-level {
  background: #fef3c7;
  color: #92400e;
}

.skill-years {
  color: #6b7280;
  font-size: 0.875rem;
}

.skill-remove {
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.skill-remove:hover {
  background: #fee2e2;
}

.no-skills-hint {
  margin-top: 1rem;
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 0.375rem;
  color: #92400e;
  font-size: 0.875rem;
}

.no-skills-hint p {
  margin: 0;
}

@media (max-width: 768px) {
  .skill-input-group {
    grid-template-columns: 1fr;
  }
  
  .skill-info {
    flex-direction: column;
    align-items: flex-start;
  }
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

.error-box {
  padding: 0.75rem 1rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 0.25rem;
  color: #c33;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
}
</style>
