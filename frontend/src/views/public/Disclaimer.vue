<template>
  <div class="disclaimer">
    <div class="container">
      <div class="disclaimer-banner">
        <h1>⚠️ Σημαντική Προειδοποίηση</h1>
      </div>

      <section class="main-disclaimer">
        <p class="bold-statement">
          Το BenefitPulse είναι <strong>αυτοματοποιημένο εργαλείο πληροφόρησης</strong>.
          <strong>Δεν είμαστε επίσημος φορέας</strong> και <strong>δεν παράγουμε</strong>
          το περιεχόμενο που παρουσιάζουμε.
        </p>
        <p class="bold-statement">
          <strong>ΠΑΝΤΑ</strong> επαληθεύστε τις πληροφορίες στην <strong>επίσημη
          πηγή</strong> (σύνδεσμοι παρέχονται) πριν από οποιαδήποτε ενέργεια ή απόφαση.
        </p>
        <p class="bold-statement">
          Χρησιμοποιείτε την πλατφόρμα <strong>με δική σας ευθύνη</strong>.
        </p>
      </section>

      <section>
        <h2>Τι Είμαστε</h2>
        <ul>
          <li>✅ <strong>Aggregator:</strong> Συλλέγουμε πληροφορίες από επίσημες πηγές</li>
          <li>✅ <strong>Indexer:</strong> Οργανώνουμε και παρουσιάζουμε πληροφορίες</li>
          <li>❌ <strong>ΔΕΝ</strong> είμαστε επίσημος φορέας</li>
          <li>❌ <strong>ΔΕΝ</strong> παράγουμε περιεχόμενο</li>
          <li>❌ <strong>ΔΕΝ</strong> εγγυόμαστε ακρίβεια ή πληρότητα</li>
          <li>❌ <strong>ΔΕΝ</strong> φέρουμε ευθύνη για αποτυχίες ή απώλειες</li>
        </ul>
      </section>

      <section>
        <h2>Τι Πρέπει να Κάνετε</h2>
        <ol>
          <li>
            <strong>Ελέγξτε</strong> πάντα την επίσημη ιστοσελίδα κάθε προγράμματος
            (σύνδεσμοι παρέχονται)
          </li>
          <li>
            <strong>Επικοινωνήστε</strong> απευθείας με τους επίσημους φορείς για
            απορίες
          </li>
          <li>
            <strong>Επιβεβαιώστε</strong> τα κριτήρια, τις προθεσμίες και τους όρους
            πριν την υποβολή αιτήσεων
          </li>
          <li>
            <strong>Μην</strong> στηριχτείτε αποκλειστικά στις πληροφορίες μας για
            σημαντικές αποφάσεις
          </li>
        </ol>
      </section>

      <section class="warning-box">
        <h2>🚨 Προειδοποίηση</h2>
        <p>
          Το BenefitPulse <strong>δεν φέρει ευθύνη</strong> για:
        </p>
        <ul>
          <li>Απώλεια ευκαιριών λόγω καθυστερημένων ή ανακριβών πληροφοριών</li>
          <li>Αποτυχίες στην υποβολή αιτήσεων</li>
          <li>Αλλαγές σε κριτήρια ή προθεσμίες από επίσημους φορείς</li>
          <li>Οικονομικές ζημίες ή άλλες συνέπειες</li>
        </ul>
      </section>

      <div class="actions">
        <router-link to="/" class="btn btn-primary">Κατανοώ - Επιστροφή στην Αρχική</router-link>
        <router-link to="/terms" class="btn btn-secondary">Διαβάστε τους Όρους Χρήσης</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// No script needed for static disclaimer
</script>

<style scoped>
.disclaimer {
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

.disclaimer-banner {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  color: white;
  padding: 2rem;
  border-radius: 0.5rem;
  margin-bottom: 2rem;
  text-align: center;
}

.disclaimer-banner h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
}

.main-disclaimer {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-primary);
  border-left: 4px solid var(--accent-primary);
  border-radius: 0.25rem;
}

.bold-statement {
  font-size: 1.1rem;
  line-height: 1.8;
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-weight: 500;
}

.bold-statement strong {
  color: var(--accent-primary);
  font-weight: 700;
}

section {
  margin-bottom: 2rem;
}

h2 {
  color: var(--accent-primary);
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

ul, ol {
  margin: 1rem 0;
  padding-left: 2rem;
}

li {
  margin-bottom: 0.75rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

strong {
  color: var(--text-primary);
  font-weight: 600;
}

.warning-box {
  padding: 1.5rem;
  background: #fef2f2;
  border: 2px solid #ef4444;
  border-radius: 0.5rem;
  margin-top: 2rem;
}

.warning-box h2 {
  color: #ef4444;
  margin-top: 0;
}

.warning-box p,
.warning-box li {
  color: #991b1b;
}

.actions {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  border-radius: 0.25rem;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
  text-align: center;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.btn-secondary:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }

  .disclaimer-banner h1 {
    font-size: 1.5rem;
  }

  .bold-statement {
    font-size: 1rem;
  }

  .actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
