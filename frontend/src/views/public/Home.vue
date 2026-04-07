<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero" ref="heroRef">
      <div class="hero-content">
        <h1 class="hero-title">
          Βρες τι είναι ανοικτό τώρα — επιδόματα & προγράμματα από επίσημες πηγές.
        </h1>
        <p class="hero-subtitle">
          Δίνεις λίγες βασικές κατηγορίες και βλέπεις τι είναι ανοικτό και πιθανόν να σε αφορά.
        </p>
        <div class="actions">
          <router-link to="/opportunities?status=open" class="btn btn-secondary">
            Δες τι είναι ανοικτό τώρα
          </router-link>
          <router-link to="/profile/wizard" class="btn btn-primary">
            Φτιάξε προφίλ
          </router-link>
        </div>
        <div class="hero-chips">
          <button
            v-for="chip in chips"
            :key="chip.label"
            class="chip"
            @click="goToTag(chip.query)"
          >
            {{ chip.label }}<span v-if="chip.count > 0" class="chip-count"> ({{ chip.count }})</span>
          </button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="glow-circle"></div>
        <div class="card card-1">Επίδομα ενοικίου</div>
        <div class="card card-2">Youth Pass</div>
        <div class="card card-3">Πρόγραμμα κατάρτισης</div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats-section" ref="statsRef">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value" v-if="!statsLoaded">—</div>
          <div class="stat-value" v-else>{{ stats.sources }}</div>
          <div class="stat-label">Ενεργές πηγές</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" v-if="!statsLoaded">—</div>
          <div class="stat-value" v-else>{{ stats.openCount }}</div>
          <div class="stat-label">Ανοικτές τώρα</div>
          <p v-if="statsLoaded && stats.opportunities > 0" class="stat-total-caption">
            {{ stats.opportunities }} συνολικά στη βάση (επιδόματα, προγράμματα, vouchers)
          </p>
        </div>
        <div class="stat-item">
          <div class="live-badge" v-if="lastScanLabel">🟢 {{ lastScanLabel }}</div>
          <div class="live-badge" v-else>—</div>
          <div class="stat-label">Τελευταίο scan</div>
        </div>
      </div>
      <p
        v-if="statsLoaded && stats.opportunities === 0 && stats.openCount === 0"
        class="sync-note"
      >
        Γίνεται συγχρονισμός… δες όλες τις καταχωρίσεις ενώ ενημερώνουμε τα νέα.
      </p>
    </section>

    <!-- How it works -->
    <section class="how-it-works" ref="howItWorksRef">
      <h2>Πώς λειτουργεί</h2>
      <p class="info-caption">Δεν εγγυόμαστε επιλεξιμότητα — ελέγχεις πάντα τα επίσημα κριτήρια</p>
      <div class="steps">
        <div class="step">
          <div class="step-icon">👤</div>
          <span class="step-number">1</span>
          <h3>Φτιάχνεις ένα απλό προφίλ</h3>
          <p>
            Μοιράζεσαι μόνο βασικές πληροφορίες (ηλικία, περιοχή, ιδιότητα) σε
            μορφή κατηγοριών – όχι ακριβή προσωπικά δεδομένα.
          </p>
        </div>
        <div class="step">
          <div class="step-icon">🔍</div>
          <span class="step-number">2</span>
          <h3>Σαρώνουμε επίσημες πηγές</h3>
          <p>
            Παρακολουθούμε gov.gr, vouchers.gov.gr, ΔΥΠΑ, ΟΠΕΚΑ και άλλες
            πηγές για νέα επιδόματα, προγράμματα και vouchers.
          </p>
        </div>
        <div class="step">
          <div class="step-icon">🎯</div>
          <span class="step-number">3</span>
          <h3>Σου δείχνουμε τι πιθανόν σε αφορά</h3>
          <p>
            Δεν εγγυόμαστε επιλεξιμότητα – αλλά σε βοηθάμε να βρεις γρήγορα τις
            πιο σχετικές ευκαιρίες για σένα.
          </p>
        </div>
      </div>
      <div class="mini-cta">
        <p>Έτοιμος; Φτιάξε προφίλ σε 30″</p>
        <router-link to="/profile/wizard" class="btn btn-primary small">
          Ξεκίνα τώρα
        </router-link>
      </div>
    </section>

    <!-- Featured Opportunities Sections -->
    <!-- Νέα & Ανοικτά -->
    <section class="featured-section" ref="newOpenRef">
      <div class="section-header">
        <h2>🆕 Νέα & Ανοικτά τώρα</h2>
        <router-link to="/opportunities?status=open" class="link">
          Δες όλα &rarr;
        </router-link>
      </div>
      <div v-if="loadingNew" class="opportunities-grid skeleton-featured-grid">
        <SkeletonOpportunityCard v-for="n in 6" :key="'new-' + n" />
      </div>
      <div v-else-if="newOpen.length === 0" class="fallback-list">
        <h4>Top κατηγορίες</h4>
        <ul>
          <li v-for="cat in fallbackCategories" :key="cat.label">
            <button class="link-btn" @click="goToTag(cat.query)">{{ cat.label }}</button>
          </li>
        </ul>
      </div>
      <div v-else class="opportunities-grid">
        <OpportunityCard
          v-for="opp in newOpen.slice(0, 6)"
          :key="opp._id"
          :opportunity="opp"
        />
      </div>
    </section>

    <!-- Δημοφιλή -->
    <section class="featured-section" ref="trendingRef">
      <div class="section-header">
        <h2>⭐ Δημοφιλή</h2>
        <router-link to="/trending" class="link">
          Δες όλα &rarr;
        </router-link>
      </div>
      <div v-if="loadingTrending" class="opportunities-grid skeleton-featured-grid">
        <SkeletonOpportunityCard v-for="n in 6" :key="'tr-' + n" />
      </div>
      <div v-else-if="trending.length === 0" class="fallback-list">
        <h4>Πιο πρόσφατα ενημερωμένα</h4>
        <ul>
          <li><button class="link-btn" @click="goToQuery('')">Δες όλα τα πιο πρόσφατα</button></li>
          <li><button class="link-btn" @click="goToQuery('deadline')">Με ενεργό deadline</button></li>
          <li><button class="link-btn" @click="goToQuery('vouchers.gov.gr')">Από vouchers.gov.gr</button></li>
        </ul>
      </div>
      <div v-else class="opportunities-grid">
        <OpportunityCard
          v-for="opp in trending.slice(0, 6)"
          :key="opp._id"
          :opportunity="opp"
        />
      </div>
    </section>

    <!-- Για σένα (μόνο αν είναι logged in) -->
    <section v-if="isAuthenticated" class="featured-section" ref="forYouRef">
      <div class="section-header">
        <h2>🎯 Για σένα</h2>
        <router-link to="/for-you" class="link">
          Δες όλα &rarr;
        </router-link>
      </div>
      <div v-if="loadingForYou" class="opportunities-grid skeleton-featured-grid">
        <SkeletonOpportunityCard v-for="n in 4" :key="'fy-' + n" />
      </div>
      <div v-else-if="forYou.length === 0" class="empty-state">
        <p>Δημιούργησε προφίλ για να δεις προσωποποιημένες ευκαιρίες.</p>
        <router-link to="/profile/wizard" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">
          Δημιούργησε προφίλ
        </router-link>
      </div>
      <div v-else class="opportunities-grid">
        <OpportunityCard
          v-for="opp in forYou.slice(0, 6)"
          :key="opp._id"
          :opportunity="opp"
        />
      </div>
    </section>

    <!-- Why Trust Us -->
    <section class="safety" ref="trustRef">
      <h2>Γιατί να μας εμπιστευτείς</h2>
      <div class="safety-grid">
        <div class="safety-card">
          <h3>🔒 Privacy-by-design</h3>
          <p>
            Χρησιμοποιούμε μόνο προσεγγιστικά ranges (ηλικία, εισόδημα, περιοχή)
            και όχι ακριβή στοιχεία. Δεν αποθηκεύουμε ευαίσθητα δεδομένα.
          </p>
        </div>
        <div class="safety-card">
          <h3>🔗 Επίσημες πηγές μόνο</h3>
          <p>
            Links μόνο σε επίσημες σελίδες. Σε οδηγούμε πάντα σε gov.gr, vouchers.gov.gr, ΔΥΠΑ, ΟΠΕΚΑ για αναλυτικές πληροφορίες και αιτήσεις.
          </p>
        </div>
        <div class="safety-card">
          <h3>📊 Διαφάνεια</h3>
          <p>
            Δείχνουμε source & ημερομηνία ενημέρωσης. Χωρίς ειδοποιήσεις / spam. Μπαίνεις όταν θες και βλέπεις τι υπάρχει.
          </p>
        </div>
      </div>
      <div class="dont-do">
        <p class="dont-do-title">What we don’t do</p>
        <ul>
          <li>✅ Δεν κρατάμε διεύθυνση / ΑΦΜ / τραπεζικά</li>
          <li>✅ Δεν στέλνουμε spam</li>
          <li>✅ Μόνο επίσημα links</li>
        </ul>
      </div>
      <p class="disclaimer">
        Το BenefitPulse δεν είναι επίσημος φορέας και δεν μπορεί να εγγυηθεί
        την επιλεξιμότητά σας. Εσείς είστε υπεύθυνοι να ελέγξετε τα επίσημα
        κριτήρια και όρους κάθε προγράμματος.
      </p>
    </section>

    <!-- Examples -->
    <section class="examples" ref="examplesRef">
      <h2>Παραδείγματα</h2>
      <p class="examples-disclaimer">Ενδεικτικά — τα επίσημα κριτήρια υπερισχύουν</p>
      <div class="examples-grid">
        <div class="example-card" v-for="example in examples" :key="example.title">
          <h3>{{ example.title }}</h3>
          <p class="example-meta">{{ example.meta }}</p>
          <ul>
            <li v-for="item in example.requirements" :key="item">
              <router-link :to="example.link" class="requirement-link">{{ item }}</router-link>
            </li>
          </ul>
          <router-link :to="example.link" class="btn btn-secondary small">Δες επίσημα</router-link>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq" ref="faqRef">
      <h2>Συχνές Ερωτήσεις</h2>
      <div class="faq-grid">
        <div class="faq-item">
          <h3>Είναι επίσημη υπηρεσία;</h3>
          <p><strong>Όχι.</strong> Είμαστε aggregator. Δείχνουμε info από gov.gr, vouchers.gov.gr, ΔΥΠΑ, ΟΠΕΚΑ και σε στέλνουμε πάντα στην επίσημη σελίδα.</p>
        </div>
        <div class="faq-item">
          <h3>Πώς υπολογίζεται το "Για σένα";</h3>
          <p><strong>Κανόνες + basic matching.</strong> Συγκρίνουμε το προφίλ σου με τα κριτήρια κάθε προγράμματος. Δεν εγγυόμαστε επιλεξιμότητα.</p>
        </div>
        <div class="faq-item">
          <h3>Τι δεδομένα κρατάτε;</h3>
          <p><strong>Μόνο κατηγορίες.</strong> Ηλικιακή ομάδα, εισοδηματική κατηγορία, περιοχή, κατάσταση. Όχι διεύθυνση/ΑΦΜ/τραπεζικά.</p>
        </div>
        <div class="faq-item">
          <h3>Γιατί βλέπω κάτι άσχετο;</h3>
          <p><strong>Το matching είναι ενδεικτικό.</strong> Αν δεις κάτι άσχετο, αναφέρ’ το ή αγνόησέ το. Ελέγχεις πάντα τα επίσημα κριτήρια.</p>
        </div>
        <div class="faq-item">
          <h3>Πώς ξέρω ότι είναι ανοικτό;</h3>
          <p>Βλέπεις <strong>deadline</strong> και <strong>applicationStatus</strong>. Αν λείπουν, ελέγχεις στο επίσημο link.</p>
        </div>
        <div class="faq-item">
          <h3>Από πού φαίνεται η ημερομηνία/λήξη;</h3>
          <p>Στην κάρτα γράφουμε <strong>deadline</strong> αν υπάρχει. Για σιγουριά, δες την ημερομηνία στην επίσημη σελίδα.</p>
        </div>
        <div class="faq-item">
          <h3>Είναι δωρεάν;</h3>
          <p><strong>Ναι.</strong> Καμία χρέωση, κανένα τρίτο tracking.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import { api } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth.store";
