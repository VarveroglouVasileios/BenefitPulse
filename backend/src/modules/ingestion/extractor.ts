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

  if (
    config.aiExtractor.url &&
    config.aiExtractor.url !== "http://localhost:8000/extract"
  ) {
    try {
      const response = await axios.post(
        config.aiExtractor.url,
        { text: content },
        {
          headers: {
            Authorization: `Bearer ${config.aiExtractor.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data as ExtractedOpportunity;
    } catch (error) {
      console.error("AI Extractor error, falling back to stub:", error);
    }
  }

  // Fallback stub implementation - ENHANCED with more keywords
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

  // Extract title (first line or first 100 chars)
  const title = content.split("\n")[0].substring(0, 100) || "Untitled";

  // Extract summary (first 500 chars)
  const summary = content.substring(0, 500);

  // Simple tag extraction
  const tags: string[] = [];
  const tagKeywords: Record<string, string[]> = {
    student: ["φοιτητής", "φοιτητή", "student"],
    unemployed: ["άνεργος", "unemployed"],
    parent: ["γονέας", "parent"],
    energy: ["ενέργεια", "energy"],
    housing: ["κατοικία", "housing"],
  };

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some((kw) => lowerContent.includes(kw))) {
      tags.push(tag);
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

  // Mock criteria rules (should be extracted by AI)
  const criteriaRulesJson: CriteriaRules = {
    statusFlags: tags.includes("student")
      ? { required: ["student"] }
      : undefined,
    region: region ? { includes: [region] } : undefined,
  };

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
