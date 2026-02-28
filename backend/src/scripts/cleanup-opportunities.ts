/**
 * Cleanup script for opportunities database
 * 
 * This script:
 * - Identifies records with broken URLs (404)
 * - Fixes invalid status or missing dates
 * - Merges duplicates (same canonicalUrl or normalizedTitle+source+date)
 * - Canonicalizes URLs (remove trailing slash, tracking params, decode)
 * - Re-runs date extraction from stored content
 * - Recomputes status with new rules
 * - Soft-deletes invalid items (menus, "Αρχική...", "EN...", etc.)
 */

import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";
import { RawItem } from "../models/rawItem.model";
import { cleanAndValidate } from "../modules/ingestion/cleaner";
import axios from "axios";
import { checkSourceHealth } from "../modules/ingestion/source-health-check";

interface CleanupStats {
  totalOpportunities: number;
  brokenUrls: number;
  invalidStatus: number;
  duplicatesFound: number;
  duplicatesMerged: number;
  recomputedStatus: number;
  softDeleted: number;
  canonicalizedUrls: number;
}

/**
 * Canonicalize URL: remove trailing slash, tracking params, decode
 */
function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove trailing slash (except root)
    let pathname = u.pathname;
    if (pathname.endsWith("/") && pathname !== "/") {
      pathname = pathname.slice(0, -1);
    }
    
    // Remove tracking params
    const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "fbclid", "gclid"];
    trackingParams.forEach(param => u.searchParams.delete(param));
    
    // Remove hash
    u.hash = "";
    
    return `${u.protocol}//${u.hostname}${pathname}${u.search}`;
  } catch {
    return url;
  }
}

/**
 * Normalize title for duplicate detection
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/**
 * Check if opportunity is garbage (menu, navigation, etc.)
 */
function isGarbage(title: string, summary: string, url: string): boolean {
  const lowerTitle = title.toLowerCase();
  const lowerSummary = summary.toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  const garbageKeywords = [
    "αρχική",
    "archiki",
    "home",
    "welcome",
    "en ",
    " english",
    "menu",
    "μενού",
    "navigation",
    "footer",
    "header",
    "cookies",
    "πολιτική",
    "privacy",
    "terms",
    "faq",
    "συχνές",
    "contact",
    "επικοινωνία",
  ];
  
  // Check if title is very short or generic
  if (title.length < 10) return true;
  
  // Check for "test" in title (test/demo content)
  if (/\btest\b/i.test(title)) return true;
  
  // Check for portal/app info pages
  const portalKeywords = [
    "mydypaapp", "mydypalive", "mydypaραντεβού", "jobmatch",
    "δυπα digital", "dypa digital",
    "θέματα τ.οεκ", "θεματα τ.οεκ", "θέματα τ. οεκ",
    "θέματα οεκ", "θεματα οεκ",
  ];
  for (const pk of portalKeywords) {
    if (lowerTitle.includes(pk) || lowerSummary.substring(0, 300).includes(pk)) {
      return true;
    }
  }
  
  // Check for garbage keywords
  for (const keyword of garbageKeywords) {
    if (lowerTitle === keyword || 
        lowerTitle.startsWith(keyword + " ") ||
        lowerUrl.includes(keyword)) {
      return true;
    }
  }
  
  // Check if URL is root or very short path
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split("/").filter(Boolean);
    if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0].length < 3)) {
      return true;
    }
  } catch {
    // Invalid URL - might be garbage
    return true;
  }
  
  return false;
}

/**
 * Clean summary text: fix concatenated words, remove "test", normalize
 */