import OpportunityCard from "../../components/OpportunityCard.vue";
import SkeletonOpportunityCard from "../../components/SkeletonOpportunityCard.vue";

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);
const router = useRouter();

const newOpen = ref<any[]>([]);
const trending = ref<any[]>([]);
const forYou = ref<any[]>([]);
const loadingNew = ref(true);
const loadingTrending = ref(true);
const loadingForYou = ref(true);

const statsLoaded = ref(false);

const stats = ref({
  sources: 0,
  opportunities: 0,
  openCount: 0,
  lastScan: "πριν λίγα λεπτά",
});

const lastScanAt = ref<Date | null>(new Date());
const lastScanLabel = computed(() => {
  if (!lastScanAt.value) return "";
  const diffMs = Date.now() - lastScanAt.value.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMinutes <= 1) return "ενημερώθηκε μόλις τώρα";
  if (diffMinutes < 60) return `ενημερώθηκε πριν ${diffMinutes} λεπτά`;
  if (diffHours < 24) return `ενημερώθηκε πριν ${diffHours} ${diffHours === 1 ? "ώρα" : "ώρες"}`;
  if (diffDays <= 31) return `ενημερώθηκε πριν ${diffDays} ${diffDays === 1 ? "ημέρα" : "ημέρες"}`;
  return "ενημερώθηκε πρόσφατα";
});

