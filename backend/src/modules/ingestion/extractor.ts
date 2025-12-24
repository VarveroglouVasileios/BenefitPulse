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

  // Fallback stub implementation
  const lowerContent = content.toLowerCase();

  let type: OpportunityType = "manual";
  if (lowerContent.includes("επίδομα") || lowerContent.includes("subsidy")) {
    type = "subsidy";
  } else if (
    lowerContent.includes("voucher") ||
    lowerContent.includes("κουπόνι")
  ) {
    type = "voucher";
  } else if (
    lowerContent.includes("πρόγραμμα") ||
    lowerContent.includes("program")
  ) {
    type = "program";
  } else if (
    lowerContent.includes("προκήρυξη") ||
    lowerContent.includes("call")
  ) {
    type = "public_call";
  } else if (
    lowerContent.includes("ασεπ") ||
    lowerContent.includes("competition")
  ) {
    type = "asep_competition";
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
    confidence: 0.5, // Low confidence for stub
  };
}
