import axios from "axios";
import { config } from "../../config/env";
import { OpportunityType, Region } from "../../shared/types";
import { CriteriaRules } from "../../shared/rulesTypes";

export interface ExtractedOpportunity {
  type: OpportunityType;
  title: string;
  summary: string;
  deadlineAt?: Date;
  applicationUrl?: string;
  tags: string[];
  region?: Region;
  criteriaJson: Record<string, any>;
  criteriaRulesJson: CriteriaRules;
  criteriaUnknown?: boolean;
  confidence: number;
  status?: "open" | "closed" | "expected" | "unknown";
  isIrrelevant?: boolean; // Flag to explicitly reject content
}

/**
 * AI-extracted application status
 */
export interface AIStatusResult {
  status: "open" | "closed" | "upcoming" | "expired" | "unknown";
  confidence: number;
  deadlineAt?: string; // ISO date string
  startAt?: string; // ISO date string
  reasoning: string;
}

// Helper to extract the first valid JSON object by balancing braces
function extractJsonBlock(text: string): string {
  const start = text.indexOf('{');
  if (start === -1) return text;

  let balance = 0;
  let end = -1;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    
    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        balance++;
      } else if (char === '}') {
        balance--;
        if (balance === 0) {
          end = i;
          break;
        }
      }
    }
  }

  if (end !== -1) {
    return text.substring(start, end + 1);
  }
  
  return text.substring(start); // Fallback to rest of string matches logic
}

/**
 * Extract application status using Gemini AI
 * 
 * Call this when keyword-based rules return "unknown" to get AI-assisted determination.
 * Uses a focused prompt specifically for status detection.
 */