const chips = ref([
  { label: "Νέοι", query: "youth", count: 0 },
  { label: "Οικογένεια", query: "family", count: 0 },
  { label: "Ανεργία", query: "unemployment", count: 0 },
  { label: "Στέγαση", query: "housing", count: 0 },
  { label: "ΑμεΑ", query: "disability", count: 0 },
]);

const fallbackCategories = [
  { label: "Επιδόματα στέγασης", query: "housing" },
  { label: "Προγράμματα ανέργων", query: "unemployment" },
  { label: "Νέοι / Youth Pass", query: "youth" },
  { label: "Οικογένεια & γονείς", query: "family" },
  { label: "ΑμεΑ / υποστήριξη", query: "disability" },
];

const examples = [
  {
    title: "Επίδομα στέγασης",
    meta: "Συνήθως: εισόδημα + μίσθωση + ΑΦΜ",
    requirements: ["Απόδειξη μίσθωσης", "Κριτήρια εισοδήματος", "Επίσημη αίτηση"],
    link: "/opportunities?query=στέγαση",
  },
  {
    title: "Youth Pass",
    meta: "Συνήθως: ηλικία 18-19 + ελληνικός ΑΦΜ",
    requirements: ["Ηλικιακό κριτήριο", "Ελληνικός ΑΦΜ", "Ψηφιακή κάρτα"],
    link: "/opportunities?query=youth%20pass",
  },
  {
    title: "Πρόγραμμα κατάρτισης",
    meta: "Συνήθως: άνεργοι / εργαζόμενοι με voucher",
    requirements: ["Εγγραφή σε πάροχο", "Ώρες κατάρτισης", "Voucher συμμετοχής"],
    link: "/opportunities?query=κατάρτιση",
  },
];

