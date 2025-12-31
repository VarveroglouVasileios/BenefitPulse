export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function generateHash(content: string): string {
  // Simple hash for deduplication
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Remove title string from the start of summary if it matches exactly
 * This fixes data quality issues where the AI repeats the title in the summary
 * 
 * @param title - The title string
 * @param summary - The summary string that may contain the title
 * @returns Cleaned summary with title removed if it was repeated at the start
 */
export function removeTitleFromSummary(title: string, summary: string): string {
  if (!title || !summary) {
    return summary;
  }

  // Normalize both strings for comparison (trim, lowercase, remove extra spaces)
  const normalizedTitle = title.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedSummary = summary.trim().toLowerCase().replace(/\s+/g, ' ');

  // Check if summary starts with the title (exact match)
  if (normalizedSummary.startsWith(normalizedTitle)) {
    // Remove the title from the start of the summary
    const cleaned = summary.substring(title.length).trim();
    
    // If what remains is empty or just punctuation/spaces, return a generic message
    if (!cleaned || cleaned.length < 10) {
      return summary.substring(0, Math.min(200, summary.length)); // Return first 200 chars as fallback
    }
    
    // Remove leading punctuation/spaces that might remain
    return cleaned.replace(/^[.,;:\s\-–—]+/g, '').trim();
  }

  // Check if summary contains the title repeated multiple times (e.g., "Title Title Title")
  const titleWords = normalizedTitle.split(' ');
  if (titleWords.length > 0) {
    // Check if first few words of summary match title words repeated
    const summaryWords = normalizedSummary.split(' ');
    const titleWordCount = titleWords.length;
    
    // Check if first N words match the title (where N is title length)
    if (summaryWords.length >= titleWordCount) {
      const firstWords = summaryWords.slice(0, titleWordCount).join(' ');
      if (firstWords === normalizedTitle) {
        // Check if it's repeated (next words also match)
        if (summaryWords.length >= titleWordCount * 2) {
          const secondWords = summaryWords.slice(titleWordCount, titleWordCount * 2).join(' ');
          if (secondWords === normalizedTitle) {
            // Title is repeated, remove first occurrence
            const cleaned = summaryWords.slice(titleWordCount).join(' ').trim();
            return cleaned.length > 0 ? cleaned : summary.substring(0, Math.min(200, summary.length));
          }
        }
      }
    }
  }

  return summary;
}
