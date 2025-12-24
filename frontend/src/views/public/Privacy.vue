<template>
  <div class="privacy">
    <div class="container">
      <h1>Πολιτική Απορρήτου</h1>
      <p class="last-updated">Τελευταία ενημέρωση: {{ lastUpdated }}</p>

      <section>
        <h2>1. Εισαγωγή</h2>
        <p>
          Το BenefitPulse σέβεται το απόρρητό σας και είναι δεσμευμένο να
          προστατεύει τα προσωπικά σας δεδομένα σύμφωνα με τον Κανονισμό Γενικής
          Προστασίας Δεδομένων (GDPR) και την ελληνική νομοθεσία.
        </p>
        <p>
          Αυτή η πολιτική εξηγεί πώς συλλέγουμε, χρησιμοποιούμε, αποθηκεύουμε
          και προστατεύουμε τα προσωπικά σας δεδομένα.
        </p>
      </section>

      <section>
        <h2>2. Δεδομένα που Συλλέγουμε</h2>
        <h3>2.1 Δεδομένα Λογαριασμού</h3>
        <ul>
          <li><strong>Email:</strong> Για σύνδεση και επικοινωνία</li>
          <li><strong>Όνομα και Επώνυμο:</strong> Για προσωποποίηση</li>
          <li>
            <strong>Κωδικός:</strong> Κρυπτογραφημένος (hash), δεν αποθηκεύεται
            σε plain text
          </li>
        </ul>

        <h3>2.2 Δεδομένα Προφίλ (Προσωποποίηση)</h3>
        <p>
          Συλλέγουμε <strong>ranges και flags</strong>, όχι exact values, για
          data minimization:
        </p>
        <ul>
          <li>
            <strong>Ηλικιακή ομάδα:</strong> Buckets (18-24, 25-34, κ.λπ.)
          </li>
          <li>
            <strong>Εισοδηματική κατηγορία:</strong> Buckets (&lt;10k, 10-20k,
            κ.λπ.)
          </li>
          <li>
            <strong>Κατάσταση:</strong> Flags (student, unemployed, employee,
            κ.λπ.)
          </li>
          <li><strong>Περιοχή:</strong> Επιλογή από predefined list</li>
          <li><strong>Εκπαιδευτικό επίπεδο:</strong> (Προαιρετικό)</li>
        </ul>
        <p>
          <strong>Δεν συλλέγουμε:</strong> Exact ηλικία, exact εισόδημα, ή
          special-category data (υγεία, αναπηρία) στο MVP.
        </p>

        <h3>2.3 Analytics (First-Party)</h3>
        <p>Συλλέγουμε server-side events για analytics:</p>
        <ul>
          <li>Pageviews (path)</li>
          <li>Opportunity views</li>
          <li>Official link clicks</li>
          <li>Bookmark actions</li>
        </ul>
        <p>
          <strong>Χωρίς third-party trackers</strong> (Google Analytics,
          Facebook Pixel, κ.λπ.) στο MVP.
        </p>

        <h3>2.4 Session Data</h3>
        <p>
          Χρησιμοποιούμε session IDs για tracking επισκέψεων. Τα session IDs
          μπορούν να συνδέονται με userId αν είστε συνδεδεμένοι.
        </p>
      </section>

      <section>
        <h2>3. Νομική Βάση</h2>
        <h3>3.1 Προσωποποίηση</h3>
        <p>
          <strong>Νομική βάση:</strong> Αναγκαιότητα για εκτέλεση συμβολαίου
          (άρθρο 6(1)(b) GDPR)
        </p>
        <p>
          Χωρίς προσωποποίηση, δεν μπορούμε να παρέχουμε την κύρια υπηρεσία
          (προτάσεις ευκαιριών).
        </p>

        <h3>3.2 Analytics</h3>
        <p>
          <strong>Νομική βάση:</strong> Νόμιμο συμφέρον (άρθρο 6(1)(f) GDPR)
        </p>
        <p>
          Με data minimization και short retention (90 ημέρες). Μπορείτε να
          opt-out μέσω email.
        </p>
      </section>

      <section>
        <h2>4. Πώς Χρησιμοποιούμε τα Δεδομένα</h2>
        <ul>
          <li>
            <strong>Προσωποποίηση:</strong> Για να σας προτείνουμε ευκαιρίες που
            πιθανόν να σας αφορούν
          </li>
          <li>
            <strong>Analytics:</strong> Για να βελτιώσουμε την πλατφόρμα και να
            κατανοήσουμε τη χρήση
          </li>
          <li>
            <strong>Επικοινωνία:</strong> Για σημαντικές ενημερώσεις (μόνο όταν
            απαιτείται)
          </li>
          <li><strong>Ασφάλεια:</strong> Για προστασία από κατάχρηση</li>
        </ul>
      </section>

      <section>
        <h2>5. Κοινοποίηση Δεδομένων</h2>
        <p>
          <strong>Δεν πουλάμε</strong> τα προσωπικά σας δεδομένα σε τρίτους.
        </p>
        <p>Μπορούμε να κοινοποιήσουμε δεδομένα μόνο σε:</p>
        <ul>
          <li>
            <strong>Service providers:</strong> Hosting, database (MongoDB),
            queue (Redis) - με strict contracts
          </li>
          <li><strong>Νομικές υποχρεώσεις:</strong> Αν απαιτείται από νόμο</li>
        </ul>
      </section>

      <section>
        <h2>6. Αποθήκευση και Retention</h2>
        <ul>
          <li>
            <strong>Account data:</strong> Μέχρι να διαγράψετε τον λογαριασμό
          </li>
          <li>
            <strong>Profile data:</strong> Μέχρι να διαγράψετε τον λογαριασμό
          </li>
          <li><strong>Analytics events:</strong> 90 ημέρες (configurable)</li>
          <li><strong>Session data:</strong> 90 ημέρες αδράνειας</li>
        </ul>
      </section>

      <section>
        <h2>7. Δικαιώματα σας (GDPR)</h2>
        <p>Έχετε το δικαίωμα να:</p>
        <ul>
          <li>
            <strong>Πρόσβαση:</strong> Να ζητήσετε αντίγραφο των δεδομένων σας
          </li>
          <li><strong>Διόρθωση:</strong> Να διορθώσετε ανακριβή δεδομένα</li>
          <li>
            <strong>Διαγραφή:</strong> Να διαγράψετε τον λογαριασμό και τα
            δεδομένα σας
          </li>
          <li>
            <strong>Εναντίωση:</strong> Να αντιταχθείτε στην επεξεργασία για
            analytics (opt-out)
          </li>
          <li>
            <strong>Πορτατοποίηση:</strong> Να λάβετε τα δεδομένα σας σε
            machine-readable format
          </li>
        </ul>
        <p>
          Για να ασκήσετε τα δικαιώματά σας, επικοινωνήστε μαζί μας μέσω email.
        </p>
      </section>

      <section>
        <h2>8. Cookies και Tracking</h2>
        <p>
          <strong>MVP:</strong> Χρησιμοποιούμε μόνο strictly necessary cookies
          (session management). Δεν χρησιμοποιούμε advertising cookies ή
          third-party trackers.
        </p>
        <p>
          <strong>Μέλλον:</strong> Αν προσθέσουμε advertising, θα
          χρησιμοποιήσουμε CMP (Consent Management Platform) σύμφωνα με ePrivacy
          Directive.
        </p>
      </section>

      <section>
        <h2>9. Ασφάλεια</h2>
        <p>Εφαρμόζουμε τεχνικά και οργανωτικά μέτρα για προστασία:</p>
        <ul>
          <li>Κρυπτογράφηση passwords (bcrypt)</li>
          <li>HTTPS για όλη την επικοινωνία</li>
          <li>Rate limiting για προστασία από abuse</li>
          <li>Regular security updates</li>
        </ul>
      </section>

      <section>
        <h2>10. "Γιατί το βλέπω;" (Explainability)</h2>
        <p>
          Σε κάθε ευκαιρία που σας προτείνουμε, μπορείτε να δείτε τους λόγους
          (reasons) για τους οποίους πιθανόν να σας αφορά. Αυτό διασφαλίζει
          transparency και σας επιτρέπει να κατανοήσετε πώς λειτουργεί η
          προσωποποίηση.
        </p>
      </section>

      <section>
        <h2>11. Αλλαγές στην Πολιτική</h2>
        <p>
          Μπορούμε να ενημερώσουμε αυτή την πολιτική. Οι σημαντικές αλλαγές θα
          σας ειδοποιήσουμε μέσω email ή ειδοποίησης στην πλατφόρμα.
        </p>
      </section>

      <section>
        <h2>12. Επικοινωνία</h2>
        <p>
          Για ερωτήσεις σχετικά με την πολιτική απορρήτου ή για να ασκήσετε τα
          δικαιώματά σας, επικοινωνήστε μαζί μας μέσω email.
        </p>
      </section>

      <div class="actions">
        <router-link to="/register" class="btn btn-primary"
          >Επιστροφή στην Εγγραφή</router-link
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const lastUpdated = new Date().toLocaleDateString("el-GR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
</script>

<style scoped>
.privacy {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 2rem 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

h1 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.last-updated {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

section {
  margin-bottom: 2rem;
}

h2 {
  color: var(--accent-primary);
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

h3 {
  color: var(--text-primary);
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

p {
  line-height: 1.8;
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

ul {
  margin: 1rem 0;
  padding-left: 2rem;
}

li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

strong {
  color: var(--text-primary);
  font-weight: 600;
}

.actions {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  border-radius: 0.25rem;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
}
</style>


