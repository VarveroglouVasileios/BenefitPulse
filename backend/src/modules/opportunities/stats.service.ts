import { Opportunity } from "../../models/opportunity.model";
import { Source } from "../../models/source.model";
import { Event } from "../../models/event.model";

export class StatsService {
  async getPublicStats(): Promise<{
    sources: number;
    opportunities: number;
    openCount: number;
    lastScanAt: Date | null;
  }> {
    const now = new Date();

    // Count enabled sources
    const sourcesCount = await Source.countDocuments({ enabled: true });

    // Count total published opportunities (all published, not just "open")
    // This should match what users see in "Όλα" tab
    // Include all kinds EXCEPT service_info (which is not an opportunity)
    const opportunitiesFilter: any = {
      status: "published",
      deletedAt: null,
      kind: { $nin: ["service_info"] }, // Exclude only service_info, include everything else
    };
    
    const opportunitiesCount = await Opportunity.countDocuments(opportunitiesFilter);

    // Count open opportunities (applicationStatus=open/upcoming OR verificationResult=open/upcoming OR legacy items with valid dates)
    // Exclude service_info, tender, news (these are not active opportunities)
    // This should match what users see in "Τρέχοντα" tab
    const openFilter: any = {
      status: "published",
      deletedAt: null,
      kind: { $nin: ["service_info", "tender", "news"] }, // Exclude service_info, tender, news
      // Exclude broken links (applies to all) - use $and to combine with other conditions
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
        // Must have open/upcoming status OR be legacy item
        {
          $or: [
            // Has applicationStatus=open or upcoming
            { applicationStatus: { $in: ["open", "upcoming"] } },
            // Has verificationResult=open or upcoming
            { verificationResult: { $in: ["open", "upcoming"] } },
            // Legacy: no applicationStatus (will be filtered by date checks above)
            { applicationStatus: { $exists: false } },
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
  }
}