// Refs for scroll animations
const heroRef = ref<HTMLElement>();
const statsRef = ref<HTMLElement>();
const howItWorksRef = ref<HTMLElement>();
const newOpenRef = ref<HTMLElement>();
const trendingRef = ref<HTMLElement>();
const forYouRef = ref<HTMLElement>();
const trustRef = ref<HTMLElement>();
const faqRef = ref<HTMLElement>();
const examplesRef = ref<HTMLElement>();


let scrollSectionObserver: IntersectionObserver | null = null;

/** Attach observer for stat counter animation; sections stay visible without waiting for this. */
function setupScrollAnimations() {
  scrollSectionObserver?.disconnect();
  scrollSectionObserver = null;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");

      });
    },
    { threshold: 0.05, rootMargin: "0px 0px 80px 0px" },
  );
  scrollSectionObserver = observer;

  const refs = [statsRef, howItWorksRef, newOpenRef, trendingRef, forYouRef, trustRef, faqRef, examplesRef];
  refs.forEach((r) => {
    if (r?.value) observer.observe(r.value);
  });
}

function goToTag(query: string) {
  router.push({ path: "/opportunities", query: { tag: query } });
}

async function fetchChipCounts() {
  // Fetch counts for all chips in parallel to save time
  await Promise.all(chips.value.map(async (chip) => {
    try {
      const response = await api.opportunities.list({
        limit: 1,
        tag: chip.query,
      });
      chip.count = response.data.total || 0;
    } catch (error) {
      // Ignore errors
    }
  }));
}

