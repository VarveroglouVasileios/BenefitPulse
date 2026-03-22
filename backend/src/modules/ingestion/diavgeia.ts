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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/pdf',
      },
      timeout: 30000, // 30 seconds
    });

    const buffer = Buffer.from(response.data);

    // 2. Parse the PDF buffer to text
    const data = await pdfParse(buffer);
    
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
