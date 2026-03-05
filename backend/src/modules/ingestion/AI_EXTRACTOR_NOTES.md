# AI Extractor - Implementation Notes

## Current Implementation (Stub)

Το `extractor.ts` είναι ένα **stub** που επιστρέφει mock data με βασική keyword extraction.

### Τι κάνει τώρα:

1. **Type Detection**: Αναγνώριση τύπου από keywords (επίδομα, voucher, κλπ.)
2. **Tag Extraction**: Αναγνώριση tags από keywords (student, unemployed, κλπ.)
3. **Region Extraction**: Αναγνώριση περιοχής από keywords
4. **Mock Criteria Rules**: Βασικά criteria rules based on tags

### Confidence Level

Το stub επιστρέφει `confidence: 0.5` (50%) γιατί δεν είναι AI-powered.

## Αντικατάσταση με Πραγματικό LLM

### Option 1: OpenAI GPT-4 / Claude

```typescript
import axios from "axios";
import { config } from "../../config/env";

export async function extractOpportunity(
  content: string
): Promise<ExtractedOpportunity> {
  const prompt = `
Εξαγάγετε τα ακόλουθα από το ελληνικό κείμενο:
- Τύπος (subsidy/voucher/program/public_call/asep_competition)
- Τίτλος
- Περίληψη (500 χαρακτήρες)
- Προθεσμία (αν υπάρχει)
- Tags
- Περιοχή
- Κριτήρια (ageRange, incomeRange, statusFlags, region, educationLevel)

Κείμενο:
${content}

Επιστρέψτε JSON μόνο.
`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    },
    {
      headers: {
        Authorization: `Bearer ${config.aiExtractor.apiKey}`,
      },
    }
  );

  const extracted = JSON.parse(response.data.choices[0].message.content);

  // Validate with Zod schema
  return validateAndTransform(extracted);
}
```

### Option 2: Custom ML Model

Αν έχετε custom model:

```typescript
export async function extractOpportunity(
  content: string
): Promise<ExtractedOpportunity> {
  const response = await axios.post(
    config.aiExtractor.url,
    { text: content },
    {
      headers: {
        Authorization: `Bearer ${config.aiExtractor.apiKey}`,
      },
    }
  );

  // Validate response
  return opportunitySchema.parse(response.data);
}
```

### Option 3: Hybrid Approach

1. **LLM για extraction** (title, summary, type, tags)
2. **Rules engine για criteria** (deterministic matching)

## Validation

Χρησιμοποιήστε Zod schema για validation:

```typescript
import { z } from 'zod';

const extractedOpportunitySchema = z.object({
  type: z.enum(['subsidy', 'voucher', 'program', 'public_call', 'asep_competition', 'manual']),
  title: z.string().min(1),
  summary: z.string().min(1).max(1000),
  deadlineAt: z.string().datetime().optional().transform(s => s ? new Date(s) : undefined),
  tags: z.array(z.string()),
  region: z.enum([...]).optional(),
  criteriaJson: z.record(z.any()),
  criteriaRulesJson: z.any(), // CriteriaRules type
  confidence: z.number().min(0).max(1),
});

export async function extractOpportunity(content: string): Promise<ExtractedOpportunity> {
  // ... LLM call ...
  return extractedOpportunitySchema.parse(rawResponse);
}
```

## Error Handling

```typescript
export async function extractOpportunity(
  content: string
): Promise<ExtractedOpportunity> {
  try {
    // LLM call
    return await callLLM(content);
  } catch (error) {
    console.error("AI Extractor error:", error);
    // Fallback to stub
    return fallbackStub(content);
  }
}
```

## Cost Optimization

- Cache extractions για duplicate content
- Batch processing για multiple items
- Use cheaper models για simple extractions (GPT-3.5 vs GPT-4)

## Testing

Δημιουργήστε test cases με real Greek government announcements:

```typescript
describe("AI Extractor", () => {
  it("should extract subsidy correctly", async () => {
    const text = "...real Greek announcement text...";
    const result = await extractOpportunity(text);
    expect(result.type).toBe("subsidy");
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
```

## Environment Variables

```env
AI_EXTRACTOR_URL=https://api.openai.com/v1/chat/completions
AI_EXTRACTOR_API_KEY=sk-...
```

ή

```env
AI_EXTRACTOR_URL=http://your-ml-service.com/extract
AI_EXTRACTOR_API_KEY=your-api-key
```
