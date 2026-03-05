export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function generateHash(content: string): string {
  // Simple hash for deduplication
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}
