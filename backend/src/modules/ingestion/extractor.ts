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
  const start = text.indexOf("{");
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

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        balance++;
      } else if (char === "}") {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let googleRequestTimestamps: number[] = [];
let googleDailyBucketDay = "";
let googleDailyCount = 0;
let googleLastRequestAt = 0;

async function enforceGoogleRateLimit(): Promise<void> {
  const rpm = Math.max(1, config.googleAi.rpm || 10);
  const rpd = Math.max(1, config.googleAi.rpd || 500);
  const minIntervalMs = Math.max(0, config.googleAi.minIntervalMs || 0);
  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);

  if (googleDailyBucketDay !== dayKey) {
    googleDailyBucketDay = dayKey;
    googleDailyCount = 0;
  }
  if (googleDailyCount >= rpd) {
    throw new Error(`Google AI daily quota guard reached (${googleDailyCount}/${rpd})`);
  }

  if (minIntervalMs > 0 && googleLastRequestAt > 0) {
    const sinceLastMs = now - googleLastRequestAt;
    if (sinceLastMs < minIntervalMs) {
      await sleep(minIntervalMs - sinceLastMs);
    }
  }

  const windowStart = Date.now() - 60_000;
  googleRequestTimestamps = googleRequestTimestamps.filter((t) => t >= windowStart);
  if (googleRequestTimestamps.length >= rpm) {
    const waitMs = googleRequestTimestamps[0] + 60_000 - Date.now();
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    const nextWindowStart = Date.now() - 60_000;
    googleRequestTimestamps = googleRequestTimestamps.filter((t) => t >= nextWindowStart);
  }
}