function goToQuery(q: string) {
  router.push({ path: "/opportunities", query: { query: q } });
}

async function fetchNewOpen() {
  try {
    // Use feed endpoint with "current" tab to get truly open opportunities
    const response = await api.opportunities.feed({
      tab: "current",
      page: 1,
      limit: 20,
    });
    
    // Also fetch "news" tab for recent announcements
    const newsResponse = await api.opportunities.feed({
      tab: "news",
      page: 1,
      limit: 10,
    });
    
    // Combine current + news, remove duplicates, filter service_info
    const allOpportunities = [
      ...(response.data.opportunities || []),
      ...(newsResponse.data.opportunities || []),
    ];
    
    // Remove duplicates by _id
    const uniqueOpportunities = allOpportunities.filter((o: any, index: number, self: any[]) => 
      index === self.findIndex((t: any) => t._id === o._id)
    );
    
    // Filter out service_info
    const opportunities = uniqueOpportunities.filter((o: any) => o.kind !== "service_info");
    
    // Sort by publishedAt desc (newest first)
    opportunities.sort((a: any, b: any) => {
      const dateA = new Date(a.publishedAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.publishedAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
    
    newOpen.value = opportunities.slice(0, 6);
  } catch (error) {
    console.error("Failed to fetch new & open:", error);
    // Fallback to regular list if feed fails
    try {
      const fallbackResponse = await api.opportunities.list({
        page: 1,
        limit: 20,
      });
      newOpen.value = (fallbackResponse.data.opportunities || [])
        .filter((o: any) => o.kind !== "service_info")
        .slice(0, 6);
    } catch (fallbackError) {
      console.error("Fallback fetch also failed:", fallbackError);
    }
  } finally {
    loadingNew.value = false;
  }
}

async function fetchTrending() {
  try {
    const response = await api.opportunities.trending(168); // Last 7 days
    trending.value = (response.data || []).filter((o: any) => o.kind !== "service_info");
  } catch (error) {
    console.error("Failed to fetch trending:", error);
  } finally {
    loadingTrending.value = false;
  }
}

async function fetchForYou() {
  if (!isAuthenticated.value) {
    loadingForYou.value = false;
    return;
  }
  try {
    const response = await api.opportunities.forYou();
    // The forYou endpoint returns { hasProfile: boolean, matched: [], unknown: [] }
    const data = response.data || {};
    const opportunities = [...(data.matched || []), ...(data.unknown || [])];
    forYou.value = opportunities.slice(0, 6);
  } catch (error) {
    console.error("Failed to fetch for you:", error);
    forYou.value = [];
  } finally {
    loadingForYou.value = false;
  }
}

async function fetchStats() {
  try {
    const response = await api.stats.get();
    stats.value.sources = response.data.sources || 0;
    stats.value.opportunities = response.data.opportunities || 0;
    stats.value.openCount = response.data.openCount || 0;

    if (response.data.lastScanAt) {
      lastScanAt.value = new Date(response.data.lastScanAt);
    }
  } catch (error) {
    console.error("Failed to fetch stats:", error);
  } finally {
    statsLoaded.value = true;
  }
}

onMounted(() => {
  nextTick(() => {
    setupScrollAnimations();
  });

  // Critical path: lists + stats (no chip-count storm on first paint)
  Promise.all([fetchNewOpen(), fetchTrending(), fetchForYou(), fetchStats()]).catch((err) =>
    console.error("Initial fetch failed:", err),
  );

  // Defer chip totals — 5 extra API calls; not needed for first contentful sections
  const runChips = () => {
    fetchChipCounts().catch(() => {});
  };
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(runChips, { timeout: 3000 });
  } else {
    setTimeout(runChips, 200);
  }

  if (heroRef.value) {
    heroRef.value.classList.add("visible");
  }
});

watch(
  () => [loadingNew.value, loadingTrending.value, loadingForYou.value],
  () => {
    if (!loadingNew.value && !loadingTrending.value && !loadingForYou.value) {
      nextTick(() => setupScrollAnimations());
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  scrollSectionObserver?.disconnect();
  scrollSectionObserver = null;
});
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  min-width: 0;
  overflow-x: hidden;
  width: 100%;
}

@media (min-width: 640px) {
  .home {
    padding: 2.5rem 1.5rem 3.5rem;
  }
}

@media (min-width: 1024px) {
  .home {
    padding: 3rem 1.5rem 4rem;
  }
}

/* Hero Section */
.hero {
  display: grid;
  grid-template-columns: 1fr;
  min-width: 0;
  align-items: center;
  gap: 2rem;
  padding: 2rem 0;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease-out forwards;
}

.hero-content {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out 0.2s forwards;
}

@media (prefers-reduced-motion: reduce) {
  .hero,
  .hero-content {
    opacity: 1;
    transform: none;
    animation: none;
  }

  .card,
  .chip,
  .btn,
  .step,
  .safety-card,
  .example-card,
  .faq-item {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}

.hero-title {
  font-size: 1.75rem;
  margin-bottom: 1rem;
  line-height: 1.15;
  color: var(--text-primary);
  font-weight: 700;
  letter-spacing: -0.01em;
}

@media (min-width: 640px) {
  .hero-title {
    font-size: 2.25rem;
  }
}

@media (min-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 3rem;
    padding: 3rem 0;
  }
  .hero-title {
    font-size: 3rem;
    margin-bottom: 1.5rem;
  }
}

.hero-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.6;
  max-width: 62ch;
}

@media (min-width: 640px) {
  .hero-subtitle {
    font-size: 1.15rem;
    margin-bottom: 2rem;
  }
}

.hero-chips {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.chip {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.chip:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: translateY(-1px);
}

.chip-count {
  font-weight: 400;
  opacity: 0.8;
}

.actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
  display: inline-block;
  line-height: 1.2;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
  border-color: var(--border-hover);
  transform: translateY(-2px);
}

.hero-visual {
  position: relative;
  height: 200px;
  order: -1;
}

@media (min-width: 900px) {
  .hero-visual {
    height: 260px;
    order: unset;
  }
}

.glow-circle {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, var(--accent-primary), var(--bg-primary));
  opacity: 0.5;
  filter: blur(10px);
  animation: pulse 6s infinite alternate;
}