export async function extractApplicationStatus(
  title: string,
  content: string,
  sourceUrl?: string
): Promise<AIStatusResult> {
  const apiKey = config.groq.apiKey;
  
  // If no API key, return unknown immediately
  if (!apiKey) {
    return {
      status: "unknown",
      confidence: 0,
      reasoning: "No Groq API key available",
    };
  }

  try {
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    const today = new Date().toISOString().split('T')[0];

    const prompt = `Είσαι ειδικός αναλυτής για ελληνικές ευκαιρίες επιδομάτων/προγραμμάτων. Σήμερα είναι: ${today}

Ανάλυσε αυτό το κείμενο και προσδιόρισε την ΚΑΤΑΣΤΑΣΗ ΑΙΤΗΣΕΩΝ.
ΨΑΞΕ ΠΡΟΣΕΚΤΙΚΑ ΓΙΑ ΗΜΕΡΟΜΗΝΙΕΣ ΛΗΞΗΣ (keywords: "Προθεσμία", "Υποβολή έως", "Λήξη", "μέχρι").

ΣΗΜΑΝΤΙΚΟ: Τώρα έχουμε 2026.
- Προσοχή: Ημερομηνίες ΕΝΑΡΞΗΣ (Start Date) μπορεί να είναι στο παρελθόν (π.χ. 2024, 2025). Αυτό ΔΕΝ σημαίνει ότι έληξε.
- ΜΟΝΟ αν η Ημερομηνία ΛΗΞΗΣ (Deadline) είναι στο παρελθόν, τότε είναι EXPIRED.
- Αν βλέπεις "μέχρι εξαντλήσεως προϋπολογισμού" ή "ανοικτό", είναι OPEN.

ΤΙΤΛΟΣ: ${title}
URL: ${sourceUrl || 'N/A'}

ΚΕΙΜΕΝΟ:
${content.substring(0, 2000)}

---

Απάντησε ΜΟΝΟ με JSON:
{
  "status": "open" | "closed" | "upcoming" | "expired",
  "confidence": 0.0-1.0,
  "deadlineAt": "YYYY-MM-DD" ή null,
  "startAt": "YYYY-MM-DD" ή null,
  "reasoning": "Μια πρόταση εξήγηση"
}

ΚΑΝΟΝΕΣ:
1. Αν βρεις ημερομηνία λήξης πριν από ${today}, το status ΕΙΝΑΙ "expired" (ή "closed").
2. "open": Οι αιτήσεις ΓΙΝΟΝΤΑΙ ΔΕΚΤΕΣ τώρα kai δεν έχουν λήξει.
3. "upcoming": Οι αιτήσεις ΘΑ ΑΝΟΙΞΟΥΝ στο μέλλον.
4. "closed": Οι αιτήσεις έχουν κλείσει.

Αν δεν είσαι σίγουρος, βάλε χαμηλό confidence.`;

    const model = config.groq.model || 'llama-3.1-8b-instant';
    // No response_format for safety
    
    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      },
      {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json' 
        },
        timeout: 10000 
      }
    );

    if (response.data?.choices?.[0]?.message?.content) {
      let rawText = response.data.choices[0].message.content;
      
      // Use helper to extract ONLY the JSON block
      const jsonText = extractJsonBlock(rawText);
      
      const parsed = JSON.parse(jsonText);
      
      // Validate and map status to schema enums
      // Schema accepts: "upcoming", "open", "closed", "unknown"
      let status: AIStatusResult["status"] = "unknown";
      const rawStatus = (parsed.status || "").toLowerCase();

      if (["open", "active"].includes(rawStatus)) {
        status = "open";
      } else if (["closed", "expired", "completed", "results", "ended"].includes(rawStatus)) {
        status = "closed"; // Schema only supports 'closed', not 'expired'
      } else if (["upcoming", "future", "expected"].includes(rawStatus)) {
        status = "upcoming";
      }
      
      console.log(`   🤖 AI Status (Groq): ${rawStatus} -> ${status} (${Math.round((parsed.confidence || 0) * 100)}%) - ${parsed.reasoning?.substring(0, 60) || 'No reasoning'}`);
      
      return {
        status,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
        deadlineAt: parsed.deadlineAt,
        startAt: parsed.startAt,
        reasoning: parsed.reasoning || "AI determined status"
      };
    }
    
    throw new Error("Empty response from Groq");

  } catch (error: any) {
    // Don't log full error to reduce noise - just note the failure
    console.log(`   ⚠️ AI Status extraction failed: ${error.message?.substring(0, 50) || 'Unknown error'}`);
    
    return {
      status: "unknown",
      confidence: 0,
      reasoning: `AI extraction failed: ${error.message}`,
    };
  }
}

/**
 * AI Extractor Stub
 *
 * This is a placeholder that returns mock data.
 *
 * TO REPLACE WITH REAL LLM:
 * 1. Set up AI_EXTRACTOR_URL and AI_EXTRACTOR_API_KEY in .env
 * 2. Replace the implementation below to call your LLM API
 * 3. The LLM should return JSON matching ExtractedOpportunity interface
 * 4. Validate response with Zod schema
 *
 * Example LLM integration:
 * ```typescript
 * const response = await axios.post(config.aiExtractor.url, {
 *   text: content,
 *   apiKey: config.aiExtractor.apiKey,
 * });
 * return response.data as ExtractedOpportunity;
 * ```
 */
