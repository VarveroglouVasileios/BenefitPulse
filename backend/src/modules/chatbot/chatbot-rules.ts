/**
 * Rule-based Chatbot Knowledge Base
 * 
 * This contains all the patterns, intents, and responses for the chatbot
 * without relying on external AI services.
 */

export interface Intent {
  keywords: string[];
  patterns: RegExp[];
  response: string | ((context?: any) => string);
  category: string;
}

export interface FAQ {
  question: string;
  patterns: RegExp[];
  answer: string;
}

// Common greetings
const GREETINGS: Intent[] = [
  {
    keywords: ['γεια', 'γεια σου', 'γεια σας', 'χαιρετε', 'χαιρετισμός'],
    patterns: [
      /^(γεια|γεια σου|γεια σας|χαιρετε|χαιρετισμός)/i,
      /^(hello|hi|hey)/i,
    ],
    response: 'Γεια σας! Είμαι ο assistant του BenefitPulse. Πώς μπορώ να σας βοηθήσω σήμερα;',
    category: 'greeting',
  },
  {
    keywords: ['ευχαριστώ', 'ευχαριστω', 'thanks', 'thank you'],
    patterns: [
      /(ευχαριστώ|ευχαριστω|ευχαριστία)/i,
      /(thanks|thank you)/i,
    ],
    response: 'Παρακαλώ! Αν έχετε άλλη ερώτηση, μη διστάσετε να με ρωτήσετε.',
    category: 'gratitude',
  },
];