.card {
  position: absolute;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  backdrop-filter: blur(12px);
  font-size: 0.9rem;
}

.card-1 {
  top: 10%;
  left: 0;
  animation: float 8s ease-in-out infinite;
}

.card-2 {
  top: 55%;
  right: 5%;
  animation: float 7s ease-in-out infinite 0.8s;
}

.card-3 {
  bottom: -5%;
  left: 25%;
  animation: float 9s ease-in-out infinite 0.4s;
}

/* Stats Section — visible immediately (no blank page waiting for observer/APIs) */
.stats-section {
  margin: 4rem 0;
  padding: 2rem 0;
  opacity: 1;
  transform: translateY(0);
}

.stats-section.visible {
  opacity: 1;
  transform: translateY(0);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  text-align: center;
}

.stat-item {
  padding: 1.5rem;
}

.stat-value {
  font-size: 3rem;
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 0.5rem;
}

.open-count {
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--text-secondary);
}

.stat-value.skeleton,
.live-badge.skeleton {
  background: var(--bg-tertiary);
  border-radius: 0.5rem;
  height: 3rem;
  animation: pulse 1.5s infinite ease-in-out;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  font-weight: 700;
}

.sync-note {
  text-align: center;
  color: var(--text-secondary);
  margin-top: 1rem;
}

