import Groq from "groq-sdk";
import { config } from "../../config/env";
import { OpportunityType, Region } from "../../../../shared/src/types";
import { CriteriaRules } from "../../../../shared/src/rulesTypes";
import { removeTitleFromSummary } from "../../utils/normalize";

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
}

// Groq client instance (shared, initialized once)
let groqClient: Groq | null = null;
let lastAiCallTime = 0;
const AI_CALL_DELAY_MS = 1000; // 1 second delay between AI calls

function getGroqClient(): Groq | null {
  if (!config.groq.apiKey) {
    return null;
  }

  if (!groqClient) {
    groqClient = new Groq({
      apiKey: config.groq.apiKey,
    });
  }

  return groqClient;
}

/**
 * AI-powered extractor using Groq (Llama 3)
 * Falls back to regex-based extraction if AI fails
 */
export async function extractOpportunity(
  content: string
): Promise<ExtractedOpportunity> {
  const groq = getGroqClient();

  // Try AI extraction first if Groq is configured
  if (groq && config.groq.apiKey) {
    try {
      // Rate limiting: wait if we called AI recently
      const timeSinceLastCall = Date.now() - lastAiCallTime;
      if (timeSinceLastCall < AI_CALL_DELAY_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, AI_CALL_DELAY_MS - timeSinceLastCall)
        );
      }

      lastAiCallTime = Date.now();

      const aiResult = await extractWithAI(groq, content);
      if (aiResult) {
        return aiResult;
      }
    } catch (error: any) {
      console.error(
        "AI Extractor error, falling back to regex:",
        error.message
      );
      // Fall through to regex fallback
    }
  }

  // Fallback to regex-based extraction
  return extractWithRegex(content);
}

/**
 * Extract opportunity using Groq AI
 */
