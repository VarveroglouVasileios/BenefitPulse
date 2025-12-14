# BenefitPulse - Feature Documentation

## Overview
BenefitPulse is a web platform that helps Greek citizens discover government benefits, subsidies, vouchers, and programs that match their personal profile.

## Core Features

### 1. User Profile Matching
The application collects three key pieces of information:
- **Age Range**: 0-17, 18-25, 26-35, 36-50, 51-65, 65+
- **Income Level**: €0-€6,000, €6,001-€12,000, €12,001-€20,000, €20,001-€30,000, €30,001+
- **Status**: Student, Employed, Unemployed, Self-employed, Retired, Parent, Person with disability

### 2. Smart Filtering
Benefits are filtered using an AND logic across all three criteria:
- Benefit must match the user's age range
- Benefit must match the user's income level
- Benefit must match the user's status

This ensures only relevant benefits are displayed.

### 3. New Since Last Visit
- Uses browser localStorage to track the last visit timestamp
- Automatically highlights benefits added since the last visit
- Sorted by date (newest first)
- Clear "NEW" badge on benefit cards

**Implementation**:
```javascript
const lastVisit = localStorage.getItem('benefitpulse_last_visit');
const newBenefits = benefits.filter(b => b.addedDate > lastVisit);
```

### 4. Expiring Soon
- Shows benefits with deadlines within the next 30 days
- Sorted by deadline (earliest first)
- Clear countdown display (e.g., "Λήγει σε 15 ημέρες")
- "EXPIRING SOON" badge for urgency

**Implementation**:
```javascript
const now = new Date();
const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
const expiring = benefits.filter(b => 
    b.deadline > now && b.deadline <= thirtyDaysFromNow
);
```

### 5. Trending Benefits
- Displays the most viewed benefits
- Sorted by view count (highest first)
- Shows view count for each benefit
- Limited to top 6 benefits
- View counts persist in localStorage

**Implementation**:
```javascript
const trending = benefits
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);
```

### 6. "Why I See This" Explanations
Each benefit card includes a clear explanation showing:
- ✓ Age range match
- ✓ Income level match
- ✓ Status match

Example:
```
Γιατί το βλέπω αυτό?
✓ Ταιριάζει στην ηλικιακή σας ομάδα (26-35 έτη)
✓ Ταιριάζει στο εισοδηματικό σας επίπεδο (6.001€ - 12.000€)
✓ Ταιριάζει στην κατάστασή σας (Άνεργος/η)
```

### 7. Official Sources
- Every benefit links to its official source
- Source name displayed (e.g., ΟΠΕΚΑ, ΟΑΕΔ, ΕΣΠΑ)
- Opens in new tab with security attributes
- Builds user trust through transparency

### 8. No Push Notifications
- No email alerts
- No push notifications
- No account registration required
- Users visit the site when they want to check for updates
- Privacy-focused approach

## Benefit Types

The platform supports four types of benefits:

1. **Επίδομα (Subsidy)** - Regular financial assistance
2. **Voucher** - One-time or periodic vouchers for specific services
3. **Πρόγραμμα (Program)** - Long-term support programs
4. **Πρόσκληση (Call)** - Open calls for applications

Each type has its own visual styling for easy identification.

## Data Structure

### Benefit Object
```javascript
{
    id: 1,
    title: "Επίδομα Στέγασης",
    type: "subsidy",
    description: "Detailed description...",
    amount: "Έως 210€/μήνα",
    ageRange: ["18-25", "26-35", "36-50", "51-65", "65+"],
    incomeRange: ["0-6000", "6001-12000"],
    status: ["employed", "unemployed", "self-employed", "retired"],
    deadline: new Date("2025-03-31"),
    source: "https://www.opeka.gr",
    sourceName: "ΟΠΕΚΑ",
    addedDate: new Date("2025-12-10"),
    views: 1250
}
```

## Sample Benefits Included

1. **Επίδομα Στέγασης** - Housing subsidy
2. **Κάρτα Σίτισης - Τουρισμού** - Food and tourism card
3. **Επίδομα Παιδιού** - Child benefit
4. **Πρόγραμμα Επιδότησης Νέων Επιχειρήσεων** - New business funding
5. **Φοιτητικό Στεγαστικό Επίδομα** - Student housing subsidy
6. **Πρόσκληση Ψηφιακός Μετασχηματισμός ΜμΕ** - Digital transformation call
7. **Επίδομα Ανεργίας** - Unemployment benefit
8. **Κάρτα Αναπηρίας** - Disability card
9. **Επίδομα Θέρμανσης** - Heating subsidy
10. **Πρόγραμμα Κατάρτισης Ανέργων** - Unemployment training program
11. **Επίδομα Γέννησης** - Birth grant
12. **Πρόσκληση Πράσινη Μετάβαση** - Green transition call

## Technical Architecture

### Frontend
- **Pure HTML5** - No templating required
- **Vanilla JavaScript** - No framework dependencies
- **Modern CSS3** - Grid, Flexbox, CSS Variables
- **Responsive Design** - Mobile-first approach

### Data Storage
- **LocalStorage** - Client-side only
  - Last visit timestamp
  - View counts for each benefit
  - No server required

### Performance
- **Fast Loading** - No external dependencies
- **Instant Filtering** - Client-side computation
- **Efficient Updates** - Only DOM updates on user action

## User Experience Features

### Visual Feedback
- Hover effects on cards
- Smooth animations
- Color-coded benefit types
- Clear badges for status (NEW, EXPIRING SOON, TRENDING)

### Accessibility
- Semantic HTML
- Clear headings hierarchy
- Readable font sizes
- High contrast colors
- Descriptive labels

### Mobile Responsive
- Stacks vertically on small screens
- Touch-friendly buttons
- Readable text on all devices
- Optimized grid layout

## Privacy & Security

✓ No user tracking
✓ No cookies
✓ No analytics
✓ No personal data collection
✓ No server communication
✓ All data stored locally
✓ No vulnerabilities (CodeQL verified)

## Future Enhancement Ideas

- Add more benefits (import from official APIs)
- Multi-language support (English, Albanian, etc.)
- Export matching benefits as PDF
- Share specific benefits via URL
- Add filters for benefit type
- Calendar view for deadlines
- Bookmark favorite benefits

## Browser Compatibility

✓ Chrome 90+
✓ Firefox 88+
✓ Safari 14+
✓ Edge 90+
✓ Opera 76+

Requires:
- JavaScript enabled
- LocalStorage support
- Modern CSS support (Grid, Flexbox)

## Credits

Official sources referenced:
- ΟΠΕΚΑ (www.opeka.gr)
- ΟΑΕΔ (www.oaed.gr)
- ΕΣΠΑ (www.espa.gr)
- Υπουργείο Εργασίας
- Υπουργείο Παιδείας
- Υπουργείο Υγείας
