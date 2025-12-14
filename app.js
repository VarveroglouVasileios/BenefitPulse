// BenefitPulse Application Logic

class BenefitPulse {
    constructor() {
        this.benefits = benefitsData;
        this.userProfile = null;
        this.lastVisitKey = 'benefitpulse_last_visit';
        this.viewCountsKey = 'benefitpulse_view_counts';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.trackViews();
    }

    setupEventListeners() {
        const form = document.getElementById('profile-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProfileSubmit();
        });
    }

    handleProfileSubmit() {
        // Get user profile from form
        this.userProfile = {
            ageRange: document.getElementById('age-range').value,
            incomeRange: document.getElementById('income-range').value,
            status: document.getElementById('status').value
        };

        // Filter benefits based on profile
        const matchedBenefits = this.filterBenefits();

        // Display results
        this.displayResults(matchedBenefits);

        // Update last visit timestamp
        this.updateLastVisit();
    }

    filterBenefits() {
        return this.benefits.filter(benefit => {
            // Check if benefit matches user's age range
            const ageMatch = benefit.ageRange.includes(this.userProfile.ageRange);
            
            // Check if benefit matches user's income range
            const incomeMatch = benefit.incomeRange.includes(this.userProfile.incomeRange);
            
            // Check if benefit matches user's status
            const statusMatch = benefit.status.includes(this.userProfile.status);

            return ageMatch && incomeMatch && statusMatch;
        });
    }

    displayResults(matchedBenefits) {
        // Show results container
        document.getElementById('results-container').style.display = 'block';

        // Categorize benefits
        const newBenefits = this.getNewBenefits(matchedBenefits);
        const expiringBenefits = this.getExpiringBenefits(matchedBenefits);
        const trendingBenefits = this.getTrendingBenefits(matchedBenefits);

        // Display each category
        this.displayBenefitList('new-benefits-list', newBenefits, 'new');
        this.displayBenefitList('expiring-benefits-list', expiringBenefits, 'expiring');
        this.displayBenefitList('trending-benefits-list', trendingBenefits, 'trending');
        this.displayBenefitList('all-benefits-list', matchedBenefits, 'all');

        // Scroll to results
        document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
    }

    getNewBenefits(benefits) {
        const lastVisit = this.getLastVisit();
        if (!lastVisit) return [];

        return benefits.filter(benefit => 
            benefit.addedDate > lastVisit
        ).sort((a, b) => b.addedDate - a.addedDate);
    }

    getExpiringBenefits(benefits) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

        return benefits.filter(benefit => 
            benefit.deadline > now && benefit.deadline <= thirtyDaysFromNow
        ).sort((a, b) => a.deadline - b.deadline);
    }

    getTrendingBenefits(benefits) {
        // Sort by views (descending) and take top 6
        return [...benefits]
            .sort((a, b) => b.views - a.views)
            .slice(0, 6);
    }

    displayBenefitList(containerId, benefits, category) {
        const container = document.getElementById(containerId);
        
        if (benefits.length === 0) {
            container.innerHTML = '<div class="empty-state">Δεν βρέθηκαν προγράμματα σε αυτή την κατηγορία.</div>';
            return;
        }

        container.innerHTML = benefits.map(benefit => 
            this.createBenefitCard(benefit, category)
        ).join('');

        // Add click tracking
        container.querySelectorAll('.benefit-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.incrementViewCount(benefits[index].id);
            });
        });
    }

    createBenefitCard(benefit, category) {
        const matchReasons = this.getMatchReasons(benefit);
        const daysUntilDeadline = this.getDaysUntilDeadline(benefit.deadline);
        const isNew = this.isNewBenefit(benefit);
        
        let badges = '';
        if (category === 'new' || isNew) {
            badges += '<span class="badge new">ΝΕΟ</span>';
        }
        if (category === 'expiring' || daysUntilDeadline <= 30) {
            badges += '<span class="badge expiring">ΛΗΓΕΙ ΣΥΝΤΟΜΑ</span>';
        }
        if (category === 'trending') {
            badges += '<span class="badge trending">ΔΗΜΟΦΙΛΕΣ</span>';
        }

        return `
            <div class="benefit-card ${category}" data-benefit-id="${benefit.id}">
                ${badges}
                <div class="benefit-title">${benefit.title}</div>
                <span class="benefit-type ${benefit.type}">${this.translateType(benefit.type)}</span>
                <div class="benefit-description">${benefit.description}</div>
                <div class="benefit-amount">💰 ${benefit.amount}</div>
                ${daysUntilDeadline !== null ? 
                    `<div class="benefit-deadline">⏰ Λήγει σε ${daysUntilDeadline} ημέρες (${this.formatDate(benefit.deadline)})</div>` 
                    : ''}
                <div class="benefit-match">
                    <strong>Γιατί το βλέπω αυτό;</strong><br>
                    ${matchReasons}
                </div>
                <a href="${benefit.source}" target="_blank" rel="noopener noreferrer" class="benefit-source">
                    📄 Επίσημη Πηγή: ${benefit.sourceName} →
                </a>
                ${category === 'trending' ? `<div class="benefit-views">👁️ ${benefit.views.toLocaleString()} προβολές</div>` : ''}
            </div>
        `;
    }

    getMatchReasons(benefit) {
        const reasons = [];
        
        if (benefit.ageRange.includes(this.userProfile.ageRange)) {
            reasons.push(`✓ Ταιριάζει στην ηλικιακή σας ομάδα (${this.translateAgeRange(this.userProfile.ageRange)})`);
        }
        
        if (benefit.incomeRange.includes(this.userProfile.incomeRange)) {
            reasons.push(`✓ Ταιριάζει στο εισοδηματικό σας επίπεδο (${this.translateIncomeRange(this.userProfile.incomeRange)})`);
        }
        
        if (benefit.status.includes(this.userProfile.status)) {
            reasons.push(`✓ Ταιριάζει στην κατάστασή σας (${this.translateStatus(this.userProfile.status)})`);
        }

        return reasons.join('<br>');
    }

    translateType(type) {
        const translations = {
            'subsidy': 'Επίδομα',
            'voucher': 'Voucher',
            'program': 'Πρόγραμμα',
            'call': 'Πρόσκληση'
        };
        return translations[type] || type;
    }

    translateAgeRange(range) {
        const translations = {
            '0-17': '0-17 έτη',
            '18-25': '18-25 έτη',
            '26-35': '26-35 έτη',
            '36-50': '36-50 έτη',
            '51-65': '51-65 έτη',
            '65+': '65+ έτη'
        };
        return translations[range] || range;
    }

    translateIncomeRange(range) {
        const translations = {
            '0-6000': '0€ - 6.000€',
            '6001-12000': '6.001€ - 12.000€',
            '12001-20000': '12.001€ - 20.000€',
            '20001-30000': '20.001€ - 30.000€',
            '30001+': '30.001€+'
        };
        return translations[range] || range;
    }

    translateStatus(status) {
        const translations = {
            'student': 'Φοιτητής/τρια',
            'employed': 'Εργαζόμενος/η',
            'unemployed': 'Άνεργος/η',
            'self-employed': 'Ελεύθερος Επαγγελματίας',
            'retired': 'Συνταξιούχος',
            'parent': 'Γονέας',
            'disabled': 'ΑΜΕΑ'
        };
        return translations[status] || status;
    }

    formatDate(date) {
        return date.toLocaleDateString('el-GR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    getDaysUntilDeadline(deadline) {
        const now = new Date();
        const diff = deadline - now;
        if (diff < 0) return null;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    isNewBenefit(benefit) {
        const lastVisit = this.getLastVisit();
        if (!lastVisit) return false;
        return benefit.addedDate > lastVisit;
    }

    getLastVisit() {
        const lastVisitStr = localStorage.getItem(this.lastVisitKey);
        return lastVisitStr ? new Date(lastVisitStr) : null;
    }

    updateLastVisit() {
        localStorage.setItem(this.lastVisitKey, new Date().toISOString());
    }

    trackViews() {
        // Initialize view counts if not exists
        if (!localStorage.getItem(this.viewCountsKey)) {
            const initialCounts = {};
            this.benefits.forEach(benefit => {
                initialCounts[benefit.id] = benefit.views;
            });
            localStorage.setItem(this.viewCountsKey, JSON.stringify(initialCounts));
        }

        // Load view counts from localStorage
        const viewCounts = JSON.parse(localStorage.getItem(this.viewCountsKey));
        this.benefits.forEach(benefit => {
            if (viewCounts[benefit.id] !== undefined) {
                benefit.views = viewCounts[benefit.id];
            }
        });
    }

    incrementViewCount(benefitId) {
        const viewCounts = JSON.parse(localStorage.getItem(this.viewCountsKey));
        if (viewCounts[benefitId]) {
            viewCounts[benefitId]++;
            localStorage.setItem(this.viewCountsKey, JSON.stringify(viewCounts));
            
            // Update the benefit object
            const benefit = this.benefits.find(b => b.id === benefitId);
            if (benefit) {
                benefit.views++;
            }
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BenefitPulse();
});