async function extractWithAI(
  groq: Groq,
  content: string
): Promise<ExtractedOpportunity | null> {
  const systemPrompt = `### ROLE
You are a Senior Data Analyst for the Greek Public Sector. Your task is to extract structured data from raw HTML text.

### INPUT
You will receive a TITLE and CONTENT (HTML/Text).

### OBJECTIVES
1.  **Analyze Content**: Read the full text to understand the program.
2.  **Generate Summary**: Write a NEW, high-quality summary in Greek (1-2 sentences).
3.  **Classify**: Determine the 'kind' and 'status' of the item.
4.  **Extract Date**: Find the deadline if it exists.

### CRITICAL RULES (DO NOT BREAK)
* **SUMMARY**: Never copy-paste the title. Summarize *who* is eligible and *what* they receive. If content is empty, return "".
* **DEADLINE**: Extract dates ONLY if explicitly stated (e.g., "Λήξη: 20/05/2025"). Return 'null' if no specific date is found. DO NOT GUESS.
* **KIND**:
    * 'news': For Results, Tables, Announcements, Press Releases (Αποτελέσματα, Πίνακες, Ανακοίνωση).
    * 'job': For Active Job Openings (Προκηρύξεις ΑΣΕΠ, Θέσεις).
    * 'benefit': For Financial Aid (Επιδόματα, Market Pass).
    * 'program': For Training/Employment (Κατάρτιση, Κοινωφελής).
    * 'voucher': For Vouchers.
* **STATUS**:
    * 'active': For news items (always active/visible).
    * 'open': For active opportunities accepting applications.
    * 'closed': For opportunities with past deadlines.

### OUTPUT JSON SCHEMA
You must return a valid JSON object matching this structure exactly:
{
  "title": "string (cleaned title)",
  "summary": "string (the summary in Greek)",
  "kind": "job" | "benefit" | "program" | "voucher" | "news",
  "status": "active" | "open" | "closed",
  "deadlineAt": "YYYY-MM-DD" | null
}

CRITICAL:
- Return ONLY valid JSON, no markdown formatting or additional text.
- If uncertain about any field, use null or empty string rather than guessing.
- The summary must add value beyond the title - do not repeat it.`;

  const userPrompt = `Ανάλυσε το ακόλουθο κείμενο και εξάγαγε τα δεδομένα:\n\n${content.substring(
    0,
    4000
  )}`;

  try {
    // Try with response_format first (if supported by Groq)
    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: config.chatbot.model || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 500,
        response_format: { type: "json_object" }, // Force JSON output (may not be supported by all Groq models)
      } as any);
    } catch (formatError: any) {
      // If response_format is not supported, retry without it
      if (
        formatError.message?.includes("response_format") ||
        formatError.status === 400
      ) {
        completion = await groq.chat.completions.create({
          model: config.chatbot.model || "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
        });
      } else {
        throw formatError;
      }
    }

    const responseContent = completion.choices[0]?.message?.content?.trim();
    if (!responseContent) {
      throw new Error("Empty response from Groq API");
    }

    // Parse JSON response
    let aiData: any;
    try {
      aiData = JSON.parse(responseContent);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseContent.match(
        /```(?:json)?\s*(\{[\s\S]*\})\s*```/
      );
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse JSON from AI response");
      }
    }

    // Map AI response to ExtractedOpportunity
    // New format: AI returns 'kind' instead of 'type'
    const aiKind = (aiData.kind || "").toLowerCase();
    const mappedType = mapAIKindToOpportunityType(aiKind);
    const tags: string[] = [];

    // Add "news" tag if AI classified it as news
    if (aiKind === "news" && !tags.includes("news")) {
      tags.push("news");
    }

    // Add kind-specific tags
    if (aiKind === "job" && !tags.includes("public-sector")) {
      tags.push("public-sector");
    }
    if (aiKind === "benefit" && !tags.includes("benefit")) {
      tags.push("benefit");
    }
    if (aiKind === "program" && !tags.includes("katartisi")) {
      tags.push("katartisi");
    }
    if (aiKind === "voucher" && !tags.includes("voucher")) {
      tags.push("voucher");
    }

    // Build criteriaRulesJson (simplified - AI doesn't extract criteria in new format)
    const criteriaRulesJson: CriteriaRules = {};

    // Parse deadlineAt if provided (strict: only if explicitly found)
    let deadlineAt: Date | undefined;
    if (
      aiData.deadlineAt &&
      aiData.deadlineAt !== "null" &&
      aiData.deadlineAt !== null &&
      aiData.deadlineAt !== ""
    ) {
      try {
        deadlineAt = new Date(aiData.deadlineAt);
        if (isNaN(deadlineAt.getTime())) {
          deadlineAt = undefined; // Invalid date, treat as null
        }
      } catch {
        deadlineAt = undefined; // Parse error, treat as null
      }
    }
    // If deadlineAt is explicitly null or empty, leave it as undefined (no default)

    // Store kind and status in criteriaJson for use by cleaner.ts
    const criteriaJson: Record<string, any> = {
      aiKind: aiKind, // Store kind for cleaner.ts to use
      aiStatus: aiData.status || undefined, // Store status for cleaner.ts to use
    };

    // Extract region from tags or content if possible
    let region: Region | undefined;
    const regionTagMap: Record<string, Region> = {
      athens: "attiki",
      attiki: "attiki",
      thessaloniki: "central_macedonia", // Θεσσαλονίκη is in Central Macedonia
      crete: "crete",
      peloponnese: "peloponnese",
      macedonia: "central_macedonia", // Default to Central Macedonia
      "eastern macedonia": "eastern_macedonia_thrace",
      "western macedonia": "western_macedonia",
      thrace: "eastern_macedonia_thrace",
      epirus: "epirus",
      thessaly: "thessaly",
      "central greece": "central_greece",
      "western greece": "western_greece",
      "ionian islands": "ionian_islands",
      "north aegean": "north_aegean",
      "south aegean": "south_aegean",
    };

    for (const tag of tags) {
      if (regionTagMap[tag.toLowerCase()]) {
        region = regionTagMap[tag.toLowerCase()];
        break;
      }
    }

    if (region) {
      criteriaRulesJson.region = { includes: [region] };
    }

    // Extract title and summary
    const extractedTitle =
      aiData.title || content.split("\n")[0].substring(0, 100) || "Untitled";
    let extractedSummary = aiData.summary || content.substring(0, 500);

    // Remove title repetition from summary (deduplication)
    extractedSummary = removeTitleFromSummary(extractedTitle, extractedSummary);

    return {
      type: mappedType,
      title: extractedTitle,
      summary: extractedSummary,
      deadlineAt,
      tags,
      region,
      criteriaJson, // Contains aiKind and aiStatus for cleaner.ts
      criteriaRulesJson,
      confidence: 0.85, // High confidence for AI-extracted data
    };
  } catch (error: any) {
    console.error("AI extraction failed:", error.message);
    return null; // Return null to trigger regex fallback
  }
}

/**
 * Map AI kind string to OpportunityType enum
 * Note: "news" kind is handled separately (kind: "news", not a type)
 */
