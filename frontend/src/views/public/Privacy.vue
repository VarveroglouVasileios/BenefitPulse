<template>
  <div class="privacy">
    <div class="container">
      <h1>Πολιτική Απορρήτου</h1>
      <p class="last-updated">Τελευταία ενημέρωση: {{ lastUpdated }}</p>

      <section>
        <h2>1. Εισαγωγή</h2>
        <p>
          Το BenefitPulse (εφεξής "εμείς", "μας", "η εταιρεία μας") σέβεται το
          απόρρητό σας και είναι δεσμευμένο να προστατεύει τα προσωπικά σας
          δεδομένα σύμφωνα με τον
          <strong>Κανονισμό (ΕΕ) 2016/679 (GDPR)</strong> και την ελληνική
          νομοθεσία περί προστασίας προσωπικών δεδομένων.
        </p>
        <p>
          Αυτή η Πολιτική Απορρήτου εξηγεί πώς συλλέγουμε, επεξεργαζόμαστε,
          αποθηκεύουμε, προστατεύουμε και κοινοποιούμε τα προσωπικά σας
          δεδομένα.
        </p>
      </section>

      <section>
        <h2>2. Υπεύθυνος Επεξεργασίας (Data Controller)</h2>
        <p>
          <strong>Υπεύθυνος Επεξεργασίας:</strong> BenefitPulse<br />
          <strong>Email επικοινωνίας:</strong> benefitpulse@gmail.com<br />
          <strong>Διεύθυνση:</strong> Μικράς Ασίας 4 , Ελευθερούπολη Καβάλας ,
          64100
        </p>
        <p>
          Για οποιαδήποτε ερώτηση σχετικά με την επεξεργασία των προσωπικών σας
          δεδομένων ή για να ασκήσετε τα δικαιώματά σας, μπορείτε να
          επικοινωνήσετε μαζί μας στο παραπάνω email.
        </p>
      </section>

      <section>
        <h2>3. Δεδομένα που Συλλέγουμε</h2>

        <h3>3.1 Δεδομένα Λογαριασμού</h3>
        <p>Για τη δημιουργία και διαχείριση του λογαριασμού σας, συλλέγουμε:</p>
        <ul>
          <li>
            <strong>Email:</strong> Για σύνδεση, επικοινωνία και αποστολή
            ειδοποιήσεων
          </li>
          <li>
            <strong>Όνομα και Επώνυμο:</strong> Για προσωποποίηση και
            επικοινωνία
          </li>
          <li>
            <strong>Κωδικός Πρόσβασης:</strong> Κρυπτογραφημένος με bcrypt, δεν
            αποθηκεύεται σε plain text
          </li>
        </ul>

        <h3>3.2 Δεδομένα Προφίλ (Για Προσωποποίηση)</h3>
        <p>
          Για να σας προτείνουμε ευκαιρίες που πιθανόν να σας αφορούν,
          συλλέγουμε τα ακόλουθα δεδομένα σε
          <strong>μορφή ranges και flags</strong> (όχι exact values) για data
          minimization:
        </p>
        <ul>
          <li>
            <strong>Ηλικιακή ομάδα:</strong> Buckets (18-24, 25-34, 35-44,
            45-54, 55-64, 65+)
          </li>
          <li>
            <strong>Περιοχή:</strong> Επιλογή από predefined list (Αττική,
            Θεσσαλονίκη, Κρήτη, κ.λπ.)
          </li>
          <li>
            <strong>Κατάσταση Απασχόλησης:</strong> Flags
            (Unemployed/Employed/Student/Pensioner/Other)
          </li>
        </ul>
        <p>
          <strong>Σημαντικό:</strong> Δεν συλλέγουμε την
          <strong>ακριβή ηλικία</strong> σας, αλλά μόνο την
          <strong>ηλικιακή ομάδα</strong>. Η
          <strong>Κατάσταση Απασχόλησης</strong> (ειδικά το "Unemployed")
          αποτελεί <strong>ευαίσθητο δεδομένο</strong> σύμφωνα με το GDPR και
          χρησιμοποιείται για <strong>automated profiling</strong> (βλέπε
          ενότητα 4).
        </p>

        <h3>3.3 Analytics Data (First-Party)</h3>
        <p>Συλλέγουμε server-side events για analytics:</p>
        <ul>
          <li>Pageviews (path)</li>
          <li>Opportunity views</li>
          <li>Official link clicks</li>
          <li>Bookmark actions</li>
        </ul>
        <p>
          <strong>Σημείωση:</strong> Δεν χρησιμοποιούμε third-party trackers
          (Google Analytics, Facebook Pixel) στο MVP. Αν προσθέσουμε στο μέλλον,
          θα ενημερώσουμε αυτή την Πολιτική.
        </p>

        <h3>3.4 Session Data</h3>
        <p>
          Χρησιμοποιούμε session IDs για tracking επισκέψεων. Τα session IDs
          μπορούν να συνδέονται με userId αν είστε συνδεδεμένοι.
        </p>

        <h3>3.5 Contact Form Data</h3>
        <p>
          Αν χρησιμοποιήσετε τη φόρμα επικοινωνίας, συλλέγουμε: όνομα, email,
          θέμα, μήνυμα.
        </p>
      </section>

      <section>
        <h2>4. Σκοπός Επεξεργασίας και Νομική Βάση</h2>

        <h3>4.1 Προσωποποίηση (Automated Profiling)</h3>
        <p>
          <strong>Σκοπός:</strong> Χρησιμοποιούμε τα δεδομένα προφίλ σας
          (ηλικία, περιοχή, κατάσταση απασχόλησης) για
          <strong>αυτοματοποιημένο profiling</strong>
          (matching) που σας προτείνει ευκαιρίες που πιθανόν να σας αφορούν.
        </p>
        <p>
          <strong>Νομική Βάση:</strong> <strong>Άρθρο 6(1)(b) GDPR</strong> -
          Αναγκαιότητα για εκτέλεση συμβολαίου. Χωρίς αυτή την επεξεργασία, δεν
          μπορούμε να παρέχουμε την κύρια υπηρεσία (προσωποποιημένες προτάσεις).
        </p>
        <p>
          <strong>Σημαντικό:</strong> Η επεξεργασία της
          <strong>Κατάστασης Απασχόλησης</strong> (ειδικά "Unemployed") αποτελεί
          επεξεργασία <strong>ευαίσθητου δεδομένου</strong> σύμφωνα με το GDPR.
          Ωστόσο, δεν εμπίπτει στις "ειδικές κατηγορίες" του άρθρου 9 GDPR,
          καθώς δεν αποκαλύπτει άμεσα φυλετική ή εθνοτική καταγωγή, πολιτικές
          απόψεις, θρησκευτικές ή φιλοσοφικές πεποιθήσεις, συνδικαλιστική
          συμμετοχή, γενετικά ή βιομετρικά δεδομένα, δεδομένα υγείας ή
          σεξουαλική ζωή ή προσανατολισμό. Η επεξεργασία γίνεται για
          <strong>legitimate business purposes</strong> (προσφορά σχετικών
          ευκαιριών) και με <strong>data minimization</strong> (μόνο flags, όχι
          detailed employment history).
        </p>

        <h3>4.2 Analytics</h3>
        <p>
          <strong>Σκοπός:</strong> Βελτίωση της πλατφόρμας, κατανόηση της
          χρήσης, ανίχνευση τεχνικών προβλημάτων.
        </p>
        <p>
          <strong>Νομική Βάση:</strong> <strong>Άρθρο 6(1)(f) GDPR</strong> -
          Νόμιμο συμφέρον. Με data minimization και short retention (90 ημέρες).
          Μπορείτε να opt-out μέσω email ή account settings.
        </p>

        <h3>4.3 Account Management</h3>
        <p>
          <strong>Σκοπός:</strong> Δημιουργία και διαχείριση λογαριασμού,
          ασφάλεια, authentication.
        </p>
        <p>
          <strong>Νομική Βάση:</strong> <strong>Άρθρο 6(1)(b) GDPR</strong> -
          Αναγκαιότητα για εκτέλεση συμβολαίου.
        </p>

        <h3>4.4 Customer Support</h3>
        <p>
          <strong>Σκοπός:</strong> Ανταπόκριση σε αιτήματα, υποστήριξη χρηστών.
        </p>
        <p>
          <strong>Νομική Βάση:</strong> <strong>Άρθρο 6(1)(f) GDPR</strong> -
          Νόμιμο συμφέρον (customer support).
        </p>
      </section>

      <section>
        <h2>5. Κοινοποίηση Δεδομένων σε Τρίτους</h2>
        <p>
          <strong>Δεν πουλάμε</strong> τα προσωπικά σας δεδομένα σε τρίτους.
          Μπορούμε να κοινοποιήσουμε δεδομένα μόνο σε:
        </p>
        <ul>
          <li>
            <strong>Service Providers (Processors):</strong> Hosting providers
            (π.χ. Hetzner, AWS), database providers (MongoDB Atlas), queue
            providers (Redis), email service providers (SMTP). Όλοι οι
            processors έχουν υπογράψει
            <strong>Data Processing Agreements (DPAs)</strong> σύμφωνα με το
            άρθρο 28 GDPR και είναι δεσμευμένοι να προστατεύουν τα δεδομένα σας.
          </li>
          <li>
            <strong>Νομικές Υποχρεώσεις:</strong> Αν απαιτείται από νόμο,
            δικαστική απόφαση ή κυβερνητική αρχή.
          </li>
        </ul>
        <p>
          <strong>Διαβιβάσεις Εκτός ΕΟΧ:</strong> Ορισμένοι service providers
          (π.χ. MongoDB Atlas, AWS) μπορεί να βρίσκονται εκτός Ευρωπαϊκής
          Οικονομικής Ζώνης. Σε αυτές τις περιπτώσεις, χρησιμοποιούμε
          <strong>Standard Contractual Clauses (SCCs)</strong> που έχουν
          εγκριθεί από την Ευρωπαϊκή Επιτροπή για να διασφαλίσουμε την προστασία
          των δεδομένων σας.
        </p>
      </section>

      <section>
        <h2>6. Αποθήκευση και Retention</h2>
        <p>Διατηρούμε τα προσωπικά σας δεδομένα για:</p>
        <ul>
          <li>
            <strong>Account & Profile Data:</strong> Μέχρι να
            <strong>διαγράψετε</strong> τον λογαριασμό σας ή να ζητήσετε
            διαγραφή. Μετά τη διαγραφή, τα δεδομένα διαγράφονται
            <strong>εντός 30 ημερών</strong>, εκτός αν υπάρχει νομική υποχρέωση
            διατήρησης.
          </li>
          <li>
            <strong>Analytics Events:</strong> <strong>90 ημέρες</strong> από τη
            συλλογή. Μετά αυτό το διάστημα, τα δεδομένα διαγράφονται αυτόματα.
          </li>
          <li>
            <strong>Session Data:</strong> <strong>90 ημέρες</strong> αδράνειας.
            Μετά αυτό το διάστημα, τα sessions διαγράφονται.
          </li>
          <li>
            <strong>Contact Form Submissions:</strong> <strong>2 χρόνια</strong>
            (statute of limitations για legal claims).
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Δικαιώματα σας (GDPR)</h2>
        <p>Σύμφωνα με το GDPR, έχετε τα ακόλουθα δικαιώματα:</p>

        <h3>7.1 Δικαίωμα Πρόσβασης (Άρθρο 15 GDPR)</h3>
        <p>
          Έχετε το δικαίωμα να ζητήσετε αντίγραφο των προσωπικών σας δεδομένων
          που επεξεργαζόμαστε. Μπορείτε να ασκήσετε αυτό το δικαίωμα μέσω email
          ή μέσω του account settings (αν υλοποιηθεί).
        </p>

        <h3>7.2 Δικαίωμα Διόρθωσης (Άρθρο 16 GDPR)</h3>
        <p>
          Έχετε το δικαίωμα να διορθώσετε ανακριβή ή ατελή δεδομένα. Μπορείτε να
          ενημερώσετε το προφίλ σας οποιαδήποτε στιγμή μέσω του account
          settings.
        </p>

        <h3>
          7.3 Δικαίωμα Διαγραφής / "Right to be Forgotten" (Άρθρο 17 GDPR)
        </h3>
        <p>
          Έχετε το δικαίωμα να ζητήσετε τη διαγραφή των προσωπικών σας
          δεδομένων. Μπορείτε να διαγράψετε τον λογαριασμό σας μέσω του account
          settings ή να ζητήσετε διαγραφή μέσω email. Η διαγραφή θα
          πραγματοποιηθεί εντός
          <strong>30 ημερών</strong>, εκτός αν υπάρχει νομική υποχρέωση
          διατήρησης.
        </p>

        <h3>7.4 Δικαίωμα Περιορισμού Επεξεργασίας (Άρθρο 18 GDPR)</h3>
        <p>
          Έχετε το δικαίωμα να ζητήσετε περιορισμό της επεξεργασίας των
          δεδομένων σας σε ορισμένες περιπτώσεις (π.χ. αν αμφισβητείτε την
          ακρίβεια των δεδομένων).
        </p>

        <h3>7.5 Δικαίωμα Πορτατοποίησης Δεδομένων (Άρθρο 20 GDPR)</h3>
        <p>
          Έχετε το δικαίωμα να λάβετε τα προσωπικά σας δεδομένα σε structured,
          commonly used, machine-readable format (JSON) και να τα μεταφέρετε σε
          άλλον υπεύθυνο επεξεργασίας.
        </p>

        <h3>7.6 Δικαίωμα Εναντίωσης (Άρθρο 21 GDPR)</h3>
        <p>
          Έχετε το δικαίωμα να αντιταχθείτε στην επεξεργασία των δεδομένων σας
          για analytics (legitimate interest). Μπορείτε να opt-out μέσω account
          settings ή email.
        </p>

        <h3>7.7 Δικαίωμα Ανάκλησης Συγκατάθεσης</h3>
        <p>
          Αν η επεξεργασία βασίζεται σε συγκατάθεση, έχετε το δικαίωμα να
          ανακαλέσετε τη συγκατάθεσή σας οποιαδήποτε στιγμή.
        </p>

        <p>
          <strong>Χρόνος Ανταπόκρισης:</strong> Θα απαντήσουμε σε οποιοδήποτε
          αίτημα εντός <strong>1 μηνός</strong> από την υποβολή του. Αν το
          αίτημα είναι πολύπλοκο, μπορούμε να επεκτείνουμε αυτό το διάστημα κατά
          2 επιπλέον μήνες, αλλά θα σας ειδοποιήσουμε εντός του πρώτου μηνός.
        </p>
      </section>

      <section>
        <h2>8. Cookies και Tracking Technologies</h2>
        <p>
          <strong>MVP Stage:</strong> Χρησιμοποιούμε μόνο
          <strong>strictly necessary cookies</strong> (session management) που
          δεν απαιτούν consent σύμφωνα με το ePrivacy Directive.
        </p>
        <p>
          <strong>Μέλλον:</strong> Αν προσθέσουμε analytics cookies ή
          advertising cookies, θα χρησιμοποιήσουμε Consent Management Platform
          (CMP) σύμφωνα με το ePrivacy Directive και θα ενημερώσουμε αυτή την
          Πολιτική.
        </p>
        <p>
          Για περισσότερες πληροφορίες, δείτε την
          <router-link to="/cookies">Πολιτική Cookies</router-link>.
        </p>
      </section>

      <section>
        <h2>9. Ασφάλεια Δεδομένων</h2>
        <p>
          Εφαρμόζουμε <strong>τεχνικά και οργανωτικά μέτρα</strong> για την
          προστασία των προσωπικών σας δεδομένων:
        </p>
        <ul>
          <li>
            <strong>Κρυπτογράφηση:</strong> Passwords με bcrypt, HTTPS για όλη
            την επικοινωνία
          </li>
          <li>
            <strong>Access Control:</strong> Περιορισμένη πρόσβαση σε δεδομένα
            μόνο από εξουσιοδοτημένο προσωπικό
          </li>
          <li>
            <strong>Rate Limiting:</strong> Προστασία από abuse και DDoS attacks
          </li>
          <li>
            <strong>Security Headers:</strong> Helmet.js για προστασία από
            common vulnerabilities
          </li>
          <li>
            <strong>Regular Updates:</strong> Τακτικές ενημερώσεις ασφαλείας
          </li>
        </ul>
        <p>
          Παρά τα μέτρα που λαμβάνουμε, καμία μέθοδος μετάδοσης ή αποθήκευσης
          δεδομένων δεν είναι 100% ασφαλής. Δεν μπορούμε να εγγυηθούμε απόλυτη
          ασφάλεια, αλλά αναλαμβάνουμε να ενημερώνουμε τους χρήστες σε περίπτωση
          data breach σύμφωνα με το GDPR.
        </p>
      </section>

      <section>
        <h2>10. Data Breach Notification</h2>
        <p>
          Σε περίπτωση <strong>data breach</strong> που ενδέχεται να θέσει σε
          κίνδυνο τα δικαιώματα και τις ελευθερίες σας, θα:
        </p>
        <ul>
          <li>
            <strong
              >Ειδοποιήσουμε την Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα
              (ΑΠΔΠΧ)</strong
            >
            εντός <strong>72 ωρών</strong> σύμφωνα με το άρθρο 33 GDPR
          </li>
          <li>
            <strong>Ειδοποιήσουμε εσάς</strong> χωρίς αδικαιολόγητη καθυστέρηση
            αν το breach ενδέχεται να σας θέσει σε
            <strong>υψηλό κίνδυνο</strong>, σύμφωνα με το άρθρο 34 GDPR
          </li>
        </ul>
      </section>

      <section>
        <h2>11. Explainability (Διαφάνεια) - "Γιατί το βλέπω;"</h2>
        <p>
          Σε κάθε ευκαιρία που σας προτείνουμε, μπορείτε να δείτε τους
          <strong>λόγους (reasons)</strong> για τους οποίους πιθανόν να σας
          αφορά (π.χ. "Σας προτείνουμε αυτή την ευκαιρία επειδή: Ηλικία 25-34,
          Περιοχή Αττική, Κατάσταση Unemployed"). Αυτό διασφαλίζει
          <strong>transparency</strong>
          και σας επιτρέπει να κατανοήσετε πώς λειτουργεί το automated
          profiling.
        </p>
      </section>

      <section>
        <h2>12. Δικαίωμα Ενόρμησης στην ΑΠΔΠΧ</h2>
        <p>
          Αν θεωρείτε ότι η επεξεργασία των προσωπικών σας δεδομένων παραβιάζει
          το GDPR, έχετε το δικαίωμα να <strong>ενεργήσετε</strong> στην Αρχή
          Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (ΑΠΔΠΧ):
        </p>
        <p>
          <strong>Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα</strong><br />
          Κηφισίας 1-3, 115 23 Αθήνα<br />
          Email: contact@dpa.gr<br />
          Website: https://www.dpa.gr
        </p>
      </section>

      <section>
        <h2>13. Αλλαγές στην Πολιτική Απορρήτου</h2>
        <p>
          Διατηρούμε το δικαίωμα να <strong>ενημερώνουμε</strong> αυτή την
          Πολιτική Απορρήτου οποιαδήποτε στιγμή. Οι
          <strong>σημαντικές</strong> αλλαγές θα σας ειδοποιήσουμε μέσω email ή
          ειδοποίησης στην Πλατφόρμα. Η συνέχιση της χρήσης της Πλατφόρμας μετά
          από αλλαγές σημαίνει αποδοχή των νέων όρων.
        </p>
      </section>

      <section>
        <h2>14. Επικοινωνία</h2>
        <p>
          Για οποιαδήποτε ερώτηση σχετικά με την Πολιτική Απορρήτου, την
          επεξεργασία των προσωπικών σας δεδομένων ή για να ασκήσετε τα
          δικαιώματά σας, επικοινωνήστε μαζί μας:
        </p>
        <p>
          <strong>Email:</strong> benefitpulse@gmail.com<br />
          <strong>Διεύθυνση:</strong> Μικράς Ασίας 4 , Ελευθερούπολη Καβάλας ,
          64100
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

a {
  color: var(--accent-primary);
  text-decoration: underline;
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