function fixSummaryText(summary: string, title: string): string {
  let cleaned = summary;
  
  // Remove "test" artifacts
  cleaned = cleaned.replace(/\btest\b/gi, "").trim();
  
  // Fix concatenated words: insert space before uppercase Greek/Latin letter
  // that follows a lowercase letter (e.g. "ΝιγρίταςΦεβ" → "Νιγρίτας Φεβ")
  cleaned = cleaned.replace(/([α-ωά-ώa-z])([Α-ΩΆ-ΏA-Z])/g, "$1 $2");
  
  // Fix date glued to text (e.g. "2026Κατάρτιση" → "2026 Κατάρτιση")
  cleaned = cleaned.replace(/(\d{4})([Α-ΩΆ-Ώα-ωά-ώA-Za-z])/g, "$1 $2");
  
  // Remove inline date fragments ("Φεβ 16, 2026" stuck inside sentences)
  cleaned = cleaned.replace(/\s*(?:Ιαν|Φεβ|Μαρ|Απρ|Μαι|Ιουν|Ιουλ|Αυγ|Σεπ|Οκτ|Νοε|Δεκ)\s+\d{1,2},?\s*\d{4}\s*/gi, " ");
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  return cleaned;
}

/**
 * Clean title text: remove "test" artifacts
 */