async function callGoogleJson(
  userPrompt: string,
  systemPrompt?: string,
  temperature: number = 0.1,
): Promise<any> {
  const apiKey = config.googleAi.apiKey;
  if (!apiKey) {
    throw new Error("Google AI API key missing");
  }

  const models = [config.googleAi.model, ...config.googleAi.fallbackModels].filter(Boolean);
  let lastError: any;

  for (const model of models) {
    try {
      await enforceGoogleRateLimit();

      const url = `${config.googleAi.apiUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await axios.post(
        url,
        {
          systemInstruction: systemPrompt
            ? { parts: [{ text: systemPrompt }] }
            : undefined,
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature,
          },
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        },
      );

      googleLastRequestAt = Date.now();
      googleRequestTimestamps.push(googleLastRequestAt);
      googleDailyCount++;

      const parts = response.data?.candidates?.[0]?.content?.parts;
      const rawText = Array.isArray(parts)
        ? parts.map((p: any) => p?.text || "").join("\n").trim()
        : "";
      if (!rawText) {
        throw new Error("Empty response from Google AI");
      }
      return JSON.parse(extractJsonBlock(rawText));
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status;
      if (status === 429 || status === 503) {
        console.warn(`   ⚠️ Google AI ${status} for model ${model}. Trying fallback...`);
        continue;
      }
      if (status === 404 || status === 400) {
        console.warn(`   ⚠️ Google AI model ${model} unavailable/misconfigured. Trying fallback...`);
        continue;
      }
      break;
    }
  }

  throw lastError || new Error("All Google AI models failed");
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
  sourceUrl?: string,
): Promise<AIStatusResult> {
  const groqApiKey = config.groq.apiKey;
  const googleApiKey = config.googleAi.apiKey;

  // If no API key at all, return unknown immediately
  if (!googleApiKey && !groqApiKey) {
    return {
      status: "unknown",
      confidence: 0,
      reasoning: "No AI API key available",
    };
  }

  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentYear = now.getFullYear();

    const prompt = `Είσαι ειδικός αναλυτής για ελληνικές ευκαιρίες επιδομάτων/προγραμμάτων. Σήμερα είναι: ${today}

Ανάλυσε αυτό το κείμενο και προσδιόρισε την ΚΑΤΑΣΤΑΣΗ ΑΙΤΗΣΕΩΝ.
ΨΑΞΕ ΠΡΟΣΕΚΤΙΚΑ ΓΙΑ ΗΜΕΡΟΜΗΝΙΕΣ ΛΗΞΗΣ (keywords: "Προθεσμία", "Υποβολή έως", "Λήξη", "μέχρι").

ΣΗΜΑΝΤΙΚΟ: Τώρα έχουμε έτος ${currentYear}.
- Προσοχή: Ημερομηνίες ΕΝΑΡΞΗΣ (Start Date) μπορεί να είναι στο παρελθόν (π.χ. προηγούμενα έτη). Αυτό ΔΕΝ σημαίνει ότι έληξε.
- ΜΟΝΟ αν η Ημερομηνία ΛΗΞΗΣ (Deadline) είναι στο παρελθόν σε σχέση με το ${today}, τότε είναι EXPIRED.
- Αν βλέπεις "μέχρι εξαντλήσεως προϋπολογισμού" ή "ανοικτό", είναι OPEN.
- Αν ο τίτλος αναφέρει αναρτημένους προσωρινούς/οριστικούς πίνακες ή αποτελέσματα, οι κύριες αιτήσεις έχουν ολοκληρωθεί: status CLOSED και deadlineAt null.
- Η ημερομηνία χρήσης, εξαργύρωσης ή ισχύος ενός voucher ΔΕΝ είναι προθεσμία αίτησης. Μην τη βάζεις σε deadlineAt.
- Προθεσμία ένστασης σε ανακοίνωση αποτελεσμάτων δεν είναι προθεσμία της κύριας αίτησης.

ΤΙΤΛΟΣ: ${title}
URL: ${sourceUrl || "N/A"}

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
5. "Αναρτήθηκαν πίνακες/αποτελέσματα": "closed", ακόμη και αν το voucher χρησιμοποιείται αργότερα.

Αν δεν είσαι σίγουρος, βάλε χαμηλό confidence.`;

    if (googleApiKey) {
      try {
        const parsed = await callGoogleJson(prompt);
        let status: AIStatusResult["status"] = "unknown";
        const rawStatus = (parsed.status || "").toLowerCase();

        if (["open", "active"].includes(rawStatus)) {
          status = "open";
        } else if (
          ["closed", "expired", "completed", "results", "ended"].includes(
            rawStatus,
          )
        ) {
          status = "closed";
        } else if (["upcoming", "future", "expected"].includes(rawStatus)) {
          status = "upcoming";
        }

        console.log(
          `   🤖 AI Status (Google ${config.googleAi.model}): ${rawStatus} -> ${status} (${Math.round((parsed.confidence || 0) * 100)}%)`,
        );

        return {
          status,
          confidence:
            typeof parsed.confidence === "number" ? parsed.confidence : 0,
          deadlineAt: parsed.deadlineAt,
          startAt: parsed.startAt,
          reasoning: parsed.reasoning || "AI determined status",
        };
      } catch (googleError: any) {
        console.warn(
          `   ⚠️ Google AI status extraction failed, falling back to Groq: ${googleError.message?.substring(0, 120) || "unknown error"}`,
        );
      }
    }

    if (!groqApiKey) {
      throw new Error("Google AI failed and GROQ_API_KEY is not configured");
    }

    const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

    const fallbackModels = [
      config.groq.model || "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
      "qwen/qwen3-32b",
      "moonshotai/kimi-k2-instruct",
    ];

    let lastError: any;

    for (const model of fallbackModels) {
      try {
        const response = await axios.post(
          apiUrl,
          {
            model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1,
          },
          {
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          },
        );

        if (response.data?.choices?.[0]?.message?.content) {
          let rawText = response.data.choices[0].message.content;

          // Use helper to extract ONLY the JSON block
          const jsonText = extractJsonBlock(rawText);

          const parsed = JSON.parse(jsonText);

          // Validate and map status to schema enums
          let status: AIStatusResult["status"] = "unknown";
          const rawStatus = (parsed.status || "").toLowerCase();

          if (["open", "active"].includes(rawStatus)) {
            status = "open";
          } else if (
            ["closed", "expired", "completed", "results", "ended"].includes(
              rawStatus,
            )
          ) {
            status = "closed"; 
          } else if (["upcoming", "future", "expected"].includes(rawStatus)) {
            status = "upcoming";
          }

          console.log(
            `   🤖 AI Status (Groq ${model}): ${rawStatus} -> ${status} (${Math.round((parsed.confidence || 0) * 100)}%)`,
          );

          return {
            status,
            confidence:
              typeof parsed.confidence === "number" ? parsed.confidence : 0,
            deadlineAt: parsed.deadlineAt,
            startAt: parsed.startAt,
            reasoning: parsed.reasoning || "AI determined status",
          };
        }
        throw new Error("Empty response from Groq");
      } catch (error: any) {
        lastError = error;
        // If it's a 429 Rate Limit, log and try the next model
        if (error.response && error.response.status === 429) {
          console.warn(`   ⚠️ Groq 429 Rate Limit hit for model ${model}. Switching to fallback...`);
          continue;
        }
        // If it's another error, break the loop and fail fast
        break;
      }
    }
    
    throw lastError || new Error("All Groq models failed");
  } catch (error: any) {
    // Don't log full error to reduce noise - just note the failure
    console.log(
      `   ⚠️ AI Status extraction failed: ${error.message?.substring(0, 50) || "Unknown error"}`,
    );

    return {
      status: "unknown",
      confidence: 0,
      reasoning: `AI extraction failed: ${error.message}`,
    };
  }
}

/**
 * AI Extractor using Groq
 */
export async function extractOpportunity(
  content: string,
): Promise<ExtractedOpportunity> {
  const groqApiKey = config.groq.apiKey;
  const googleApiKey = config.googleAi.apiKey;
  if (!googleApiKey && !groqApiKey) {
    console.warn(
      "⚠️  No AI API key found, using fallback keyword extractor.",
    );
    return fallbackStubExtractor(content);
  }

  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentYear = now.getFullYear();

    const systemPrompt = `Είσαι το "BenefitPulse AI", μια εξειδικευμένη μηχανή εξαγωγής δεδομένων για ελληνικές κρατικές προκηρύξεις, επιδόματα και θέσεις εργασίας.

ΣΤΟΧΟΣ ΣΟΥ: Ανάλυσε το κείμενο εισόδου και εξήγαγε δομημένα δεδομένα JSON με ακρίβεια.

ΠΛΑΙΣΙΟ:
- Τρέχουσα Ημερομηνία: ${today} (ΕΕΕΕ-ΜΜ-ΗΗ).
- Η είσοδος είναι συνήθως ακατέργαστο HTML ή κείμενο από ελληνικά sites (Διαύγεια, ΔΥΠΑ, gov.gr).

ΟΔΗΓΙΕΣ ΓΙΑ ΤΑ ΠΕΔΙΑ:

1. **type**: Ταξινόμησε αυστηρά σε ένα από τα εξής:
   - "subsidy": Οικονομική ενίσχυση, επιδόματα (π.χ. Market Pass, Fuel Pass), Vouchers, επιχορηγήσεις.
   - "job": Προσλήψεις, ΣΟΧ, ΣΜΕ, Μόνιμοι, Θέσεις εργασίας.
   - "program": Προγράμματα ΔΥΠΑ (π.χ. Κατάρτιση), Προγράμματα απασχόλησης, Κοινωφελής εργασία.
   - "contest": Διαγωνισμοί ΑΣΕΠ, Προσλήψεις μέσω γραπτού διαγωνισμού.
   - "news": ΜΟΝΟ για ΑΠΟΤΕΛΕΣΜΑΤΑ (Πίνακες, Διοριστέοι, Επιλαχόντες, Ενστάσεις) προκηρύξεων.
   - "irrelevant": Γενικές ειδήσεις, Δελτία Τύπου χωρίς άμεση ενέργεια/αίτηση, συνεντεύξεις, αναβαθμίσεις συστημάτων. ΕΠΙΣΗΣ: Αποφάσεις πληρωμής (π.χ. Ανάληψη Υποχρέωσης, Δέσμευση Πίστωσης, Εντολή Πληρωμής, Εκκαθάριση) που αφορούν ήδη υφιστάμενα επιδόματα ή μισθοδοσία.

2. **title**: Καθάρισε τον τίτλο. Αφαίρεσε "ΑΔΑ:", "ΑΔΑΜ:", κωδικούς αναρτήσεων. Κράτα τον περιεκτικό και στα ΕΛΛΗΝΙΚΑ.
   - ΣΗΜΑΝΤΙΚΟ: Αν ο τίτλος αφορά "Ανάληψη Υποχρέωσης" ή "Πληρωμή" ή "Εκκαθάριση", βάλε type: "irrelevant".

3. **summary**: Αναλυτική σύνοψη (max 400 χαρακτήρες).
   - Πρέπει να είναι κατανοητή και να απαντάει στο "Τι κερδίζω;".
   - Δομή: "Τι αφορά η ανακοίνωση. Ποιοι είναι οι ωφελούμενοι. Ποιο είναι το ποσό ή το όφελος αν αναφέρεται."
   - Για ΑΠΟΤΕΛΕΣΜΑΤΑ (news), η σύνοψη πρέπει να λέει καθαρά: "Ανακοινώθηκαν οι προσωρινοί/οριστικοί πίνακες για την προκήρυξη... Δείτε αν είστε στους επιτυχόντες."

4. **dates**:
   - "deadlineAt": Η ΤΕΛΙΚΗ ΗΜΕΡΟΜΗΝΙΑ ΛΗΞΗΣ (YYYY-MM-DD).
     - Αν υπάρχουν πολλές ημερομηνίες (π.χ. υποβολή ενστάσεων vs υποβολή αιτήσεων), διάλεξε αυτή που αφορά την ΚΥΡΙΑ ΕΝΕΡΓΕΙΑ.
     - Η χρήση, εξαργύρωση ή περίοδος ισχύος voucher ΔΕΝ είναι προθεσμία αίτησης και δεν επιτρέπεται να αποθηκευτεί ως deadlineAt.
     - Σε ανακοίνωση προσωρινών/οριστικών πινάκων ή αποτελεσμάτων βάλε deadlineAt: null, εκτός αν υπάρχει νέα, ξεχωριστή περίοδος κύριων αιτήσεων.
     - Αν λέει "εντός 10 ημερών από την ανάρτηση (δηλ. από ${today})", υπολόγισε την ημερομηνία.
     - Αν είναι "ανοικτό μέχρι εξαντλήσεως προϋπολογισμού", βάλε null.
     - ΠΡΟΣΟΧΗ: Αν το κείμενο αναφέρει λήξη "3 Μαρτίου" αλλά αφορά δράση παλαιότερου έτους (πριν το ${currentYear}), ΠΡΕΠΕΙ ΝΑ ΒΑΛΕΙΣ ΤΟ ΣΩΣΤΟ ΠΑΡΕΛΘΟΝΤΙΚΟ ΕΤΟΣ. ΜΗΝ υποθέτεις το τρέχον έτος (${currentYear}) αν πρόκειται για παλιά ανακοίνωση. Αν η ανακοίνωση είναι εμφανώς ληγμένη, βάλε τη λήξη στο παρελθόν.
   - "status":
     - "open": Οι αιτήσεις γίνονται ΤΩΡΑ.
     - "closed": Η ημερομηνία λήξης πέρασε (πριν από ${today}).
       Επίσης closed όταν έχουν αναρτηθεί προσωρινοί/οριστικοί πίνακες ή αποτελέσματα.
     - "upcoming": Η έναρξη είναι στο μέλλον.
     - "expected": Φήμες, αναμένεται ΚΥΑ, χωρίς ημερομηνίες ακόμα.

5. **tags**: Χρησιμοποίησε tags όπως: "unemployed", "student", "parent", "disabled", "business", "tourism", "farmers", "pensioners".
   - ΣΗΜΑΝΤΙΚΟ: Για αποτελέσματα/πίνακες, πρόσθεσε ΠΑΝΤΑ το tag "results".

6. **region**: Περιοχή αν αφορά συγκεκριμένο Δήμο ή Περιφέρεια.

OUTPUT JSON SCHEMA ONLY:
{
  "type": "subsidy" | "job" | "program" | "contest" | "news" | "irrelevant",
  "title": "string",
  "summary": "string",
  "deadlineAt": "YYYY-MM-DD" | null,
  "status": "open" | "closed" | "upcoming" | "expected" | "unknown",
  "tags": ["tag1", "tag2"],
  "confidence": number (0.0 to 1.0)
}`;

    if (googleApiKey) {
      try {
        const parsed = await callGoogleJson(
          "Text to analyze:\n" + content.substring(0, 3000),
          systemPrompt,
          0.1,
        );

        let type: OpportunityType = "manual";
        const aiType = parsed.type || "news";

        switch (aiType) {
          case "subsidy":
            type = "subsidy";
            break;
          case "job":
            type = "public_call";
            break;
          case "program":
            type = "program";
            break;
          case "contest":
            type = "asep_competition";
            break;
          case "news":
            type = "manual";
            break;
          case "irrelevant":
            type = "manual";
            break;
          default:
            type = "manual";
        }

        const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
        const mappedStatusFlags: any[] = [];
        if (tags.includes("student")) mappedStatusFlags.push("student");
        if (tags.includes("unemployed")) mappedStatusFlags.push("unemployed");
        if (tags.includes("parent")) mappedStatusFlags.push("parent");
        if (tags.includes("pensioners")) mappedStatusFlags.push("retired");

        const criteriaRulesJson: CriteriaRules = {
          statusFlags:
            mappedStatusFlags.length > 0
              ? { required: mappedStatusFlags }
              : undefined,
        };

        return {
          type,
          title: parsed.title || "Untitled",
          summary: parsed.summary || "",
          deadlineAt: parsed.deadlineAt ? new Date(parsed.deadlineAt) : undefined,
          tags,
          criteriaJson: {},
          criteriaRulesJson,
          confidence:
            typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
          status: parsed.status,
          isIrrelevant: aiType === "irrelevant",
        };
      } catch (googleError: any) {
        console.warn(
          `   ⚠️ Google AI extraction failed, falling back to Groq: ${googleError.message?.substring(0, 120) || "unknown error"}`,
        );
      }
    }

    if (!groqApiKey) {
      throw new Error("Google AI failed and GROQ_API_KEY is not configured");
    }

    const apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    const fallbackModels = [
      config.groq.model || "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
      "qwen/qwen3-32b",
      "moonshotai/kimi-k2-instruct",
    ];

    let lastError: any;

    for (const model of fallbackModels) {
      try {
        const requestBody: any = {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: "Text to analyze:\n" + content.substring(0, 3000),
            },
          ],
          temperature: 0.1,
        };

        const response = await axios.post(apiUrl, requestBody, {
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        });

        if (response.data?.choices?.[0]?.message?.content) {
          let rawText = response.data.choices[0].message.content;
          const jsonText = extractJsonBlock(rawText);
          const parsed = JSON.parse(jsonText);

          let type: OpportunityType = "manual";
          const aiType = parsed.type || "news";

      switch (aiType) {
        case "subsidy":
          type = "subsidy";
          break;
        case "job":
          type = "public_call";
          break;
        case "program":
          type = "program";
          break;
        case "contest":
          type = "asep_competition";
          break;
        case "news":
          type = "manual";
          break;
        case "irrelevant":
          type = "manual";
          break;
        default:
          type = "manual";
      }

      const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      const mappedStatusFlags: any[] = [];
      if (tags.includes("student")) mappedStatusFlags.push("student");
      if (tags.includes("unemployed")) mappedStatusFlags.push("unemployed");
      if (tags.includes("parent")) mappedStatusFlags.push("parent");
      if (tags.includes("pensioners")) mappedStatusFlags.push("retired");

      const criteriaRulesJson: CriteriaRules = {
        statusFlags:
          mappedStatusFlags.length > 0
            ? { required: mappedStatusFlags }
            : undefined,
      };

      return {
        type,
        title: parsed.title || "Untitled",
        summary: parsed.summary || "",
        deadlineAt: parsed.deadlineAt ? new Date(parsed.deadlineAt) : undefined,
        tags,
        criteriaJson: {},
        criteriaRulesJson,
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        status: parsed.status,
        isIrrelevant: aiType === "irrelevant",
      };
    }

        throw new Error("Empty response from Groq");
      } catch (error: any) {
        lastError = error;
        if (error.response && error.response.status === 429) {
          console.warn(`   ⚠️ Groq 429 Rate Limit hit for model ${model}. Switching to fallback...`);
          continue;
        }
        break;
      }
    }
    
    throw lastError || new Error("All Groq models failed");
  } catch (error: any) {
    console.error("❌ Groq Extractor failed:", error.message);
    return fallbackStubExtractor(content);
  }
}

function fallbackStubExtractor(content: string): ExtractedOpportunity {
  const title = content.split("\n")[0].substring(0, 100) || "Untitled";
  return {
    type: "manual",
    title,
    summary: content.substring(0, 200),
    tags: [],
    criteriaJson: {},
    criteriaRulesJson: {},
    confidence: 0.1,
    status: "unknown",
  };
}
