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

/** Safe parse page/limit for pagination - prevents NaN and invalid values */
export function safeParsePage(value: unknown): number {
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) || n < 1 ? 1 : Math.min(n, 1000);
}

/** Safe parse limit for pagination */
export function safeParseLimit(value: unknown, max = 100): number {
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) || n < 1 ? 20 : Math.min(n, max);
}

/** Whitelist for opportunity type - prevents NoSQL injection via query params */
export const VALID_OPPORTUNITY_TYPES = [
  "subsidy", "voucher", "program", "public_call", "asep_competition", "manual", "decision",
] as const;

export function isValidOpportunityType(value: unknown): value is string {
  return typeof value === "string" && VALID_OPPORTUNITY_TYPES.includes(value as any);
}

/** Whitelist for opportunity tab filter */
export const VALID_OPPORTUNITY_TABS = [
  "active", "results", "news", "archived", "upcoming", "current", "all",
] as const;

export function isValidOpportunityTab(value: unknown): value is string {
  return typeof value === "string" && VALID_OPPORTUNITY_TABS.includes(value as any);
}

/** Whitelist for feed tab */
export const VALID_FEED_TABS = ["news", "upcoming", "current", "all"] as const;

export function isValidFeedTab(value: unknown): value is string {
  return typeof value === "string" && VALID_FEED_TABS.includes(value as any);
}

/** Category tags for home chips & URL ?tag= (matches opportunity.tags) */
export const VALID_CATEGORY_TAGS = [
  "youth",
  "family",
  "unemployment",
  "housing",
  "disability",
] as const;

export function isValidCategoryTag(value: unknown): value is (typeof VALID_CATEGORY_TAGS)[number] {
  return typeof value === "string" && (VALID_CATEGORY_TAGS as readonly string[]).includes(value);
}

/** Whitelist for admin status filter */
export const VALID_ADMIN_STATUSES = ["draft", "published", "archived", "rejected"] as const;

export function isValidAdminStatus(value: unknown): value is string {
  return typeof value === "string" && VALID_ADMIN_STATUSES.includes(value as any);
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