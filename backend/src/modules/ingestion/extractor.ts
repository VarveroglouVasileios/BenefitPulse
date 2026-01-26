import axios from "axios";
import { config } from "../../config/env";
import { OpportunityType, Region } from "../../../../shared/src/types";
import { CriteriaRules } from "../../../../shared/src/rulesTypes";

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
- ΟΠΟΙΑΔΗΠΟΤΕ ημερομηνία του 2025 (π.χ. Δεκέμβριος 2025) είναι ΣΤΟ ΠΑΡΕΛΘΟΝ -> EXPIRED.
- Ημερομηνίες 2024 είναι ΠΑΛΙΕΣ -> EXPIRED.

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

    const response = await axios.post(
      apiUrl,
      {
        model: config.groq.model || 'llama-3.1-8b-instant',
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
      const rawText = response.data.choices[0].message.content;
      const parsed = JSON.parse(rawText);
      
      // Validate and map status to schema enums
      // Schema accepts: "upcoming", "open", "closed", "unknown"
      let status: AIStatusResult["status"] = "unknown";
      const rawStatus = (parsed.status || "").toLowerCase();

      if (["open", "active"].includes(rawStatus)) {
        status = "open";
      } else if (["closed", "expired", "completed", "results", "ended"].includes(rawStatus)) {
        status = "expired";
        if (rawStatus === "closed") status = "closed";
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
    
    const systemPrompt = `You are "BenefitPulse AI", an expert data extraction engine for Greek government notices, subsidies, and job openings.

YOUR GOAL: Analyze the input text and extract structured JSON data accurately.

CONTEXT:
- Current Date: ${today} (YYYY-MM-DD).
- Input is usually raw HTML text or scraped content from Greek sites (Diavgeia, DYPA, gov.gr).

INSTRUCTIONS FOR FIELDS:

1. **type**: Classify strictly into one of:
   - "subsidy" (Επιδόματα, Vouchers, Market Pass, οικονομική ενίσχυση).
   - "job" (Θέσεις εργασίας, ΣΟΧ, ΣΜΕ, Μόνιμοι).
   - "program" (Κατάρτιση, Προγράμματα DYPA, Κοινωφελής εργασία).
   - "contest" (Διαγωνισμοί ΑΣΕΠ, Προσλήψεις).
   - "news" (Ανακοινώσεις αποτελεσμάτων, παρατάσεις, γενικά νέα).

2. **title**: Clean up the title. Remove jargon like "ΑΔΑ:", "Ψ67...", "ΑΝΑΡΤΗΣΗ". Keep it concise.

3. **summary**: Write a summary in GREEK (max 280 chars).
   - Structure: "Benefit description. Who is eligible."
   - Tone: Professional, direct, encouraging.
   - NO "Click here", NO "Read more".

4. **dates**:
   - "deadlineAt": Exact expiration date (ISO 8601). If text says "within 10 days from 01/01", calculate it. If expired/past, still return the date.
   - "status": 
     - "open" (Deadline is in the future).
     - "closed" (Deadline is in the past).
     - "expected" (Application starts in future).
     - "unknown" (No dates found).

5. **tags**: Extract strict tags: "unemployed", "student", "parent", "disabled", "business", "tourism", "farmers", "pensioners".

6. **region**: Detect region if specific (e.g., "Crete", "Attica"). Return null if nationwide.

OUTPUT JSON SCHEMA ONLY (No markdown, no text before/after):
{
  "type": "subsidy" | "job" | "program" | "contest" | "news",
  "title": "string",
  "summary": "string",
  "deadlineAt": "YYYY-MM-DD" | null,
  "status": "open" | "closed" | "expected" | "unknown",
  "tags": ["tag1", "tag2"],
  "confidence": number (0.0 to 1.0)
}`;

    const response = await axios.post(
      apiUrl,
      {
        model: config.groq.model || 'llama-3.1-8b-instant',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Text to analyze:\n" + content.substring(0, 3000) }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      },
      {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json' 
        },
        timeout: 30000 
      }
    );

    if (response.data?.choices?.[0]?.message?.content) {
      const rawText = response.data.choices[0].message.content;
      const parsed = JSON.parse(rawText);
      
      // Map AI types to system types
      let type: OpportunityType = "manual";
      const aiType = parsed.type || "news";
      
      switch (aiType) {
        case "subsidy": type = "subsidy"; break;
        case "job": type = "public_call"; break;
        case "program": type = "program"; break;
        case "contest": type = "asep_competition"; break;
        case "news": type = "manual"; break;
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
        region: parsed.region ? { includes: [parsed.region] } : undefined,
      };

      // Map JSON to ExtractedOpportunity interface
      return {
        type,
        title: parsed.title || "Untitled",
        summary: parsed.summary || "",
        deadlineAt: parsed.deadlineAt ? new Date(parsed.deadlineAt) : undefined,
        tags,
        region: parsed.region || undefined,
        criteriaJson: {}, 
        criteriaRulesJson,
        criteriaUnknown: !criteriaRulesJson.statusFlags && !criteriaRulesJson.region,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        status: parsed.status
      };
    }
    
    throw new Error("Empty response from Groq");

  } catch (error: any) {
    console.error("❌ Groq Extractor failed:", error.message);
    // Fallback to stub on error
    return fallbackStubExtractor(content);
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
