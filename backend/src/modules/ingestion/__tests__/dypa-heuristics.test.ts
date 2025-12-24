/**
 * Unit tests for dypa.gov.gr heuristics
 */

import { describe, it, expect } from "@jest/globals";

// Mock the heuristics function (extract logic from ingestion.service.ts)
function isBlockedByDypaHeuristics(url: string): { blocked: boolean; reason?: string } {
  try {
    const u = new URL(url);
    const hostname = u.hostname.toLowerCase();
    const pathname = u.pathname.toLowerCase();
    
    if (!hostname.includes("dypa.gov.gr")) {
      return { blocked: false }; // Not dypa.gov.gr, skip
    }
    
    const segments = pathname.split("/").filter(Boolean);
    
    // Block root, language paths, search, node paths, hash-only, query-only
    if (
      pathname === "/" || 
      pathname === "" || 
      pathname === "/#" || 
      pathname === "/el" || 
      pathname === "/en" ||
      pathname === "/search" ||
      pathname.startsWith("/search?") ||
      pathname.startsWith("/node/") ||
      (pathname === "/#" && !u.search) ||
      (u.search && !pathname || pathname === "/")
    ) {
      return { blocked: true, reason: `dypa.gov.gr: root/menu/search/node path` };
    }
    
    // Block known hub pages without content (denylist)
    const hubPagesDenylist = [
      "arxiki", "home", "anakoinoseis", "nea", "news", "search", 
      "el", "en", "menu", "sitemap", "contact", "epikoinonia"
    ];
    if (segments.length === 1 && hubPagesDenylist.includes(segments[0].toLowerCase())) {
      return { blocked: true, reason: `dypa.gov.gr: hub page "${segments[0]}"` };
    }
    
    // Allow 1-segment paths that look like articles
    if (segments.length === 1) {
      const slug = segments[0];
      const slugLength = slug.length;
      const hasDashes = slug.includes("-");
      
      // Allow if: slug length >= 15 AND contains dashes (looks like article)
      if (slugLength >= 15 && hasDashes) {
        return { blocked: false }; // Allow valid article slug
      }
      
      // Also allow shorter slugs if they contain dashes and are not in denylist
      if (hasDashes && slugLength >= 10 && !hubPagesDenylist.includes(slug.toLowerCase())) {
        return { blocked: false }; // Allow shorter article-like slugs
      }
    }
    
    // Allow multi-segment paths for active employment policies and other valid paths
    if (pathname.startsWith("/active-employment-policies/")) {
      return { blocked: false }; // Allow active employment policies paths
    }
    
    // Block 1-segment paths that don't meet criteria (too short, no dashes, in denylist)
    if (segments.length === 1) {
      return { blocked: true, reason: `dypa.gov.gr: path too short (1 segment, length ${segments[0].length}, no dashes or too short)` };
    }
    
    // Allow multi-segment paths by default (they're likely valid)
    return { blocked: false };
  } catch {
    return { blocked: true, reason: "Invalid URL" };
  }
}

describe("dypa.gov.gr heuristics", () => {
  describe("should ALLOW legitimate article URLs", () => {
    it("should allow /diefkriniseis-tis-dypa-skhetika-me-... (long slug with dashes)", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/diefkriniseis-tis-dypa-skhetika-me-");
      expect(result.blocked).toBe(false);
    });

    it("should allow /anastoli-leitoyrghias-... (long slug with dashes)", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/anastoli-leitoyrghias-");
      expect(result.blocked).toBe(false);
    });

    it("should allow /proghrammata-anoikhta (valid program page)", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/proghrammata-anoikhta");
      expect(result.blocked).toBe(false);
    });

    it("should allow /active-employment-policies/... (multi-segment)", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/active-employment-policies/something");
      expect(result.blocked).toBe(false);
    });

    it("should allow shorter slugs with dashes (>= 10 chars)", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/nea-anakoinwseis-2025");
      expect(result.blocked).toBe(false);
    });
  });

  describe("should BLOCK navigation/hub pages", () => {
    it("should block /el", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/el");
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("root/menu/search/node");
    });

    it("should block /", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/");
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("root/menu/search/node");
    });

    it("should block /search?q=...", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/search?q=test");
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("root/menu/search/node");
    });

    it("should block /search", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/search");
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("root/menu/search/node");
    });

    it("should block /node/123", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/node/123");
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("root/menu/search/node");
    });

    it("should block hub pages from denylist: /anakoinoseis", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/anakoinoseis");
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("hub page");
    });

    it("should block hub pages from denylist: /nea", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/nea");
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("hub page");
    });

    it("should block hub pages from denylist: /arxiki", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/arxiki");
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("hub page");
    });
  });

  describe("edge cases", () => {
    it("should handle prosvasis.dypa.gov.gr subdomain", () => {
      const result = isBlockedByDypaHeuristics("https://prosvasis.dypa.gov.gr/some-article-slug-here");
      expect(result.blocked).toBe(false);
    });

    it("should block very short slugs without dashes", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/test");
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("path too short");
    });

    it("should allow multi-segment paths", () => {
      const result = isBlockedByDypaHeuristics("https://www.dypa.gov.gr/category/article-name");
      expect(result.blocked).toBe(false);
    });
  });
});

