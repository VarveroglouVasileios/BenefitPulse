import axios from 'axios';
// Workaround for pdf-parse CommonJS export
const pdfParse = require('pdf-parse');

/**
 * Helper to interact with the Diavgeia ecosystem and extract text from PDFs.
 */

// We use the direct URL pattern for Diavgeia documents
export async function extractDiavgeiaText(ada: string): Promise<string> {
  const pdfUrl = `https://diavgeia.gov.gr/doc/${ada}`;

  try {
    // 1. Download the PDF file as a buffer
    // Diavgeia might block standard axios agents, so we use browser headers
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/pdf',
        'Referer': 'https://diavgeia.gov.gr/',
      },
      timeout: 30000, // 30 seconds
    });

    const buffer = Buffer.from(response.data);

    // 2. Parse the PDF buffer to text
    // pdf.js (bundled in pdf-parse) logs TrueType noise via util.warn → console.log('Warning: …'),
    // not console.warn — see pdf.worker.js: warn('TT: undefined function: ' + j).
    const originalLog = console.log;
    const originalWarn = console.warn;
    const isPdfJsNoise = (first: unknown): boolean => {
      const s = first?.toString() ?? "";
      return s.includes("Warning: TT:") || s.includes("TT: undefined function");
    };
    console.log = (...args: unknown[]) => {
      if (args.length && isPdfJsNoise(args[0])) return;
      originalLog.apply(console, args as []);
    };
    console.warn = (...args: unknown[]) => {
      if (args.length && isPdfJsNoise(args[0])) return;
      originalWarn.apply(console, args as []);
    };

    let data;
    try {
      data = await pdfParse(buffer);
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
    }
    
    // 3. Clean up the extracted text
    let text = data.text;
    
    // Simple cleanup for PDF artifacts
    text = text.replace(/\n\s*\n/g, '\n'); // Remove multiple empty lines
    text = text.replace(/(\r\n|\n|\r)/gm, " "); // Replace all newlines with spaces for easier AI parsing
    text = text.replace(/\s+/g, ' ').trim(); // Remove multiple spaces
    
    // SAFETY GUARD: Truncate to first 12,000 characters (approx 3000-4000 tokens).
    // Government PDFs can be 50+ pages. The core info (dates, eligibility) 
    // is almost always in the first few pages (the core decision).
    // This prevents hitting the Groq token limits and 429/400 errors.
    if (text.length > 12000) {
      text = text.substring(0, 12000) + "... [TRUNCATED FOR AI SAFETY]";
    }

    return text;
  } catch (error: any) {
    console.error(`❌ Failed to extract PDF for ADA ${ada} from ${pdfUrl}:`, error.message);
    return ""; // Return empty string on failure instead of throwing, so ingestion can gracefully degrade
  }
}
export async function searchDiavgeia(queryText: string): Promise<{ text: string, url: string } | null> {
  const query = encodeURIComponent(queryText);
  const url = `https://diavgeia.gov.gr/luminapi/api/search?q=${query}&sort=recent&size=1`;
  const maxAttempts = 3;
  const baseDelayMs = 1500;

  const isTransientError = (err: any): boolean => {
    const status = err?.response?.status;
    if (status === 429 || status === 503) return true;
    const code = err?.code || "";
    if (code === "ECONNABORTED" || code === "ETIMEDOUT" || code === "ENOTFOUND") return true;
    const message = (err?.message || "").toLowerCase();
    return message.includes("timeout") || message.includes("network");
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        timeout: 30000,
      });
      
      if (response.data && response.data.decisions && response.data.decisions.length > 0) {
        const ada = response.data.decisions[0].ada;
        const pdfText = await extractDiavgeiaText(ada);
        return { text: pdfText, url: `https://diavgeia.gov.gr/doc/${ada}` };
      }
      return null;
    } catch (err: any) {
      const transient = isTransientError(err);
      const shouldRetry = transient && attempt < maxAttempts;

      if (shouldRetry) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          `⚠️ Diavgeia transient error for "${queryText}" (attempt ${attempt}/${maxAttempts}): ${err.message} — retrying in ${delayMs}ms`,
        );
        await sleep(delayMs);
        continue;
      }

      console.error(`⚠️ Diavgeia search failed for "${queryText}":`, err.message);
      return null;
    }
  }
  return null;
}

export async function crossReferenceAsepWithDiavgeia(title: string): Promise<{ text: string, url: string } | null> {
  const asepMatch = title.match(/(\d+[ΚΓΒΠΔ]\/\d{4})/i);
  if (!asepMatch) return null;

  const contestCode = asepMatch[1];
  return searchDiavgeia(`subject:"ΠΡΟΚΗΡΥΞΗ ${contestCode}"`);
}
