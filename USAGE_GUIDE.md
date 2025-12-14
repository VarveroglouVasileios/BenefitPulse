# BenefitPulse - Quick Usage Guide

## Getting Started

### Step 1: Open the Application
1. Open `index.html` in your web browser
2. Or serve it with a local server:
   ```bash
   python3 -m http.server 8000
   # Visit http://localhost:8000
   ```

### Step 2: Enter Your Profile
Fill in the profile form with your information:

**Age Range**
- Select your age group from the dropdown
- Options: 0-17, 18-25, 26-35, 36-50, 51-65, 65+

**Income Level**
- Choose your annual income range
- Options: €0-€6K, €6K-€12K, €12K-€20K, €20K-€30K, €30K+

**Status**
- Select your current status
- Options: Student, Employed, Unemployed, Self-employed, Retired, Parent, Person with disability

### Step 3: Search Benefits
Click the blue "Αναζήτηση Επιδομάτων" (Search Benefits) button.

### Step 4: View Results
The page will display four sections:

#### 🆕 New Since Last Visit
- Shows benefits added after your last visit
- Empty on first visit
- Automatically populated on subsequent visits

#### ⏰ Expiring Soon
- Benefits with deadlines in the next 30 days
- Sorted by deadline (earliest first)
- Shows days remaining

#### 🔥 Trending
- Top 6 most viewed benefits
- Shows view counts
- Updated based on user interactions

#### 📋 All Available Programs
- All benefits matching your profile
- Sorted by relevance
- Complete list of what you qualify for

### Step 5: Understand Your Matches
Each benefit card shows:
- **Title** - Name of the benefit
- **Type Badge** - Subsidy, Voucher, Program, or Call
- **Description** - What the benefit provides
- **Amount** - Financial value or range
- **Deadline** - When applications close
- **Match Explanation** - Why you see this benefit
- **Official Source** - Link to government website

### Step 6: Take Action
1. Read the full benefit details
2. Check the "Why I See This" section to confirm eligibility
3. Click the official source link to apply
4. Visit official websites to submit applications

## Example Scenarios

### Scenario 1: Unemployed Person (26-35, Low Income)
```
Profile:
- Age: 26-35
- Income: €6,001-€12,000
- Status: Unemployed

Will See:
- Επίδομα Ανεργίας (Unemployment Benefit)
- Πρόγραμμα Κατάρτισης Ανέργων (Training Program)
- Κάρτα Σίτισης - Τουρισμού (Food & Tourism Card)
- Επίδομα Στέγασης (Housing Subsidy)
```

### Scenario 2: Student (18-25, Low Income)
```
Profile:
- Age: 18-25
- Income: €0-€6,000
- Status: Student

Will See:
- Φοιτητικό Στεγαστικό Επίδομα (Student Housing)
- Κάρτα Σίτισης - Τουρισμού (Food & Tourism Card)
- Various other student-eligible benefits
```

### Scenario 3: Parent (26-35, Medium Income)
```
Profile:
- Age: 26-35
- Income: €12,001-€20,000
- Status: Parent

Will See:
- Επίδομα Παιδιού (Child Benefit)
- Επίδομα Γέννησης (Birth Grant)
- Κάρτα Σίτισης - Τουρισμού (Food & Tourism Card)
```

## Tips for Best Results

### Accuracy
- Be honest with your profile information
- Select the options that best match your situation
- Update your profile if your situation changes

### Deadlines
- Check the "Expiring Soon" section first
- Apply early to avoid missing deadlines
- Note that deadlines are approximate

### Research
- Always click through to official sources
- Read full eligibility criteria on official websites
- Confirm current availability before applying

### Regular Checks
- Visit the site regularly to see new benefits
- The "New Since Last Visit" feature helps track updates
- No need to create an account

## Understanding Badges

### 🆕 NEW
- Benefit added after your last visit
- Recently announced program
- Check these first for new opportunities

### ⏰ EXPIRING SOON
- Deadline within 30 days
- Apply urgently
- Don't miss out

### 🔥 TRENDING
- Popular among users
- High view count
- May indicate high demand

## Troubleshooting

### No Results?
- Check your profile selections
- Some combinations may have limited matches
- Try broadening your search criteria

### "New Since Last Visit" Empty?
- Normal on first visit
- Will populate after you visit again
- Based on browser localStorage

### Benefits Not Loading?
- Ensure JavaScript is enabled
- Try refreshing the page
- Check browser console for errors

### Links Not Working?
- Ensure internet connection
- Official sites may be temporarily down
- Try again later

## Privacy Notes

✓ No registration required
✓ No personal data sent anywhere
✓ All data stays in your browser
✓ Clear browser data to reset

## Need Help?

For technical issues:
- Check browser compatibility
- Enable JavaScript
- Clear browser cache
- Try a different browser

For benefit information:
- Visit official source links
- Contact the relevant agency
- Check eligibility criteria

## Official Sources

- **ΟΠΕΚΑ** - www.opeka.gr (Social Benefits)
- **ΟΑΕΔ** - www.oaed.gr (Employment)
- **ΕΣΠΑ** - www.espa.gr (EU Funding)
- **Υπ. Εργασίας** - Ministry of Labor
- **Υπ. Παιδείας** - Ministry of Education
- **Υπ. Υγείας** - Ministry of Health

---

**Remember**: BenefitPulse helps you discover benefits, but always apply through official government channels.