// FAQs about the platform
const FAQS: FAQ[] = [
  {
    question: 'Τι είναι το BenefitPulse;',
    patterns: [
      /(τι είναι|τι ειναι|what is).*benefitpulse/i,
      /(εξήγησε|εξηγησε|explain).*benefitpulse/i,
      /(πλατφόρμα|πλατφορμα|platform)/i,
    ],
    answer: 'Το BenefitPulse είναι μια πλατφόρμα aggregator που συγκεντρώνει και παρουσιάζει επίσημες ανακοινώσεις για επιδόματα, vouchers, προγράμματα και προκηρύξεις στην Ελλάδα. Δεν είμαστε επίσημος φορέας, αλλά συλλέγουμε πληροφορίες από επίσημες πηγές όπως το gov.gr, vouchers.gov.gr, ΔΥΠΑ και ΟΠΕΚΑ.',
  },
  {
    question: 'Πώς λειτουργεί;',
    patterns: [
      /(πώς|πως|how).*λειτουργεί|λειτουργει/i,
      /(πώς|πως|how).*δουλεύει|δουλευει/i,
      /(λειτουργία|λειτουργια|functionality)/i,
    ],
    answer: 'Το BenefitPulse λειτουργεί ως εξής:\n\n1. Δημιουργείτε ένα απλό προφίλ με βασικές πληροφορίες (ηλικιακή ομάδα, εισοδηματική κατηγορία, περιοχή, κατάσταση) σε μορφή κατηγοριών.\n\n2. Εμείς σαρώνουμε επίσημες πηγές (gov.gr, vouchers.gov.gr, ΔΥΠΑ, ΟΠΕΚΑ) κάθε 30 λεπτά για νέα επιδόματα, προγράμματα και vouchers.\n\n3. Σας δείχνουμε ευκαιρίες που πιθανόν να σας αφορούν βάσει του προφίλ σας. Προσοχή: Δεν εγγυόμαστε επιλεξιμότητα - πάντα ελέγχετε τα επίσημα κριτήρια.',
  },
  {
    question: 'Είναι επίσημη υπηρεσία;',
    patterns: [
      /(είναι|ειναι|is).*επίσημη|επισημη|επίσημος|επισημος/i,
      /(official|government)/i,
    ],
    answer: 'Όχι, το BenefitPulse δεν είναι επίσημος φορέας και δεν συσχετίζεται με καμία κυβερνητική υπηρεσία. Είμαστε aggregator που συλλέγει πληροφορίες από επίσημες πηγές για τη διευκόλυνση των χρηστών. Πάντα σας οδηγούμε στις επίσημες σελίδες για αιτήσεις και πληροφορίες.',
  },
  {
    question: 'Πώς υπολογίζεται το "Για σένα";',
    patterns: [
      /(πώς|πως|how).*(υπολογίζεται|υπολογιζεται|calculat)/i,
      /(για σένα|για σενα|for you)/i,
      /(matching|αντιστοίχιση|αντιστοιχιση)/i,
    ],
    answer: 'Το "Για σένα" υπολογίζεται με κανόνες και βασικό matching:\n\n• Συγκρίνουμε το προφίλ σας (ηλικία, εισόδημα, περιοχή, κατάσταση) με τα κριτήρια κάθε προγράμματος\n• Χρησιμοποιούμε ranges και flags, όχι exact values\n• Δεν εγγυόμαστε επιλεξιμότητα - αλλά σας βοηθάμε να βρείτε γρήγορα τις πιο σχετικές ευκαιρίες\n\nΠάντα ελέγχετε τα επίσημα κριτήρια στην επίσημη σελίδα κάθε προγράμματος.',
  },
  {
    question: 'Τι δεδομένα κρατάτε;',
    patterns: [
      /(τι|what).*(δεδομένα|δεδομενα|data)/i,
      /(privacy|απορρήτου|απορρητου)/i,
      /(πληροφορίες|πληροφοριες|information).*(κρατάτε|κρατατε)/i,
    ],
    answer: 'Κρατάμε μόνο ranges και κατηγορίες:\n\n• Ηλικιακή ομάδα (buckets: 18-24, 25-34, κ.λπ.)\n• Εισοδηματική κατηγορία (buckets: <10k, 10-20k, κ.λπ.)\n• Κατάσταση (flags: student, unemployed, employee, κ.λπ.)\n• Περιοχή (επιλογή από predefined list)\n• Email για login (κρυπτογραφημένο)\n\nΔεν αποθηκεύουμε: exact ηλικία, exact εισόδημα, ή ευαίσθητα προσωπικά δεδομένα. Δεν πουλάμε δεδομένα σε τρίτους.',
  },
  {
    question: 'Είναι δωρεάν;',
    patterns: [
      /(είναι|ειναι|is).*(δωρεάν|δωρεαν|free)/i,
      /(κόστος|κοστος|cost|price)/i,
    ],
    answer: 'Ναι, το BenefitPulse είναι εντελώς δωρεάν. Δεν χρεώνουμε για τίποτα και δεν πουλάμε δεδομένα. Η πλατφόρμα είναι διαθέσιμη για όλους χωρίς κόστος.',
  },
  {
    question: 'Πόσο συχνά ενημερώνετε;',
    patterns: [
      /(πόσο|ποσο|how often).*(συχνά|συχνα|frequently)/i,
      /(ενημερώσεις|ενημερωσεις|updates)/i,
      /(scan|σάρωση|σαρωση)/i,
    ],
    answer: 'Σαρώνουμε τις επίσημες πηγές κάθε 30 λεπτά για νέα δεδομένα. Οι ευκαιρίες ενημερώνονται αυτόματα όταν βρίσκουμε νέα ανακοινώσεις ή αλλαγές στις υπάρχουσες.',
  },
  {
    question: 'Ποια είναι οι πηγές;',
    patterns: [
      /(ποιες|ποιες|what).*(είναι|ειναι|are).*(πηγές|πηγες|sources)/i,
      /(sources|πηγές|πηγες)/i,
      /(gov\.gr|vouchers|δυπα|οπεκα)/i,
    ],
    answer: 'Οι επίσημες πηγές που παρακολουθούμε είναι:\n\n• gov.gr - Γενικές πληροφορίες και ηλεκτρονικές υπηρεσίες\n• vouchers.gov.gr - Προγράμματα vouchers\n• ΔΥΠΑ (Δημόσια Υπηρεσία Απασχόλησης) - Επιδόματα και προγράμματα\n• ΟΠΕΚΑ (Οργανισμός Παροχής Επιδομάτων Καταβολής) - Κοινωνικά επιδόματα\n\nΠάντα σας οδηγούμε στην επίσημη σελίδα κάθε προγράμματος για πλήρη πληροφόρηση και αιτήσεις.',
  },
  {
    question: 'Γιατί βλέπω κάτι άσχετο;',
    patterns: [
      /(γιατί|γιατι|why).*(βλέπω|βλεπω|see).*(άσχετο|ασχετο|irrelevant)/i,
      /(λάθος|λαθος|wrong|incorrect)/i,
      /(δεν.*αφορά|δεν.*αφορα|not relevant)/i,
    ],
    answer: 'Το matching δεν είναι τέλειο - χρησιμοποιούμε βασικούς κανόνες και keywords. Αν βρίσκετε κάτι που δεν σας αφορά:\n\n• Ελέγξτε τα επίσημα κριτήρια στην επίσημη σελίδα\n• Μπορείτε να το αναφέρετε μέσω της φόρμας επικοινωνίας\n• Συνεχίζουμε να βελτιώνουμε τους αλγόριθμους matching\n\nΠάντα εσείς είστε υπεύθυνοι να επιβεβαιώσετε την επιλεξιμότητά σας.',
  },
  {
    question: 'Πώς δημιουργώ προφίλ;',
    patterns: [
      /(πώς|πως|how).*(δημιουργώ|δημιουργω|create).*(προφίλ|προφιλ|profile)/i,
      /(εγγραφή|εγγραφη|register|signup)/i,
    ],
    answer: 'Για να δημιουργήσετε προφίλ:\n\n1. Κάντε εγγραφή με email και password\n2. Συμπληρώστε το wizard προφίλ με βασικές πληροφορίες:\n   • Ηλικιακή ομάδα\n   • Εισοδηματική κατηγορία\n   • Περιοχή\n   • Κατάσταση (φοιτητής, ανέργος, εργαζόμενος, κ.λπ.)\n\nΜετά θα αρχίσετε να βλέπετε προσωποποιημένες προτάσεις στην ενότητα "Για σένα".',
  },
];

