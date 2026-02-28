import mongoose from 'mongoose';

/**
 * Validate MongoDB ObjectId format
 * Prevents NoSQL injection and invalid query errors
 */
export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return mongoose.Types.ObjectId.isValid(id) && 
         String(new mongoose.Types.ObjectId(id)) === id;
}

/**
 * Sanitize search query for MongoDB $text search
 * Escapes special regex characters to prevent errors
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  // Remove or escape special characters that could break MongoDB $text search
  // Keep basic text search functionality but prevent injection
  return query
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '') // Remove regex special chars
    .substring(0, 100); // Limit length to prevent DoS
}

/** Escape HTML to prevent XSS when inserting user content into HTML (e.g. email body) */
export function escapeHtml(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}