export async function extractOpportunity(
  content: string
): Promise<ExtractedOpportunity> {
  // STUB: Return mock extracted data
  // In production, replace this with actual LLM API call

  // CHECK: If no API key, use fallback stub
  const apiKey = config.groq.apiKey;
  if (!apiKey) {
    console.warn("⚠️  No GROQ_API_KEY found, using fallback keyword extractor.");
    return fallbackStubExtractor(content);
  }

  // Real Groq Implementation
  try {
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `Είσαι το "BenefitPulse AI", μια εξειδικευμένη μηχανή εξαγωγής δεδομένων για ελληνικές κρατικές προκηρύξεις, επιδόματα και θέσεις εργασίας.

ΣΤΟΧΟΣ ΣΟΥ: Ανάλυσε το κείμενο εισόδου και εξήγαγε δομημένα δεδομένα JSON με ακρίβεια.

ΠΛΑΙΣΙΟ:
- Τρέχουσα Ημερομηνία: ${today} (ΕΕΕΕ-ΜΜ-ΗΗ).
- Η είσοδος είναι συνήθως ακατέργαστο HTML ή κείμενο από ελληνικά sites (Διαύγεια, ΔΥΠΑ, gov.gr).

ΟΔΗΓΙΕΣ ΓΙΑ ΤΑ ΠΕΔΙΑ:

1. **type**: Ταξινόμησε αυστηρά σε ένα από τα εξής:
   - "subsidy": Επιδόματα, Vouchers, Market Pass, οικονομική ενίσχυση.
   - "job": Θέσεις εργασίας, ΣΟΧ, ΣΜΕ, Μόνιμοι.
   - "program": Κατάρτιση, Προγράμματα ΔΥΠΑ, Κοινωφελής εργασία.
   - "contest": Διαγωνισμοί ΑΣΕΠ, Προσλήψεις.
   - "news": ΜΟΝΟ για "Αποτελέσματα Προκηρύξεων" (Αποτελέσματα, Πίνακες, Διοριστέοι, Επιλαχόντες, Ενστάσεις) που σχετίζονται με συγκεκριμένη προκήρυξη.
   - "irrelevant": ΟΛΑ ΤΑ ΑΛΛΑ που βρίσκονται σε νέα/ανακοινώσεις και ΔΕΝ είναι αποτέλεσμα/πίνακας/ένσταση.
     Παραδείγματα IRRELEVANT:
     - "Κυκλοφόρησε App", "Νέα ψηφιακή υπηρεσία", "Αναβάθμιση ιστοσελίδας".
     - "Ο Υπουργός επισκέφθηκε...", "Δελτίο Τύπου" (Γενικά), "Συνέντευξη".
     - "Στατιστικά", "Αναφορές", "Γενικές πληροφορίες χωρίς ενέργεια".
     - "Οδηγίες", "Εγχειρίδια".

2. **title**: Καθάρισε τον τίτλο. Αφαίρεσε ορολογίες όπως "ΑΔΑ:", "Ψ67...", "ΑΝΑΡΤΗΣΗ". Κράτα τον περιεκτικό.

3. **summary**: Γράψε σύνοψη στα ΕΛΛΗΝΙΚΑ (max 280 χαρακτήρες).
   - Δομή: "Περιγραφή παροχής. Ποιοι είναι δικαιούχοι."
   - Ύφος: Επαγγελματικό, άμεσο, ενθαρρυντικό.
   - ΟΧΙ "Κλικ εδώ", ΟΧΙ "Διαβάστε περισσότερα".

4. **dates**:
   - "deadlineAt": Ακριβής ημερομηνία λήξης (ISO 8601). Αν λέει "εντός 10 ημερών από 01/01", υπολόγισέ το.
   - "status": "open" | "closed" | "expected" | "unknown".
   
   ΚΑΝΟΝΕΣ ΗΜΕΡΟΜΗΝΙΩΝ (ΣΗΜΑΝΤΙΚΟ):
   - ΤΩΡΑ ΕΙΝΑΙ 2026.
   - Hμερομηνίες έναρξης (Start Dates) του 2024/2025 είναι αποδεκτές αν το πρόγραμμα τρέχει ακόμα.
   - ΜΟΝΟ αν η ημερομηνία ΛΗΞΗΣ (Deadline) είναι πριν από ${today}, τότε status="closed".
   - Αν είναι "ανοικτό" ή "μέχρι εξαντλήσεως", status="open".

5. **tags**: Εξήγαγε αυστηρά tags: "unemployed", "student", "parent", "disabled", "business", "tourism", "farmers", "pensioners".

6. **region**: Εντόπισε περιοχή αν είναι συγκεκριμένη.

OUTPUT JSON SCHEMA ONLY:
{
  "type": "subsidy" | "job" | "program" | "contest" | "news" | "irrelevant",
  "title": "string",
  "summary": "string",
  "deadlineAt": "YYYY-MM-DD" | null,
  "status": "open" | "closed" | "expected" | "unknown",
  "tags": ["tag1", "tag2"],
  "confidence": number (0.0 to 1.0)
}`;

    const model = config.groq.model || 'llama-3.1-8b-instant';
    // We rely on the system prompt for JSON format to avoid API 400 errors
    // with incompatible response_format parameters across different models
    const requestBody: any = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Text to analyze:\n" + content.substring(0, 3000) }
      ],
      temperature: 0.1
    };

    const response = await axios.post(
      apiUrl,
      requestBody,
      {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json' 
        },
        timeout: 30000 
      }
    );

    if (response.data?.choices?.[0]?.message?.content) {
      let rawText = response.data.choices[0].message.content;
      
      // Use helper to extract ONLY the JSON block
      const jsonText = extractJsonBlock(rawText);
      
      const parsed = JSON.parse(jsonText);
      
      // Map AI types to system types
      let type: OpportunityType = "manual"; // Default maps to news/manual
      let isIrrelevant = false;
      const aiType = parsed.type || "news";
      
      switch (aiType) {
        case "subsidy": type = "subsidy"; break;
        case "job": type = "public_call"; break;
        case "program": type = "program"; break;
        case "contest": type = "asep_competition"; break;
        case "news": type = "manual"; break; // Only valid Results/Notices stay as manual(news)
        case "irrelevant": 
          type = "manual"; 
          isIrrelevant = true; 
          break;
        default: type = "manual";
      }

      // Reconstruct criteriaRules from tags (backward compatibility)
      const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      const mappedStatusFlags: any[] = [];
      if (tags.includes("student")) mappedStatusFlags.push("student");
      if (tags.includes("unemployed")) mappedStatusFlags.push("unemployed");
      if (tags.includes("parent")) mappedStatusFlags.push("parent");
      if (tags.includes("pensioners")) mappedStatusFlags.push("retired");
      // "disabled", "business", "tourism", "farmers" are kept as tags but not valid StatusFlag
      
      const criteriaRulesJson: CriteriaRules = {
        statusFlags: mappedStatusFlags.length > 0 ? { required: mappedStatusFlags } : undefined,
        // Region will be set after normalization below
      };

      // Normalize Region
      let region: Region | undefined = parsed.region as Region;
      if (region) {
          // Normalize common Greek/English inputs to enum
          const lowerRegion = String(region).toLowerCase();
          
          // Helper map for strict normalization
          const regionMap: Record<string, Region> = {
             "αττική": "attiki", "attica": "attiki", "athens": "attiki", "αθήνα": "attiki", "ελευσίνα": "attiki", "elefsina": "attiki",
             "thessaloniki": "thessaloniki", "θεσσαλονίκη": "thessaloniki",
             "crete": "crete", "κρήτη": "crete",
             "peloponnese": "peloponnese", "πελοπόννησος": "peloponnese",
             "macedonia": "macedonia", "μακεδονία": "macedonia",
             "thrace": "thrace", "θράκη": "thrace",
             "epirus": "epirus", "ήπειρος": "epirus",
             "thessaly": "thessaly", "θεσσαλία": "thessaly",
             "central_greece": "central_greece", "στερεά ελλάδα": "central_greece",
             "western_greece": "western_greece", "δυτική ελλάδα": "western_greece",
             "aegean_islands": "aegean_islands", "αιγαίο": "aegean_islands",
             "ionian_islands": "ionian_islands", "ιόνιο": "ionian_islands",
             "nationwide": "nationwide", "πανελλαδικά": "nationwide", "όλη η ελλάδα": "nationwide",
          };

          if (regionMap[lowerRegion]) {
             region = regionMap[lowerRegion];
          } else if (!Object.values(regionMap).includes(region as Region)) {
             // If not in map and not already a valid enum value, fallback to undefined or 'other'
             // Check if it matches any valid enum key
             const validRegions = [
                "attiki", "thessaloniki", "crete", "peloponnese", "macedonia", 
                "thrace", "epirus", "thessaly", "central_greece", "western_greece", 
                "aegean_islands", "ionian_islands", "nationwide", "other"
             ];
             if (!validRegions.includes(lowerRegion)) {
                console.warn(`⚠️  Invalid region from AI: "${region}" -> setting to undefined`);
                region = undefined;
             }
          }
      }

      // Update criteriaRulesJson with normalized region
      if (region) {
        criteriaRulesJson.region = { includes: [region] };
      }

      // Map JSON to ExtractedOpportunity interface
      return {
        type,
        title: parsed.title || "Untitled",
        summary: parsed.summary || "",
        deadlineAt: parsed.deadlineAt ? new Date(parsed.deadlineAt) : undefined,
        tags,
        region: region || undefined,
        criteriaJson: {}, 
        criteriaRulesJson,
        criteriaUnknown: !criteriaRulesJson.statusFlags && !criteriaRulesJson.region,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        status: parsed.status
      };
    }
    
    throw new Error("Empty response from Groq");

  } catch (error: any) {
    if (error.response?.data) {
      console.error("❌ Groq Extractor failed (API Error):", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("❌ Groq Extractor failed:", error.message);
    }
    // Fallback to stub on error
    const stubResult = fallbackStubExtractor(content);
    // Ensure stub result has valid status enum
    if (stubResult.status === "expired" as any) {
        stubResult.status = "closed";
    }
    return stubResult;
  }
}