.stat-label {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.stat-total-caption {
  margin: 0.6rem auto 0;
  max-width: 22rem;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 1.35;
}

/* How it works */
.how-it-works {
  margin-top: 4rem;
  opacity: 1;
  transform: translateY(0);
}

.how-it-works.visible {
  opacity: 1;
  transform: translateY(0);
}

.how-it-works h2 {
  text-align: center;
  font-size: 1.75rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.info-caption {
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin-bottom: 2rem;
  font-style: italic;
}

.mini-cta {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  text-align: center;
}

.mini-cta p {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-weight: 600;
}

.btn.small {
  padding: 0.5rem 1.5rem;
  font-size: 0.9rem;
}

.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.step {
  background: var(--bg-secondary);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  transform: translateY(0);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s;
  position: relative;
}

.step:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
  border-color: var(--border-hover);
}

.step-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--accent-light);
  color: var(--accent-primary);
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.step h3 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.step p {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Featured Sections */
.featured-section {
  margin-top: 4rem;
  opacity: 1;
  transform: translateY(0);
}

.featured-section.visible {
  opacity: 1;
  transform: translateY(0);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.75rem;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.link {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.link:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

.opportunities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.skeleton-line {
  background: var(--bg-tertiary);
  height: 12px;
  border-radius: 8px;
  margin: 0.3rem 0;
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-line.short {
  width: 60%;
}

.skeleton-featured-grid {
  margin-top: 0.5rem;
}

.fallback-list {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.25rem;
  color: var(--text-secondary);
}

.fallback-list h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
}

.fallback-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--accent-primary);
  cursor: pointer;
  padding: 0;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

/* Safety/Trust Section */
.safety {
  margin-top: 4rem;
  opacity: 1;
  transform: translateY(0);
}

.safety.visible {
  opacity: 1;
  transform: translateY(0);
}

.safety h2 {
  text-align: center;
  font-size: 1.75rem;
  color: var(--text-primary);
  margin-bottom: 2rem;
}

.safety-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.safety-card {
  background: var(--bg-secondary);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  transition: border-color 0.2s, transform 0.2s;
}

.safety-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}

.safety-card h3 {
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.safety-card p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.dont-do {
  margin-top: 1.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
}

.dont-do-title {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-weight: 700;
}

.dont-do ul {
  margin: 0;
  padding-left: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.disclaimer {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  text-align: center;
}

/* Examples */
.examples {
  margin-top: 4rem;
  opacity: 1;
  transform: translateY(0);
}

.examples.visible {
  opacity: 1;
  transform: translateY(0);
}

.examples h2 {
  text-align: center;
  font-size: 1.75rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.examples-disclaimer {
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin-bottom: 1.5rem;
  font-style: italic;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}

.example-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.example-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-hover);
}

.example-card h3 {
  margin: 0 0 0.35rem 0;
  color: var(--text-primary);
}

.example-meta {
  margin: 0 0 0.75rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.example-card ul {
  margin: 0 0 1rem 0;
  padding-left: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.requirement-link {
  color: var(--accent-primary);
  text-decoration: none;
  transition: color 0.2s;
}

.requirement-link:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

.btn.small {
  padding: 0.55rem 1.25rem;
  font-size: 0.9rem;
}

/* FAQ Section */
.faq {
  margin-top: 4rem;
  opacity: 1;
  transform: translateY(0);
}

.faq.visible {
  opacity: 1;
  transform: translateY(0);
}

.faq h2 {
  text-align: center;
  font-size: 1.75rem;
  color: var(--text-primary);
  margin-bottom: 2rem;
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.faq-item {
  background: var(--bg-secondary);
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  transition: border-color 0.2s, transform 0.2s;
}

.faq-item:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}

.faq-item h3 {
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.faq-item p {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
}

@keyframes pulse {
  from {
    opacity: 0.4;
    transform: scale(0.95);
  }
  to {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

@media (max-width: 640px) {
  .stats-section {
    margin: 2.5rem 0;
    padding: 1.5rem 0;
  }
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  .stat-value {
    font-size: 2.25rem;
  }
  .stat-item {
    padding: 1rem;
  }
  .how-it-works {
    margin-top: 2.5rem;
  }
  .how-it-works h2 {
    font-size: 1.5rem;
  }
  .steps {
    grid-template-columns: 1fr;
  }
  .featured-section {
    margin-top: 2.5rem;
  }
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .section-header h2 {
    font-size: 1.4rem;
  }
  .opportunities-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  .safety h2,
  .examples h2,
  .faq h2 {
    font-size: 1.4rem;
  }
  .safety-grid,
  .examples-grid,
  .faq-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .stat-value {
    font-size: 2.5rem;
  }
}
</style>
