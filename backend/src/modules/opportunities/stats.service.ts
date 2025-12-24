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
    const opportunitiesFilter: any = {
      status: "published",
      deletedAt: null,
      kind: { $in: ["program", "benefit", "voucher_pass", "decision"] }, // Include all relevant kinds
    };
    
    const opportunitiesCount = await Opportunity.countDocuments(opportunitiesFilter);

    // Count open opportunities (applicationStatus=open OR verificationResult=open OR no deadline expired)
    const openFilter: any = {
      status: "published",
      deletedAt: null,
      kind: { $in: ["program", "benefit", "voucher_pass", "decision"] },
      $or: [
        // Has applicationStatus=open
        { applicationStatus: "open" },
        // Has verificationResult=open
        { verificationResult: "open" },
        // Legacy: no applicationStatus but not expired by dates
        {
          $and: [
            { applicationStatus: { $exists: false } },
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
          ],
        },
      ],
      // Exclude expired by dates
      $and: [
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
      opportunities: opportunitiesCount, // This now matches the "Active" tab count
      openCount: validatedOpenCount,
      lastScanAt,
    };
  }
}