// Moved original logic to fallback function
function fallbackStubExtractor(content: string): ExtractedOpportunity {
  const lowerContent = content.toLowerCase();
  
  // Count how many benefit-related keywords we find (for confidence calculation)
  let benefitKeywordCount = 0;
  const benefitKeywords = [
    "επίδομα", "επιδομα", "subsidy", "grant",
    "ενίσχυση", "ενισχυση", "support", "financial support",
    "καταβολή", "καταβολη", "payment", "benefit",
    "δράση", "δραση", "action", "initiative",
    "επιχορήγηση", "επιχορηγηση", "funding", "financial aid",
    "βοήθημα", "βοηθημα", "aid", "assistance",
    "παροχή", "παροχη", "provision", "allowance",
    "οικονομική ενίσχυση", "οικονομικη ενισχυση", "economic support",
    "οικονομική βοήθεια", "οικονομικη βοηθεια", "financial assistance",
  ];
  
  for (const keyword of benefitKeywords) {
    if (lowerContent.includes(keyword)) {
      benefitKeywordCount++;
    }
  }

  let type: OpportunityType = "manual";
  let confidence = 0.5; // Base confidence
  
  // Enhanced type detection with synonyms
  if (benefitKeywordCount > 0) {
    type = "subsidy";
    confidence = Math.min(0.85, 0.5 + (benefitKeywordCount * 0.05)); // Increase confidence with more keywords
  } else if (
    lowerContent.includes("voucher") ||
    lowerContent.includes("κουπόνι") ||
    lowerContent.includes("κουπονι") ||
    lowerContent.includes("voucher κατάρτισης") ||
    lowerContent.includes("voucher καταρτισης")
  ) {
    type = "voucher";
    confidence = 0.75;
  } else if (
    lowerContent.includes("πρόγραμμα") ||
    lowerContent.includes("προγραμμα") ||
    lowerContent.includes("program") ||
    lowerContent.includes("scheme") ||
    lowerContent.includes("πρόγραμμα απασχόλησης") ||
    lowerContent.includes("προγραμμα απασχολησης")
  ) {
    type = "program";
    confidence = 0.75;
  } else if (
    lowerContent.includes("προκήρυξη") ||
    lowerContent.includes("προκηρυξη") ||
    lowerContent.includes("call") ||
    lowerContent.includes("announcement") ||
    lowerContent.includes("public call")
  ) {
    type = "public_call";
    confidence = 0.75;
  } else if (
    lowerContent.includes("ασεπ") ||
    lowerContent.includes("asep") ||
    lowerContent.includes("competition") ||
    lowerContent.includes("διαγωνισμός") ||
    lowerContent.includes("διαγωνισμος")
  ) {
    type = "asep_competition";
    confidence = 0.8;
  }
  
  // Extract title (first line or first 100 chars) - extract early for use in ASEP detection
  const title = content.split("\n")[0].substring(0, 100) || "Untitled";
  const lowerTitle = title.toLowerCase();
  
  // ASEP JOB DETECTION: Check for ASEP job announcements (ΠΡΟΚΗΡΥΞΗ, ΣΟΧ, ΣΜΕ)
  const asepJobKeywords = [
    "ασεπ",
    "asep",
    "προκήρυξη",
    "προκηρυξη",
    "σοχ",
    "σμε",
  ];
  
  const hasAsepJobKeyword = asepJobKeywords.some(keyword => 
    lowerContent.includes(keyword) || lowerTitle.includes(keyword)
  );
  
  if (hasAsepJobKeyword && (lowerContent.includes("προκήρυξη") || lowerContent.includes("προκηρυξη") || lowerTitle.includes("προκήρυξη") || lowerTitle.includes("προκηρυξη"))) {
    type = "public_call" as OpportunityType; // Use public_call for ASEP job announcements (closest match)
    confidence = 0.9; // ASEP is always high value
  }
  
  // IMPROVED STUB LOGIC: Check for training keywords if confidence is low (default stub)
  if (confidence <= 0.5) {
    const trainingKeywords = [
      "κατάρτιση",
      "καταρτιση",
      "επανακατάρτιση",
      "επανακαταρτιση",
      "δεξιότητες",
      "δεξιοτητες",
      "upskilling",
      "reskilling",
      "συμβουλευτική",
      "συμβουλευτικη",
    ];
    
    const hasTrainingKeyword = trainingKeywords.some(keyword => lowerContent.includes(keyword));
    
    if (hasTrainingKeyword) {
      type = "program";
      confidence = 0.8; // Boost confidence so it passes ingestion threshold
    }
  }

  // Extract summary (first 500 chars)
  let summary = content.substring(0, 500);
  
  // FIX ASEP "No Description": If summary is empty or "no description", use title
  if (!summary || summary.trim().length === 0 || summary.toLowerCase().includes("no description") || summary.toLowerCase().includes("χωρίς περιγραφή")) {
    summary = title; // Use title as summary for ASEP and other sources with missing descriptions
  }
  
  // Simple tag extraction (declare tags array first)
  const tags: string[] = [];
  
  // ASEP-specific kind detection based on title keywords (lowerTitle already declared above)
  const isAsepContent = lowerContent.includes("asep") || lowerContent.includes("ασεπ") || lowerTitle.includes("asep") || lowerTitle.includes("ασεπ");
  
  if (isAsepContent) {
    // News-like keywords: results, tables, lottery, objections
    if (
      lowerTitle.includes("αποτελέσματα") ||
      lowerTitle.includes("αποτελεσματα") ||
      lowerTitle.includes("πίνακες") ||
      lowerTitle.includes("πινακες") ||
      lowerTitle.includes("κληρωτίδα") ||
      lowerTitle.includes("κληρωτιδα") ||
      lowerTitle.includes("ενστάσεις") ||
      lowerTitle.includes("ενστασεις")
    ) {
      // Force kind to 'news' for ASEP results/announcements
      // Note: We can't change 'kind' here as it's not in ExtractedOpportunity interface
      // This will be handled in cleaner.ts or ingestion.service.ts
      // But we can add a tag to help identify it
      if (!tags.includes("public-sector")) {
        tags.push("public-sector");
      }
    }
    
    // Job/application keywords: submission, applications, proclamation
    if (
      lowerTitle.includes("υποβολή") ||
      lowerTitle.includes("υποβολη") ||
      lowerTitle.includes("αιτήσεις") ||
      lowerTitle.includes("αιτησεις") ||
      lowerTitle.includes("πρόσκληση") ||
      lowerTitle.includes("προσκληση") ||
      lowerTitle.includes("προκήρυξη") ||
      lowerTitle.includes("προκηρυξη")
    ) {
      // This is a job/program announcement
      if (type === "manual" || type === "public_call") {
        type = "public_call"; // Ensure it's treated as a call/announcement
      }
      if (!tags.includes("public-sector")) {
        tags.push("public-sector");
      }
    }
  }
  const tagKeywords: Record<string, string[]> = {
    student: ["φοιτητής", "φοιτητή", "student"],
    unemployed: ["άνεργος", "unemployed"],
    parent: ["γονέας", "parent"],
    energy: ["ενέργεια", "energy"],
    housing: ["κατοικία", "housing"],
    katartisi: ["κατάρτιση", "καταρτιση", "επανακατάρτιση", "επανακαταρτιση", "upskilling", "reskilling"], // Training tag
    "public-sector": ["ασεπ", "asep", "προκήρυξη", "προκηρυξη", "σοχ", "σμε"], // ASEP/public sector tag
  };

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some((kw) => lowerContent.includes(kw) || lowerTitle.includes(kw))) {
      tags.push(tag);
    }
  }
  
  // If we detected ASEP job keywords, ensure "public-sector" tag is present
  if (hasAsepJobKeyword && !tags.includes("public-sector")) {
    tags.push("public-sector");
  }
  
  // If we detected training keywords and set type to "program", ensure "katartisi" tag is present
  if (type === "program" && confidence >= 0.8 && !tags.includes("katartisi")) {
    const trainingKeywords = [
      "κατάρτιση",
      "καταρτιση",
      "επανακατάρτιση",
      "επανακαταρτιση",
      "δεξιότητες",
      "δεξιοτητες",
      "upskilling",
      "reskilling",
      "συμβουλευτική",
      "συμβουλευτικη",
    ];
    if (trainingKeywords.some(keyword => lowerContent.includes(keyword))) {
      tags.push("katartisi");
    }
  }

  // Simple region extraction
  let region: Region | undefined;
  const regionKeywords: Record<Region, string[]> = {
    attiki: ["αττική", "αθήνα", "athens"],
    thessaloniki: ["θεσσαλονίκη", "thessaloniki"],
    crete: ["κρήτη", "crete"],
    peloponnese: ["πελοπόννησος", "peloponnese"],
    macedonia: ["μακεδονία", "macedonia"],
    thrace: ["θράκη", "thrace"],
    epirus: ["ήπειρος", "epirus"],
    thessaly: ["θεσσαλία", "thessaly"],
    central_greece: ["στερεά ελλάδα", "central greece"],
    western_greece: ["δυτική ελλάδα", "western greece"],
    aegean_islands: ["αιγαίο", "aegean"],
    ionian_islands: ["ιόνιο", "ionian"],
    nationwide: ["πανελλαδικά", "όλη η ελλάδα", "nationwide"],
    other: [],
  };

  for (const [reg, keywords] of Object.entries(regionKeywords)) {
    if (keywords.some((kw) => lowerContent.includes(kw))) {
      region = reg as Region;
      break;
    }
  }

  // Regex-based criteria extraction (since we don't have LLM)
  const criteriaRulesJson: CriteriaRules = {
    statusFlags: tags.includes("student")
      ? { required: ["student"] }
      : undefined,
    region: region ? { includes: [region] } : undefined,
  };

  // Regex helpers for criteria extraction
  const ageRegex = /(\d{2})\s*[-–]\s*(\d{2})\s*(?:ετών|χρονών)/i;
  const unemploymentRegex = /(?:κάρτα|δελτίο)\s*ανεργίας|εγγεγραμμένοι\s*άνεργοι|ανέρων/i;
  const regionRegex = /(?:περιφέρεια|δήμος)\s*([Α-Ωα-ωά-ώ\s]+)/i;

  // 1. Extract Age Range
  const ageMatch = lowerContent.match(ageRegex);
  if (ageMatch) {
    const ageMin = parseInt(ageMatch[1], 10);
    const ageMax = parseInt(ageMatch[2], 10);
    if (!isNaN(ageMin) && !isNaN(ageMax)) {
      criteriaRulesJson.ageRange = {
        min: ageMin,
        max: ageMax,
      };
      if (!tags.includes("age-criteria")) {
        tags.push("age-criteria");
      }
    }
  }

  // 2. Extract Unemployment Status
  if (unemploymentRegex.test(lowerContent)) {
    criteriaRulesJson.statusFlags = criteriaRulesJson.statusFlags || {};
    criteriaRulesJson.statusFlags.required = [
      ...(criteriaRulesJson.statusFlags.required || []),
      "unemployed",
    ];
    if (!tags.includes("unemployed")) {
      tags.push("unemployed");
    }
  }

  // 3. Simple Region Detection (enhance existing region extraction)
  if (!region) {
    if (lowerContent.includes("αττική") || lowerContent.includes("αττικής") || lowerContent.includes("αθήνα") || lowerContent.includes("αθηνα")) {
      region = "attiki";
    } else if (lowerContent.includes("θεσσαλονίκ") || lowerContent.includes("θεσσαλονικη") || lowerContent.includes("κεντρικής μακεδονίας") || lowerContent.includes("κεντρικης μακεδονιας")) {
      region = "thessaloniki";
    } else if (lowerContent.includes("κρήτη") || lowerContent.includes("κρητη") || lowerContent.includes("crete")) {
      region = "crete";
    } else if (lowerContent.includes("πελοπόννησος") || lowerContent.includes("πελοποννησος") || lowerContent.includes("peloponnese")) {
      region = "peloponnese";
    } else if (lowerContent.includes("μακεδονία") || lowerContent.includes("μακεδονια") || lowerContent.includes("macedonia")) {
      region = "macedonia";
    } else if (lowerContent.includes("θράκη") || lowerContent.includes("θρακη") || lowerContent.includes("thrace")) {
      region = "thrace";
    } else if (lowerContent.includes("ήπειρος") || lowerContent.includes("ηπειρος") || lowerContent.includes("epirus")) {
      region = "epirus";
    } else if (lowerContent.includes("θεσσαλία") || lowerContent.includes("θεσσαλια") || lowerContent.includes("thessaly")) {
      region = "thessaly";
    } else if (lowerContent.includes("στερεά ελλάδα") || lowerContent.includes("στερεα ελλαδα") || lowerContent.includes("central greece")) {
      region = "central_greece";
    } else if (lowerContent.includes("δυτική ελλάδα") || lowerContent.includes("δυτικη ελλαδα") || lowerContent.includes("western greece")) {
      region = "western_greece";
    } else if (lowerContent.includes("αιγαίο") || lowerContent.includes("αιγαιο") || lowerContent.includes("aegean")) {
      region = "aegean_islands";
    } else if (lowerContent.includes("ιόνιο") || lowerContent.includes("ιονιο") || lowerContent.includes("ionian")) {
      region = "ionian_islands";
    }
    
    // Update region in criteriaRulesJson if found
    if (region) {
      criteriaRulesJson.region = { includes: [region] };
    }
  }

  return {
    type,
    title,
    summary,
    tags,
    region,
    criteriaJson: {},
    criteriaRulesJson,
    confidence, // Use calculated confidence (higher if keywords found)
  };
}