// Help intent
const HELP_INTENT: Intent = {
  keywords: ['βοήθεια', 'βοηθεια', 'help', 'οδηγίες', 'οδηγιες'],
  patterns: [
    /(βοήθεια|βοηθεια|help)/i,
    /(οδηγίες|οδηγιες|instructions)/i,
    /(τι.*μπορώ|τι.*μπορω|what.*can)/i,
  ],
  response: `Μπορώ να σας βοηθήσω με:

• Ερωτήσεις σχετικά με το BenefitPulse
• Πώς λειτουργεί η πλατφόρμα
• Πληροφορίες για προγράμματα και επιδόματα
• Οδηγίες χρήσης
• Συχνές ερωτήσεις (FAQ)

Ρωτήστε με οτιδήποτε θέλετε να μάθετε!`,
  category: 'help',
};

// Unknown/fallback intent
const UNKNOWN_RESPONSES = [
  'Δεν είμαι σίγουρος για αυτή την ερώτηση. Μπορείτε να δοκιμάσετε να την διατυπώσετε διαφορετικά;',
  'Συγγνώμη, δεν καταλαβαίνω αυτή την ερώτηση. Μπορώ να σας βοηθήσω με ερωτήσεις σχετικά με το BenefitPulse, πώς λειτουργεί, ή τα προγράμματα.',
  'Δεν έχω απάντηση για αυτό. Για πιο συγκεκριμένες ερωτήσεις, παρακαλώ χρησιμοποιήστε τη φόρμα επικοινωνίας από το footer.',
];

/**
 * Find matching intent based on user message
 */
export function findIntent(message: string): Intent | null {
  const lowerMessage = message.toLowerCase().trim();

  // Check greetings first
  for (const greeting of GREETINGS) {
    for (const pattern of greeting.patterns) {
      if (pattern.test(message)) {
        return greeting;
      }
    }
  }

  // Check help
  for (const pattern of HELP_INTENT.patterns) {
    if (pattern.test(message)) {
      return HELP_INTENT;
    }
  }

  // Check FAQs
  for (const faq of FAQS) {
    for (const pattern of faq.patterns) {
      if (pattern.test(message)) {
        return {
          keywords: [],
          patterns: [],
          response: faq.answer,
          category: 'faq',
        };
      }
    }
  }

  return null;
}

/**
 * Get response for user message
 */
export function getResponse(message: string, context?: any): string {
  const intent = findIntent(message);

  if (intent) {
    if (typeof intent.response === 'function') {
      return intent.response(context);
    }
    return intent.response;
  }

  // Fallback to random unknown response
  return UNKNOWN_RESPONSES[Math.floor(Math.random() * UNKNOWN_RESPONSES.length)];
}

/**
 * Get all available FAQs for help
 */
export function getAllFAQs(): FAQ[] {
  return FAQS;
}



