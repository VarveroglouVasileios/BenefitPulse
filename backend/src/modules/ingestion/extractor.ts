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
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    console.warn("⚠️  No GEMINI_API_KEY found, using fallback keyword extractor.");
    return fallbackStubExtractor(content);
  }

  // Real Gemini Implementation
  try {
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    const systemPrompt = `You are an expert data extractor for BenefitPulse. Your job is to analyze Greek announcements (subsidies, jobs, vouchers) and extract structured data.
    
    Output JSON ONLY. Structure:
    {
      "type": "subsidy" | "voucher" | "program" | "public_call" | "asep_competition",
      "title": "Clean concise title",
      "summary": "Short summary of the benefit (max 200 chars)",
      "deadlineAt": "ISO Date string (YYYY-MM-DD) or null",
      "tags": ["tag1", "tag2"],
      "region": "attiki" | "thessaloniki" | "crete" | "peloponnese" | "macedonia" | "thrace" | "epirus" | "thessaly" | "central_greece" | "western_greece" | "aegean_islands" | "ionian_islands" | "other" (or null if nationwide),
      "criteriaRulesJson": {
        "ageRange": "min-max" (e.g. "18-29") or null,
        "incomeRange": "range" (e.g. "<10k", "10-20k") or null,
        "statusFlags": { "required": ["unemployed", "student", "parent", "disabled", "pensioner"] } (only if strictly required)
      },
      "confidence": number (0.0 to 1.0 - how likely is this a real benefit/opportunity?)
    }
    
    Rules:
    - If it's a press release about a future payment, confidence is 0.6.
    - If it's an active call for applications, confidence is 0.9+.
    - Convert relative dates (e.g. "next Friday") to absolute if possible, otherwise null.
    `;

    const response = await axios.post(
      `${apiUrl}?key=${apiKey}`,
      {
        contents: [{
          role: "user",
          parts: [{ text: systemPrompt + "\n\nText to analyze:\n" + content.substring(0, 8000) }]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 
      }
    );

    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const rawText = response.data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(rawText);
      
      // Map JSON to ExtractedOpportunity interface
      return {
        type: parsed.type || "manual",
        title: parsed.title || "Untitled",
        summary: parsed.summary || "",
        deadlineAt: parsed.deadlineAt ? new Date(parsed.deadlineAt) : undefined,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        region: parsed.region || undefined,
        criteriaJson: {},
        criteriaRulesJson: parsed.criteriaRulesJson || {},
        criteriaUnknown: !parsed.criteriaRulesJson,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    }
    
    throw new Error("Empty response from Gemini");

  } catch (error: any) {
    console.error("❌ Gemini Extractor failed:", error.message);
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