function fixTitleText(title: string): string {
  let cleaned = title;
  cleaned = cleaned.replace(/\btest\b/gi, "").trim();
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

export async function cleanupOpportunities(): Promise<CleanupStats> {
  await connectMongo();
  
  const stats: CleanupStats = {
    totalOpportunities: 0,
    brokenUrls: 0,
    invalidStatus: 0,
    duplicatesFound: 0,
    duplicatesMerged: 0,
    recomputedStatus: 0,
    softDeleted: 0,
    canonicalizedUrls: 0,
  };
  
  console.log("🧹 Starting opportunity cleanup...\n");
  
  // Get all non-deleted opportunities
  const opportunities = await Opportunity.find({ deletedAt: null }).sort({ createdAt: -1 });
  stats.totalOpportunities = opportunities.length;
  
  console.log(`📊 Found ${stats.totalOpportunities} opportunities to check\n`);
  
  // Step 1: Canonicalize URLs and check for broken links
  console.log("Step 1: Canonicalizing URLs and checking for broken links...");
  const urlMap = new Map<string, string>(); // old -> canonical
  
  for (const opp of opportunities) {
    const canonicalUrl = canonicalizeUrl(opp.officialUrl);
    if (canonicalUrl !== opp.officialUrl) {
      urlMap.set(opp.officialUrl, canonicalUrl);
      stats.canonicalizedUrls++;
      
      // Update URL
      opp.officialUrl = canonicalUrl;
      await opp.save();
    }
    
    // Check if URL is broken (only for published opportunities)
    if (opp.status === "published") {
      try {
        const healthCheck = await checkSourceHealth(canonicalUrl, "html_listing");
        if (!healthCheck.healthy && healthCheck.statusCode === 404) {
          stats.brokenUrls++;
          console.log(`  ⚠️  Broken URL: ${opp.title.substring(0, 50)}... (${canonicalUrl})`);
          
          // Archive broken URLs
          opp.status = "archived";
          await opp.save();
        }
      } catch {
        // Skip health check errors
      }
    }
  }
  
  console.log(`  ✅ Canonicalized ${stats.canonicalizedUrls} URLs`);
  console.log(`  ⚠️  Found ${stats.brokenUrls} broken URLs (archived)\n`);
  
  // Step 2: Find and merge duplicates
  console.log("Step 2: Finding duplicates...");
  const duplicateGroups = new Map<string, typeof opportunities>();
  
  for (const opp of opportunities) {
    const canonicalUrl = canonicalizeUrl(opp.officialUrl);
    const normalizedTitle = normalizeTitle(opp.title);
    const key = `${canonicalUrl}|${normalizedTitle}|${opp.source}`;
    
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    duplicateGroups.get(key)!.push(opp);
  }
  
  for (const [key, group] of duplicateGroups) {
    if (group.length > 1) {
      stats.duplicatesFound += group.length;
      
      // Sort by confidence, then by createdAt (keep the best one)
      group.sort((a, b) => {
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      const keep = group[0];
      const toMerge = group.slice(1);
      
      // Merge data from duplicates into keep
      for (const dup of toMerge) {
        // Merge tags
        const mergedTags = [...new Set([...keep.tags, ...dup.tags])];
        keep.tags = mergedTags;
        
        // Keep better summary if available
        if (dup.summary.length > keep.summary.length) {
          keep.summary = dup.summary;
        }
        
        // Keep better dates if available
        if (!keep.deadlineAt && dup.deadlineAt) {
          keep.deadlineAt = dup.deadlineAt;
        }
        if (!keep.startAt && dup.startAt) {
          keep.startAt = dup.startAt;
        }
        if (!keep.applicationStartAt && dup.applicationStartAt) {
          keep.applicationStartAt = dup.applicationStartAt;
        }
        if (!keep.applicationEndAt && dup.applicationEndAt) {
          keep.applicationEndAt = dup.applicationEndAt;
        }
        
        // Update keep
        keep.updatedAt = new Date();
        await keep.save();
        
        // Soft delete duplicate
        dup.deletedAt = new Date();
        await dup.save();
        
        stats.duplicatesMerged++;
      }
      
      console.log(`  🔀 Merged ${toMerge.length} duplicates of: ${keep.title.substring(0, 50)}...`);
    }
  }
  
  console.log(`  ✅ Found ${stats.duplicatesFound} duplicates, merged ${stats.duplicatesMerged}\n`);
  
  // Step 3: Recompute status for opportunities with missing/invalid dates
  console.log("Step 3: Recomputing status for opportunities...");
  const now = new Date();
  
  for (const opp of opportunities) {
    if (opp.deletedAt) continue; // Skip already deleted
    
    let needsRecompute = false;
    
    // Check if status is invalid (e.g., published but expired)
    if (opp.status === "published") {
      const applicationStatus = (opp.criteriaJson as any)?.applicationStatus;
      const title = (opp.title || "").toLowerCase();
      const isPassWithYear = /pass.*20\d{2}|20\d{2}.*pass/i.test(title);
      
      if (opp.applicationEndAt && opp.applicationEndAt < now) {
        // Expired but still published
        needsRecompute = true;
        stats.invalidStatus++;
      } else if (opp.deadlineAt && opp.deadlineAt < now) {
        // Expired deadline but still published
        needsRecompute = true;
        stats.invalidStatus++;
      } else if (opp.applicationStartAt && opp.applicationStartAt > now && applicationStatus !== "upcoming") {
        // Upcoming but not marked as such
        needsRecompute = true;
        stats.invalidStatus++;
      } else if (isPassWithYear && (applicationStatus === "unknown" || applicationStatus === "news")) {
        // Pass items with year and unknown/news status should be archived
        needsRecompute = true;
        stats.invalidStatus++;
      } else if (applicationStatus === "expired" || applicationStatus === "closed") {
        // Already marked as expired/closed but still published
        needsRecompute = true;
        stats.invalidStatus++;
      } else if (applicationStatus === "unknown" && (opp as any).kind !== "benefit") {
        // Unknown status for non-benefit items should not be published
        needsRecompute = true;
        stats.invalidStatus++;
      }
    }
    
    // Check if dates are missing but we have content
    if (!opp.applicationStartAt && !opp.applicationEndAt && opp.status === "published") {
      const applicationStatus = (opp.criteriaJson as any)?.applicationStatus;
      const kind = (opp as any).kind;
      
      // If unknown status and not a benefit, archive it
      if (applicationStatus === "unknown" && kind !== "benefit") {
        needsRecompute = true;
        stats.invalidStatus++;
      } else {
        // Try to recompute from stored data
        const rawItem = await RawItem.findOne({ url: opp.officialUrl }).sort({ createdAt: -1 });
        if (rawItem && rawItem.content) {
          needsRecompute = true;
        }
      }
    }
    
    if (needsRecompute) {
      // Re-run cleaner if we have raw content
      const rawItem = await RawItem.findOne({ url: opp.officialUrl }).sort({ createdAt: -1 });
      if (rawItem && rawItem.content) {
        try {
          const cleaned = cleanAndValidate({
            nowIso: now.toISOString(),
            source: opp.source,
            sourceUrl: opp.officialUrl,
            itemUrl: opp.officialUrl,
            rawTitle: rawItem.title || opp.title,
            rawContent: rawItem.content,
            rawFetchedAtIso: rawItem.createdAt.toISOString(),
            rawHtmlHints: rawItem.metadata || {},
          });
          
          // Update opportunity with recomputed data
          // Map rejected to archived (Opportunity model doesn't support rejected)
          const mappedStatus = cleaned.status === "rejected" ? "archived" : cleaned.status;
          opp.status = mappedStatus;
          if (cleaned.applicationStartAt) {
            opp.applicationStartAt = new Date(cleaned.applicationStartAt);
          }
          if (cleaned.applicationEndAt) {
            opp.applicationEndAt = new Date(cleaned.applicationEndAt);
          }
          if (cleaned.announcedAt) {
            opp.announcedAt = new Date(cleaned.announcedAt);
          }
          // Update criteriaJson with applicationStatus
          const currentCriteriaJson = opp.criteriaJson || {};
          opp.criteriaJson = {
            ...currentCriteriaJson,
            applicationStatus: cleaned.applicationStatus,
          };
          
          // If results status, keep as published (for Results tab)
          if (cleaned.applicationStatus === "results") {
            opp.status = "published"; // Results can be published (shown in Results tab)
          }
          
          opp.updatedAt = new Date();
          await opp.save();
          
          stats.recomputedStatus++;
          console.log(`  ✅ Recomputed: ${opp.title.substring(0, 60)}... → ${cleaned.applicationStatus} (${opp.status})`);
        } catch (error) {
          console.error(`  ❌ Error recomputing ${opp.title}:`, error);
        }
      } else {
        // No raw content, but we can still fix expired/unknown items directly
        const title = (opp.title || "").toLowerCase();
        const isPassWithYear = /pass.*20\d{2}|20\d{2}.*pass/i.test(title);
        const applicationStatus = (opp.criteriaJson as any)?.applicationStatus;
        
        let shouldArchive = false;
        let newApplicationStatus = applicationStatus;
        
        // STRICT: Check Pass items with year in title
        if (isPassWithYear) {
          const yearMatch = opp.title.match(/\b(20\d{2})\b/i);
          if (yearMatch) {
            const titleYear = parseInt(yearMatch[1], 10);
            const currentYear = now.getFullYear();
            
            // Rule 1: Year in title is before current year → expired
            if (titleYear < currentYear) {
              shouldArchive = true;
              newApplicationStatus = "expired";
              console.log(`  ✅ Archiving Pass ${titleYear} (year expired): ${opp.title.substring(0, 60)}...`);
            }
            // Rule 2: Year is current year but no dates and we're past mid-year → expired
            else if (titleYear === currentYear && !opp.deadlineAt && !opp.applicationEndAt && !opp.applicationStartAt) {
              const currentMonth = now.getMonth(); // 0-11
              if (currentMonth >= 6) { // July onwards
                shouldArchive = true;
                newApplicationStatus = "expired";
                console.log(`  ✅ Archiving Pass ${titleYear} (no dates, past mid-year): ${opp.title.substring(0, 60)}...`);
              }
            }
            // Rule 3: Pass with year and unknown/news status → expired/news
            else if (applicationStatus === "unknown" || applicationStatus === "news") {
              shouldArchive = true;
              newApplicationStatus = titleYear < currentYear ? "expired" : "news";
              console.log(`  ✅ Archiving Pass ${titleYear} with ${applicationStatus} status: ${opp.title.substring(0, 60)}...`);
            }
          }
        }
        
        // Archive if expired deadline
        if (!shouldArchive && opp.applicationEndAt && opp.applicationEndAt < now) {
          shouldArchive = true;
          newApplicationStatus = "expired";
          console.log(`  ✅ Archiving expired opportunity (applicationEndAt < now): ${opp.title.substring(0, 60)}...`);
        } else if (!shouldArchive && opp.deadlineAt && opp.deadlineAt < now) {
          shouldArchive = true;
          newApplicationStatus = "expired";
          console.log(`  ✅ Archiving expired opportunity (deadlineAt < now): ${opp.title.substring(0, 60)}...`);
        } else if (!shouldArchive && applicationStatus === "unknown" && opp.status === "published") {
          // Unknown status items should not be published (unless they're stable benefits)
          // Archive if not a benefit or if it's a program/voucher
          const kind = (opp as any).kind;
          if (kind !== "benefit") {
            shouldArchive = true;
            newApplicationStatus = "unknown";
            console.log(`  ✅ Archiving unknown status ${kind}: ${opp.title.substring(0, 60)}...`);
          }
        }
        
        if (shouldArchive) {
          opp.status = "archived";
          opp.criteriaJson = {
            ...(opp.criteriaJson || {}),
            applicationStatus: newApplicationStatus,
          };
          opp.updatedAt = new Date();
          await opp.save();
          stats.recomputedStatus++;
        }
      }
    }
  }
  
  console.log(`  ✅ Recomputed status for ${stats.recomputedStatus} opportunities\n`);
  
  // Step 4: Clean titles and summaries (fix concatenated text, remove "test", etc.)
  console.log("Step 4: Cleaning titles and summaries...");
  let textFixed = 0;
  for (const opp of opportunities) {
    if (opp.deletedAt) continue;
    
    const fixedTitle = fixTitleText(opp.title);
    const fixedSummary = fixSummaryText(opp.summary, opp.title);
    
    let changed = false;
    if (fixedTitle !== opp.title) {
      opp.title = fixedTitle;
      changed = true;
    }
    if (fixedSummary !== opp.summary) {
      opp.summary = fixedSummary;
      changed = true;
    }
    
    if (changed) {
      opp.updatedAt = new Date();
      await opp.save();
      textFixed++;
      console.log(`  ✏️  Fixed text: ${opp.title.substring(0, 60)}...`);
    }
  }
  console.log(`  ✅ Fixed text in ${textFixed} opportunities\n`);
  
  // Step 5: Force-archive published items with closed/expired applicationStatus
  console.log("Step 5: Archiving published items with closed/expired status...");
  let forceArchived = 0;
  for (const opp of opportunities) {
    if (opp.deletedAt) continue;
    if (opp.status !== "published") continue;
    
    const appStatus = opp.applicationStatus || (opp.criteriaJson as any)?.applicationStatus;
    if (appStatus === "closed" || appStatus === "expired") {
      opp.status = "archived";
      opp.updatedAt = new Date();
      await opp.save();
      forceArchived++;
      console.log(`  📦 Archived (${appStatus}): ${opp.title.substring(0, 60)}...`);
    }
  }
  console.log(`  ✅ Force-archived ${forceArchived} closed/expired items\n`);
  
  // Step 6: Soft delete garbage
  console.log("Step 6: Identifying garbage items...");
  for (const opp of opportunities) {
    if (opp.deletedAt) continue;
    
    if (isGarbage(opp.title, opp.summary, opp.officialUrl)) {
      opp.deletedAt = new Date();
      await opp.save();
      stats.softDeleted++;
      console.log(`  🗑️  Deleted garbage: ${opp.title.substring(0, 50)}...`);
    }
  }
  
  console.log(`  ✅ Soft deleted ${stats.softDeleted} garbage items\n`);
  
  // Summary
  console.log("=".repeat(60));
  console.log("📊 CLEANUP SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total opportunities checked: ${stats.totalOpportunities}`);
  console.log(`Canonicalized URLs: ${stats.canonicalizedUrls}`);
  console.log(`Broken URLs (archived): ${stats.brokenUrls}`);
  console.log(`Invalid status (fixed): ${stats.invalidStatus}`);
  console.log(`Duplicates found: ${stats.duplicatesFound}`);
  console.log(`Duplicates merged: ${stats.duplicatesMerged}`);
  console.log(`Status recomputed: ${stats.recomputedStatus}`);
  console.log(`Garbage deleted: ${stats.softDeleted}`);
  console.log("=".repeat(60));
  
  return stats;
}

// Run if called directly
if (require.main === module) {
  cleanupOpportunities()
    .then(() => {
      console.log("\n✅ Cleanup completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Cleanup failed:", error);
      process.exit(1);
    });
}

