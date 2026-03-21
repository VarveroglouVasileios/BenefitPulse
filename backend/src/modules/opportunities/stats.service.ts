import { Opportunity } from "../../models/opportunity.model";
import { Source } from "../../models/source.model";
import { Event } from "../../models/event.model";
import { getOrCache } from "../../utils/cache";

export class StatsService {
  async getPublicStats(): Promise<{
    sources: number;
    opportunities: number;
    openCount: number;
    lastScanAt: Date | null;
  }> {
    const cacheKey = "public_stats";
    return getOrCache(cacheKey, async () => {
      const now = new Date();

      // Count enabled sources
      const sourcesCount = await Source.countDocuments({ enabled: true });

      // Count ONLY "real" opportunities: programs, subsidies, vouchers
      // EXCLUDE: news, service_info, decision, tender
      // This is what users expect when they see "X Ευκαιρίες"
      const realKinds = ["benefit", "voucher_pass", "program"];
      const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
      
      const opportunitiesFilter: any = {
        status: "published",
        deletedAt: null,
        kind: { $in: realKinds },
        // Exclude ASEP results older than 3 weeks
        $or: [
          { applicationStatus: { $ne: "results" } },
          { publishedAt: { $gte: threeWeeksAgo } },
        ],
      };
      
      const opportunitiesCount = await Opportunity.countDocuments(opportunitiesFilter);

      // Count OPEN opportunities (applicationStatus=open/upcoming)
      // Only real kinds, not expired, not broken links
      const openFilter: any = {
        status: "published",
        deletedAt: null,
        kind: { $in: realKinds },
        $and: [
          // Exclude broken links
          {
            $or: [
              { brokenLink: { $exists: false } },
              { brokenLink: false },
            ],
          },
          // Exclude dead links
          {
            $or: [
              { verificationResult: { $exists: false } },
              { verificationResult: { $ne: "dead_link" } },
            ],
          },
          // Dates must be valid (not expired)
          {
            $or: [
              { deadlineAt: null },
              { deadlineAt: { $gte: now } },
            ],
          },
          {
            $or: [
              { applicationEndAt: null },
              { applicationEndAt: { $gte: now } },
            ],
          },
          // Must have open/upcoming status
          {
            $or: [
              { applicationStatus: { $in: ["open", "upcoming"] } },
              { verificationResult: { $in: ["open", "upcoming"] } },
              // Legacy: no applicationStatus but valid dates
              { applicationStatus: { $exists: false } },
            ],
          },
          // Exclude ASEP results older than 3 weeks
          {
            $or: [
              { applicationStatus: { $ne: "results" } },
              { publishedAt: { $gte: threeWeeksAgo } },
            ],
          },
        ],
      };
      
      const openCount = await Opportunity.countDocuments(openFilter);

      // Get last scan time (most recent lastFetchedAt from sources)
      const lastSourceScan = await Source.findOne(
        { enabled: true, lastFetchedAt: { $exists: true } },
        {},
        { sort: { lastFetchedAt: -1 } }
      );

      const lastScanAt = lastSourceScan?.lastFetchedAt || null;

      // Ensure openCount is not greater than total opportunities
      // Note: openCount might be slightly higher if it includes legacy items without applicationStatus
      const validatedOpenCount = Math.min(openCount, opportunitiesCount);

      return {
        sources: sourcesCount,
        opportunities: opportunitiesCount, // Total published opportunities (matches "Όλα" tab)
        openCount: validatedOpenCount, // Open/upcoming opportunities (matches "Τρέχοντα" tab)
        lastScanAt,
      };
    }, 300); // Cache for 5 minutes
  }
}
