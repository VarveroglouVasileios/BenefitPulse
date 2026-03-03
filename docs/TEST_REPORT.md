# BenefitPulse – Αναφορά Δοκιμών

**Ημερομηνία:** 3 Μαρτίου 2025  
**URL:** http://localhost:5174/  
**Viewports που ελέγχθηκαν:** Desktop (default), Mobile 375×812

---

## 1. Responsive – Εμφάνιση

### Desktop (≥1024px)
- ✅ Hero section: 2-column grid, τίτλος, chips, buttons
- ✅ Stats section: grid 3 columns
- ✅ "Πώς λειτουργεί": 3 columns
- ✅ Ευκαιρίες: grid auto-fill, cards
- ✅ NavBar: full links, search, actions
- ✅ Footer: 3 columns

### Tablet (768px–1023px)
- ✅ Hero: stack (1 column)
- ✅ FiltersBar: πάντα ορατό, horizontal layout
- ✅ Tabs: flex-wrap

### Mobile (375×812)
- ✅ NavBar: hamburger, κρυμμένο brand text (μόνο logo)
- ✅ Φίλτρα: collapsible με κουμπί "Φίλτρα"
- ✅ Tabs: μικρότερα buttons, overflow-x auto
- ✅ Opportunities grid: 1 στήλη
- ✅ Footer: 1 στήλη (≤480px)
- ✅ `overflow-x: hidden` για αποφυγή οριζόντιας κύλισης

### Τρέχουσες διορθώσεις
- `--primary-color` ορισμένο
- Safe area insets (`viewport-fit=cover`, `env(safe-area-inset-*)`)
- Breakpoints: 375, 480, 640, 768, 900, 1024px

---

## 2. Functionality – Λειτουργικότητα

### Navigation
| Στόχος | Αποτέλεσμα |
|-------|------------|
| Αρχική → Home | ✅ |
| Όλες → /opportunities | ✅ |
| Δημοφιλή → /trending | (έλεγχος) |
| Εγγραφή → /register | ✅ |
| Σύνδεση → /login | (έλεγχος) |
| Footer links (Όροι, Privacy, κτλ.) | (έλεγχος) |

### Εγγραφή (/register)
| Στόχος | Αποτέλεσμα |
|-------|------------|
| Form fields: Όνομα, Επώνυμο, Email, Κωδικός | ✅ Όλα γεμίζονται |
| Validation: password rules (8 chars, uppercase, lowercase, number) | ✅ Εμφανίζονται hints |
| Checkbox Όροι | ✅ Επιλέγεται, το κουμπί Εγγραφή ενεργοποιείται |
| Σύνδεση link | ✅ Πρόσβαση στο /login |

### Όλες οι Ευκαιρίες (/opportunities)
| Στόχος | Αποτέλεσμα |
|-------|------------|
| Tabs: Νέα, Προσεχώς, Τρέχοντα, Όλα | ✅ Ορατά |
| Φίλτρα (collapsible σε mobile) | ✅ Κουμπί "Φίλτρα", expanded |
| Type chips: Όλα, Επίδομα, Voucher, Πρόγραμμα, Προκήρυξη, ΑΣΕΠ | ✅ Ορατά |
| Αναζήτηση (search input) | ✅ Όροι αναζήτησης |
| Opportunity cards (20) | ✅ Φορτώνονται |
| Pagination: Προηγούμενο, Επόμενο | ✅ Ορατά (Προηγούμενο disabled στη σελίδα 1) |

### Κάρτες Ευκαιριών
- Ολόκληρη η κάρτα: clickable (role=button)
- Κουμπί Κοινοποίηση: ξεχωριστό, δεν οδηγεί σε navigation
- Κλικ στην κάρτα: θα πρέπει να οδηγεί στο `/opportunities/:id` (απαιτείται επιπλέον έλεγχος στο browser)

### Home (/)
- Hero: chips, buttons
- Stats: Πηγές, Ανοικτές Ευκαιρίες, Τελευταίο scan
- Sections: Νέα & Ανοικτά, Δημοφιλή
- Intersection Observer: τα sections γίνονται ορατά με scroll

---

## 3. Σημαντικά σημεία προσοχής

1. **Register form**  
   Το κουμπί Εγγραφή μένει disabled μέχρι να γίνει check το checkbox Όροι και να πληρούνται όλα τα validation rules.

2. **Screenshots**  
   Τα sections με `opacity: 0` και Intersection Observer μπορεί να φαίνονται άδεια αν το screenshot γίνει πριν το scroll. Βέλτιστο: κάνε scroll πριν το screenshot ή πρόσθεσε fallback visibility.

3. **Card navigation**  
   Οι κάρτες έχουν `@click="goToDetail"` και `router.push()`. Πρότεινεται manual έλεγχος σε πραγματικό browser.

4. **Share button**  
   Χρησιμοποιεί native `navigator.share` όταν είναι διαθέσιμο, διαφορετικά ανοίγει το ShareModal.

---

## 4. Προτεινόμενα επόμενα βήματα

- [ ] Εγκατάσταση Playwright ή Cypress για automated E2E tests
- [ ] Manual έλεγχος card click → detail page
- [ ] Manual έλεγχος login flow
- [ ] Manual έλεγχος filter chips (type selection)
- [ ] Τέστ σε πραγματική συσκευή (iOS/Android)
