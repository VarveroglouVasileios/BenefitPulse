# 🇬🇷 BenefitPulse

## Overview

BenefitPulse is a Greece-focused web platform that helps citizens discover official subsidies, vouchers, programs, and public-sector calls that match their personal profile. The platform provides a simple, user-friendly interface where users can enter basic information (age range, income level, and status) and immediately see which benefits apply to them.

## Features

### 🎯 Smart Matching
- Match benefits to your profile based on:
  - Age range (0-17, 18-25, 26-35, 36-50, 51-65, 65+)
  - Income level (€0-€6,000, €6,001-€12,000, €12,001-€20,000, €20,001-€30,000, €30,001+)
  - Status (Student, Employed, Unemployed, Self-employed, Retired, Parent, Person with disability)

### 🆕 New Since Last Visit
- Automatically tracks your last visit using browser storage
- Highlights benefits that were added since you last checked
- Helps you stay up-to-date without email notifications

### ⏰ Expiring Soon
- Shows benefits that will expire within the next 30 days
- Sorted by deadline to help you prioritize applications
- Clear deadline information for each benefit

### 🔥 Trending Benefits
- Displays the most viewed benefits
- Helps you discover popular programs you might have missed
- Shows view counts for each trending benefit

### 💡 "Why I See This" Explanations
- Every benefit card includes a clear explanation of why it matches your profile
- Shows which criteria matched (age, income, status)
- Provides transparency in the matching algorithm

### 📄 Official Sources
- Every benefit links directly to the official source
- Includes the name of the government agency or organization
- Ensures users have access to verified, official information

## Technology Stack

- **HTML5** - Semantic markup and structure
- **CSS3** - Modern, responsive styling with CSS Grid and Flexbox
- **Vanilla JavaScript** - No frameworks or dependencies required
- **LocalStorage** - For tracking visits and view counts

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/VarveroglouVasileios/BenefitPulse.git
   ```

2. Navigate to the project directory:
   ```bash
   cd BenefitPulse
   ```

3. Open `index.html` in your web browser:
   ```bash
   # On macOS
   open index.html
   
   # On Linux
   xdg-open index.html
   
   # On Windows
   start index.html
   ```

Alternatively, you can serve the files using a simple HTTP server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## Usage

1. **Enter Your Profile**
   - Select your age range from the dropdown
   - Choose your income level
   - Select your current status (e.g., Student, Employed, etc.)
   - Click "Αναζήτηση Επιδομάτων" (Search Benefits)

2. **View Matched Benefits**
   - **New Benefits**: See programs added since your last visit
   - **Expiring Soon**: Find benefits with upcoming deadlines
   - **Trending**: Discover popular programs
   - **All Available**: Browse all matching benefits

3. **Understand Your Matches**
   - Each benefit card shows why it matches your profile
   - Click on the official source link to learn more or apply
   - Track popular benefits through view counts

## Project Structure

```
BenefitPulse/
├── index.html          # Main HTML page
├── styles.css          # CSS styles
├── app.js             # Application logic
├── benefits-data.js   # Sample benefits data
└── README.md          # This file
```

## Data Structure

Benefits are stored in `benefits-data.js` with the following structure:

```javascript
{
    id: 1,
    title: "Benefit Title",
    type: "subsidy|voucher|program|call",
    description: "Detailed description",
    amount: "Amount or range",
    ageRange: ["18-25", "26-35", ...],
    incomeRange: ["0-6000", "6001-12000", ...],
    status: ["employed", "unemployed", ...],
    deadline: new Date("2025-12-31"),
    source: "https://official-source.gr",
    sourceName: "Agency Name",
    addedDate: new Date("2025-12-01"),
    views: 1000
}
```

## Adding New Benefits

To add new benefits, edit `benefits-data.js` and add new objects to the `benefitsData` array following the structure above.

## Browser Compatibility

BenefitPulse works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## Privacy

- No user data is sent to any server
- All data is stored locally in the browser using LocalStorage
- No cookies, no tracking, no analytics
- No email addresses or personal information collected

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Acknowledgments

- Greek Government Agencies for providing official subsidy information
- ΟΠΕΚΑ (Social Benefits Organization)
- ΟΑΕΔ (Employment Organization)
- ΕΣΠΑ (Partnership Agreement for Development Framework)

---

**Note**: This is a demonstration platform. For actual benefit applications, always refer to the official government sources linked in each benefit card.