function mapAIKindToOpportunityType(aiKind: string): OpportunityType {
  const normalized = (aiKind || "").toLowerCase();

  // News kind is handled separately (kind: "news", not a type)
  if (normalized === "news") {
    // Return a default type, but the kind will be set to "news" in the cleaner
    return "manual"; // Will be overridden by cleaner based on kind
  }

  if (normalized === "benefit") {
    return "subsidy";
  }

  if (normalized === "program") {
    return "program";
  }

  if (normalized === "job") {
    return "public_call";
  }

  if (normalized === "voucher") {
    return "voucher";
  }

  // Default fallback
  return "subsidy";
}

/**
 * Fallback regex-based extraction (original implementation)
 */
function extractWithRegex(content: string): ExtractedOpportunity {
  const lowerContent = content.toLowerCase();

  // Count how many benefit-related keywords we find (for confidence calculation)
  let benefitKeywordCount = 0;
  const benefitKeywords = [
    "επίδομα",
    "επιδομα",
    "subsidy",
    "grant",
    "ενίσχυση",
    "ενισχυση",
    "support",
    "financial support",
    "καταβολή",
    "καταβολη",
    "payment",
    "benefit",
    "δράση",
    "δραση",
    "action",
    "initiative",
    "επιχορήγηση",
    "επιχορηγηση",
    "funding",
    "financial aid",
    "βοήθημα",
    "βοηθημα",
    "aid",
    "assistance",
    "παροχή",
    "παροχη",
    "provision",
    "allowance",
    "οικονομική ενίσχυση",
    "οικονομικη ενισχυση",
    "economic support",
    "οικονομική βοήθεια",
    "οικονομικη βοηθεια",
    "financial assistance",
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
    confidence = Math.min(0.85, 0.5 + benefitKeywordCount * 0.05); // Increase confidence with more keywords
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

  const hasAsepJobKeyword = asepJobKeywords.some(
    (keyword) => lowerContent.includes(keyword) || lowerTitle.includes(keyword)
  );

  if (
    hasAsepJobKeyword &&
    (lowerContent.includes("προκήρυξη") ||
      lowerContent.includes("προκηρυξη") ||
      lowerTitle.includes("προκήρυξη") ||
      lowerTitle.includes("προκηρυξη"))
  ) {
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

    const hasTrainingKeyword = trainingKeywords.some((keyword) =>
      lowerContent.includes(keyword)
    );

    if (hasTrainingKeyword) {
      type = "program";
      confidence = 0.8; // Boost confidence so it passes ingestion threshold
    }
  }

  // Extract summary (first 500 chars)
  let summary = content.substring(0, 500);

  // FIX ASEP "No Description": If summary is empty or "no description", use title
  if (
    !summary ||
    summary.trim().length === 0 ||
    summary.toLowerCase().includes("no description") ||
    summary.toLowerCase().includes("χωρίς περιγραφή")
  ) {
    summary = title; // Use title as summary for ASEP and other sources with missing descriptions
  }

  // Remove title repetition from summary (deduplication)
  summary = removeTitleFromSummary(title, summary);

  // Simple tag extraction (declare tags array first)
  const tags: string[] = [];

  // ASEP-specific kind detection based on title keywords (lowerTitle already declared above)
  const isAsepContent =
    lowerContent.includes("asep") ||
    lowerContent.includes("ασεπ") ||
    lowerTitle.includes("asep") ||
    lowerTitle.includes("ασεπ");

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
    katartisi: [
      "κατάρτιση",
      "καταρτιση",
      "επανακατάρτιση",
      "επανακαταρτιση",
      "upskilling",
      "reskilling",
    ], // Training tag
    "public-sector": ["ασεπ", "asep", "προκήρυξη", "προκηρυξη", "σοχ", "σμε"], // ASEP/public sector tag
  };

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (
      keywords.some(
        (kw) => lowerContent.includes(kw) || lowerTitle.includes(kw)
      )
    ) {
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
    if (trainingKeywords.some((keyword) => lowerContent.includes(keyword))) {
      tags.push("katartisi");
    }
  }

  // Simple region extraction
  let region: Region | undefined;
  const regionKeywords: Record<Region, string[]> = {
    eastern_macedonia_thrace: [
      "ανατολική μακεδονία",
      "ανατολικη μακεδονια",
      "θράκη",
      "θρακη",
      "eastern macedonia",
      "thrace",
    ],
    central_macedonia: [
      "κεντρική μακεδονία",
      "κεντρικη μακεδονια",
      "θεσσαλονίκη",
      "θεσσαλονικη",
      "central macedonia",
      "thessaloniki",
    ],
    western_macedonia: [
      "δυτική μακεδονία",
      "δυτικη μακεδονια",
      "western macedonia",
    ],
    epirus: ["ήπειρος", "ηπειρος", "epirus"],
    thessaly: ["θεσσαλία", "θεσσαλια", "thessaly"],
    central_greece: ["στερεά ελλάδα", "στερεα ελλαδα", "central greece"],
    ionian_islands: [
      "ιόνια νησιά",
      "ιονια νησια",
      "ιόνιο",
      "ιονιο",
      "ionian islands",
      "ionian",
    ],
    western_greece: ["δυτική ελλάδα", "δυτικη ελλαδα", "western greece"],
    peloponnese: ["πελοπόννησος", "πελοποννησος", "peloponnese"],
    attiki: ["αττική", "αττικη", "αθήνα", "αθηνα", "athens", "attiki"],
    north_aegean: ["βόρειο αιγαίο", "βορειο αιγαιο", "north aegean"],
    south_aegean: ["νότιο αιγαίο", "νοτιο αιγαιο", "south aegean"],
    crete: ["κρήτη", "κρητη", "crete"],
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
  const unemploymentRegex =
    /(?:κάρτα|δελτίο)\s*ανεργίας|εγγεγραμμένοι\s*άνεργοι|ανέρων/i;
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
    if (
      lowerContent.includes("αττική") ||
      lowerContent.includes("αττικής") ||
      lowerContent.includes("αθήνα") ||
      lowerContent.includes("αθηνα")
    ) {
      region = "attiki";
    } else if (
      lowerContent.includes("ανατολική μακεδονία") ||
      lowerContent.includes("ανατολικη μακεδονια") ||
      lowerContent.includes("θράκη") ||
      lowerContent.includes("θρακη") ||
      lowerContent.includes("eastern macedonia") ||
      lowerContent.includes("thrace")
    ) {
      region = "eastern_macedonia_thrace";
    } else if (
      lowerContent.includes("κεντρική μακεδονία") ||
      lowerContent.includes("κεντρικη μακεδονια") ||
      lowerContent.includes("θεσσαλονίκ") ||
      lowerContent.includes("θεσσαλονικη") ||
      lowerContent.includes("central macedonia") ||
      lowerContent.includes("thessaloniki")
    ) {
      region = "central_macedonia";
    } else if (
      lowerContent.includes("δυτική μακεδονία") ||
      lowerContent.includes("δυτικη μακεδονια") ||
      lowerContent.includes("western macedonia")
    ) {
      region = "western_macedonia";
    } else if (
      lowerContent.includes("κρήτη") ||
      lowerContent.includes("κρητη") ||
      lowerContent.includes("crete")
    ) {
      region = "crete";
    } else if (
      lowerContent.includes("πελοπόννησος") ||
      lowerContent.includes("πελοποννησος") ||
      lowerContent.includes("peloponnese")
    ) {
      region = "peloponnese";
    } else if (
      lowerContent.includes("ήπειρος") ||
      lowerContent.includes("ηπειρος") ||
      lowerContent.includes("epirus")
    ) {
      region = "epirus";
    } else if (
      lowerContent.includes("θεσσαλία") ||
      lowerContent.includes("θεσσαλια") ||
      lowerContent.includes("thessaly")
    ) {
      region = "thessaly";
    } else if (
      lowerContent.includes("στερεά ελλάδα") ||
      lowerContent.includes("στερεα ελλαδα") ||
      lowerContent.includes("central greece")
    ) {
      region = "central_greece";
    } else if (
      lowerContent.includes("δυτική ελλάδα") ||
      lowerContent.includes("δυτικη ελλαδα") ||
      lowerContent.includes("western greece")
    ) {
      region = "western_greece";
    } else if (
      lowerContent.includes("ιόνια νησιά") ||
      lowerContent.includes("ιονια νησια") ||
      lowerContent.includes("ιόνιο") ||
      lowerContent.includes("ιονιο") ||
      lowerContent.includes("ionian islands") ||
      lowerContent.includes("ionian")
    ) {
      region = "ionian_islands";
    } else if (
      lowerContent.includes("βόρειο αιγαίο") ||
      lowerContent.includes("βορειο αιγαιο") ||
      lowerContent.includes("north aegean")
    ) {
      region = "north_aegean";
    } else if (
      lowerContent.includes("νότιο αιγαίο") ||
      lowerContent.includes("νοτιο αιγαιο") ||
      lowerContent.includes("south aegean")
    ) {
      region = "south_aegean";
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
