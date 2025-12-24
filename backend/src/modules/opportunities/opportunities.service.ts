import { Opportunity, IOpportunity } from "../../models/opportunity.model";
import { UserOpportunity } from "../../models/userOpportunity.model";
import { UserProfile } from "../../models/profile.model";
import { Event } from "../../models/event.model";
import { evaluateMatch } from "../../rules/evaluate";
import { CriteriaRules } from "../../../../shared/src/rulesTypes";

export class OpportunitiesService {
  async getPublicOpportunities(query: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
    showExpired?: boolean;
    tab?: "active" | "results" | "news" | "archived" | "upcoming" | "current" | "all"; // Legacy tabs
  }): Promise<{ opportunities: IOpportunity[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const now = new Date();

    const filter: any = {
      status: "published",
      deletedAt: null,
      kind: { $ne: "service_info" },
    };

    // Tab-based filtering
    if (query.tab === "results") {
      // Results tab: only results
      filter["criteriaJson.applicationStatus"] = "results";
    } else if (query.tab === "news") {
      // News tab: news/announcements
      filter["criteriaJson.applicationStatus"] = "news";
    } else if (query.tab === "archived") {
      // Archived tab: archived/closed/expired
      filter.status = { $in: ["archived", "draft"] };
      filter.$or = [
        { "criteriaJson.applicationStatus": { $in: ["expired", "closed"] } },
        { deadlineAt: { $lt: now } },
        { applicationEndAt: { $lt: now } },
      ];
    } else {
      // Active tab (default): only open/upcoming
      filter.$and = [
        {
          "criteriaJson.applicationStatus": { $in: ["open", "upcoming"] },
        },
        {
          "criteriaJson.applicationStatus": { $nin: ["expired", "closed", "news", "results", "unknown"] },
        },
      ];
    }

    // For active tab: add date filters to exclude expired
    if (!query.showExpired && query.tab !== "results" && query.tab !== "news" && query.tab !== "archived") {
      // Also filter by deadlineAt and applicationEndAt for backwards compatibility
      const dateFilter: any[] = [
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
      ];
      
      // Exclude Pass items with year in title that have expired deadlines
      dateFilter.push({
        $or: [
          { title: { $not: { $regex: /pass.*20\d{2}|20\d{2}.*pass/i } } }, // Not a Pass with year
          { 
            $and: [
              { title: { $regex: /pass.*20\d{2}|20\d{2}.*pass/i } }, // Is a Pass with year
              { applicationEndAt: { $gte: now } }, // But has valid end date
            ],
          },
        ],
      });
      
      if (!filter.$and) filter.$and = [];
      filter.$and.push(...dateFilter);
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const opportunities = await Opportunity.find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Opportunity.countDocuments(filter);

    return { opportunities, total };
  }

  /**
   * Get feed with tab-based filtering
   * Tabs: news, upcoming, current, all
   */
  async getFeed(query: {
    tab?: "news" | "upcoming" | "current" | "all";
    page?: number;
    limit?: number;
    type?: string;
    kind?: string;
    source?: string;
    status?: string;
    search?: string;
  }): Promise<{ 
    opportunities: Array<IOpportunity & { badge?: { sourceName: string; kind: string; applicationStatus?: string } }>; 
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const now = new Date();
    const tab = query.tab || "all";

    const filter: any = {
      status: "published",
      deletedAt: null,
      kind: { $ne: "service_info" },
    };

    // Tab-based filtering (non-overlapping criteria)
    if (tab === "news") {
      // Νέα: applicationStatus="news" (only in criteriaJson, not in applicationStatus field)
      filter["criteriaJson.applicationStatus"] = "news";
    } else if (tab === "upcoming") {
      // Upcoming: kind="program" AND applicationStatus="upcoming"
      // Require verificationResult="upcoming" OR (no verificationResult but applicationStatus="upcoming")
      filter.kind = "program";
      filter.$or = [
        { applicationStatus: "upcoming" },
        { "criteriaJson.applicationStatus": "upcoming" },
      ];
      // Prefer verified items: verificationResult="upcoming" OR (no verificationResult but applicationStatus="upcoming")
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { verificationResult: "upcoming" }, // Verified as upcoming
          { 
            $and: [
              { verificationResult: { $exists: false } }, // Not verified yet
              { applicationStatus: "upcoming" }, // But marked as upcoming
            ],
          },
        ],
      });
    } else if (tab === "current") {
      // Τρέχοντα: kind="program" AND applicationStatus="open"
      // Also require verificationResult="open" OR (no verificationResult but applicationStatus="open")
      filter.kind = "program";
      filter.$or = [
        { applicationStatus: "open" },
        { "criteriaJson.applicationStatus": "open" },
      ];
      // Prefer verified items: verificationResult="open" OR (no verificationResult but applicationStatus="open")
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { verificationResult: "open" }, // Verified as open
          { 
            $and: [
              { verificationResult: { $exists: false } }, // Not verified yet
              { applicationStatus: "open" }, // But marked as open
            ],
          },
        ],
      });
      // Also ensure dates are valid (not expired)
      filter.$and.push(
        {
          $or: [
            { applicationEndAt: null },
            { applicationEndAt: { $gte: now } },
          ],
        },
        {
          $or: [
            { deadlineAt: null },
            { deadlineAt: { $gte: now } },
          ],
        }
      );
    } else {
      // Όλα: union of program + news + decisions (no specific filter)
      // Just exclude service_info (already done above)
      // Include: kind in ["program", "benefit", "voucher_pass", "decision"]
      filter.kind = { $in: ["program", "benefit", "voucher_pass", "decision"] };
    }

    // Additional filters
    if (query.type) {
      filter.type = query.type;
    }

    if (query.kind) {
      filter.kind = query.kind;
    }

    if (query.source) {
      filter.source = query.source;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    // Sort based on tab
    let sort: any = {};
    if (tab === "news") {
      sort = { publishedAt: -1 }; // Desc: newest first
    } else if (tab === "upcoming") {
      // Asc by applicationStartAt, fallback to publishedAt desc
      sort = { applicationStartAt: 1, publishedAt: -1 };
    } else if (tab === "current") {
      // Asc by applicationEndAt, fallback to publishedAt desc
      sort = { applicationEndAt: 1, publishedAt: -1 };
    } else {
      // All: default sort
      sort = { publishedAt: -1 };
    }

    const opportunities = await Opportunity.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Opportunity.countDocuments(filter);

    // Add badge fields
    const opportunitiesWithBadges = opportunities.map((opp: any) => ({
      ...opp.toObject(),
      badge: {
        sourceName: opp.source || "Unknown",
        kind: opp.kind || "benefit",
        applicationStatus: opp.applicationStatus || opp.criteriaJson?.applicationStatus || "unknown",
      },
    }));

    return { 
      opportunities: opportunitiesWithBadges, 
      total,
      page,
      limit,
    };
  }

  async getOpportunityById(id: string): Promise<IOpportunity | null> {
    const now = new Date();
    return Opportunity.findOne({
      _id: id,
      status: "published",
      deletedAt: null,
      kind: { $ne: "service_info" },
      $or: [{ deadlineAt: null }, { deadlineAt: { $gte: now } }],
    });
  }

  async getTrending(hours: number = 24): Promise<IOpportunity[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const now = new Date();

    // First try to use events (views/clicks) over the last period
    const top = await Event.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          opportunityId: { $exists: true },
          type: { $in: ["opportunity_view", "official_click"] },
        },
      },
      {
        $group: {
          _id: "$opportunityId",
          views: {
            $sum: { $cond: [{ $eq: ["$type", "opportunity_view"] }, 1, 0] },
          },
          clicks: {
            $sum: { $cond: [{ $eq: ["$type", "official_click"] }, 1, 0] },
          },
        },
      },
      { $sort: { views: -1, clicks: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "opportunities",
          let: { oppId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$oppId"] },
                status: "published",
                deletedAt: null,
                kind: { $ne: "service_info" },
                $and: [
                  // ONLY allow open/upcoming status (NO unknown, NO legacy without dates)
                  {
                    "criteriaJson.applicationStatus": { $in: ["open", "upcoming"] },
                  },
                  // Exclude expired/closed/news/results/unknown
                  {
                    "criteriaJson.applicationStatus": { $nin: ["expired", "closed", "news", "results", "unknown"] },
                  },
                  // STRICT: Exclude Pass items with year in title that are expired
                  {
                    $or: [
                      { title: { $not: { $regex: /pass.*20\d{2}|20\d{2}.*pass/i } } },
                      {
                        $and: [
                          { title: { $regex: /pass.*20\d{2}|20\d{2}.*pass/i } },
                          { "criteriaJson.applicationStatus": { $in: ["open", "upcoming"] } },
                          // Exclude if year in title is before current year
                          {
                            $expr: {
                              $gte: [
                                {
                                  $toInt: {
                                    $arrayElemAt: [
                                      {
                                        $regexFind: {
                                          input: "$title",
                                          regex: /(20\d{2})/i,
                                        },
                                      },
                                      1,
                                    ],
                                  },
                                },
                                new Date().getFullYear(),
                              ],
                            },
                          },
                        ],
                      },
                    ],
                  },
                  // MANDATORY: deadlineAt must be null OR >= now
                  {
                    $or: [
                      { deadlineAt: null },
                      { deadlineAt: { $gte: now } },
                    ],
                  },
                  // MANDATORY: applicationEndAt must be null OR >= now
                  {
                    $or: [
                      { applicationEndAt: null },
                      { applicationEndAt: { $gte: now } },
                    ],
                  },
                  // Exclude Pass items with year in title that have expired deadlines
                  {
                    $or: [
                      { title: { $not: { $regex: /pass.*20\d{2}|20\d{2}.*pass/i } } },
                      {
                        $and: [
                          { title: { $regex: /pass.*20\d{2}|20\d{2}.*pass/i } },
                          {
                            $or: [
                              { applicationEndAt: null },
                              { applicationEndAt: { $gte: now } },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          ],
          as: "opportunity",
        },
      },
      { $unwind: "$opportunity" },
    ]);

    const scored = top
      .map((t: any) => t.opportunity as IOpportunity)
      .filter((opp) => {
        // Basic checks
        if (opp.status !== "published" || opp.deletedAt || (opp as any).kind === "service_info") {
          return false;
        }
        
        const appStatus = (opp.criteriaJson as any)?.applicationStatus;
        
        // STRICT: Only allow open/upcoming (NO unknown, NO legacy without status)
        if (!appStatus || !["open", "upcoming"].includes(appStatus)) {
          return false;
        }
        
        // Exclude expired/closed/news/results/unknown
        if (["expired", "closed", "news", "results", "unknown"].includes(appStatus)) {
          return false;
        }
        
        // MANDATORY: Exclude items with expired deadlines
        if (opp.deadlineAt && opp.deadlineAt < now) {
          return false;
        }
        if (opp.applicationEndAt && opp.applicationEndAt < now) {
          return false;
        }
        
        // STRICT: Exclude Pass items with year in title that are expired
        const title = (opp.title || "").toLowerCase();
        const isPassWithYear = /pass.*20\d{2}|20\d{2}.*pass/i.test(title);
        if (isPassWithYear) {
          // Extract year from title
          const passYearMatch = opp.title.match(/\b(20\d{2})\b/i);
          if (passYearMatch) {
            const titleYear = parseInt(passYearMatch[1], 10);
            const currentYear = now.getFullYear();
            // Exclude if year in title is before current year
            if (titleYear < currentYear) {
              return false;
            }
            // Exclude if year is current year but no dates and we're past mid-year
            if (titleYear === currentYear && !opp.deadlineAt && !opp.applicationEndAt && !opp.applicationStartAt) {
              const currentMonth = now.getMonth(); // 0-11
              if (currentMonth >= 6) { // July onwards
                return false;
              }
            }
          }
          // Pass items with year should ONLY show if they have open/upcoming status
          if (!appStatus || !["open", "upcoming"].includes(appStatus)) {
            return false;
          }
          // Also exclude if expired deadline
          if (opp.applicationEndAt && opp.applicationEndAt < now) {
            return false;
          }
          if (opp.deadlineAt && opp.deadlineAt < now) {
            return false;
          }
        }
        
        return true;
      });

    if (scored.length > 0) {
      return scored;
    }

    // Fallback: newest published in last period (STRICT: only open/upcoming, no expired)
    return Opportunity.find({
      status: "published",
      deletedAt: null,
      kind: { $ne: "service_info" },
      publishedAt: { $gte: since },
      $and: [
        // ONLY allow open/upcoming (NO unknown, NO legacy without status)
        {
          "criteriaJson.applicationStatus": { $in: ["open", "upcoming"] },
        },
        // Exclude expired/closed/news/results/unknown
        {
          "criteriaJson.applicationStatus": { $nin: ["expired", "closed", "news", "results", "unknown"] },
        },
        // MANDATORY: deadlineAt must be null OR >= now
        {
          $or: [
            { deadlineAt: null },
            { deadlineAt: { $gte: now } },
          ],
        },
        // MANDATORY: applicationEndAt must be null OR >= now
        {
          $or: [
            { applicationEndAt: null },
            { applicationEndAt: { $gte: now } },
          ],
        },
      ],
    })
      .sort({ publishedAt: -1 })
      .limit(10);
  }

  async getMatchedOpportunities(userId: string): Promise<
    {
      opportunity: IOpportunity;
      reasons: string[];
      missingFields: string[];
      confidence: number;
    }[]
  > {
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return [];
    }

    const now = new Date();

    const userOpportunities = await UserOpportunity.find({
      userId,
      $or: [{ matchStatus: "matched" }, { matched: true }],
    }).populate("opportunityId");

    const results: {
      opportunity: IOpportunity;
      reasons: string[];
      missingFields: string[];
      confidence: number;
    }[] = [];

    for (const uo of userOpportunities) {
      const opp = uo.opportunityId as unknown as IOpportunity | undefined;
      if (!opp) continue;

      // Filter only active, non-garbage, non-expired published opportunities
      const appStatus = (opp.criteriaJson as any)?.applicationStatus;
      const title = (opp.title || "").toLowerCase();
      const isPassWithYear = /pass.*20\d{2}|20\d{2}.*pass/i.test(title);
      
      const isActive =
        opp.status === "published" &&
        !opp.deletedAt &&
        (opp as any).kind !== "garbage" &&
        (!opp.deadlineAt || opp.deadlineAt >= now) &&
        (!opp.applicationEndAt || opp.applicationEndAt >= now) &&
        (!appStatus || !["expired", "closed", "news", "results"].includes(appStatus)) &&
        !(isPassWithYear && opp.applicationEndAt && opp.applicationEndAt < now);

      if (!isActive) continue;

      results.push({
        opportunity: opp,
        reasons: uo.reasons,
        missingFields: uo.missingFields,
        confidence: uo.confidence,
      });
    }

    // Sort by publishedAt desc
    return results.sort(
      (a, b) =>
        new Date(b.opportunity.publishedAt).getTime() -
        new Date(a.opportunity.publishedAt).getTime()
    );
  }

  async getForYouOpportunities(userId: string): Promise<{
    hasProfile: boolean;
    matched: IOpportunity[];
    unknown: IOpportunity[];
  }> {
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return { hasProfile: false, matched: [], unknown: [] };
    }

    const now = new Date();

    const [matchedLinks, unknownLinks] = await Promise.all([
      UserOpportunity.find({ userId, matchStatus: "matched" }).populate(
        "opportunityId"
      ),
      UserOpportunity.find({ userId, matchStatus: "unknown" }).populate(
        "opportunityId"
      ),
    ]);

    const matchedIds = matchedLinks.map((uo) => uo.opportunityId);
    const unknownIds = unknownLinks.map((uo) => uo.opportunityId);

    const [matched, unknown] = await Promise.all([
      Opportunity.find({
        _id: { $in: matchedIds },
        status: "published",
        deletedAt: null,
      kind: { $ne: "service_info" },
        $or: [{ deadlineAt: null }, { deadlineAt: { $gte: now } }],
      }).sort({ publishedAt: -1 }),
      Opportunity.find({
        _id: { $in: unknownIds },
        status: "published",
        deletedAt: null,
        kind: { $ne: "garbage" },
        $or: [{ deadlineAt: null }, { deadlineAt: { $gte: now } }],
      }).sort({ publishedAt: -1 }),
    ]);

    return { hasProfile: true, matched, unknown };
  }

  async getTodayOpportunities(userId: string): Promise<IOpportunity[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return [];
    }

    const now = new Date();
    const opportunities = await Opportunity.find({
      status: "published",
      deletedAt: null,
      publishedAt: { $gte: today },
      $and: [
        {
          $or: [
            { "criteriaJson.applicationStatus": { $in: ["open", "upcoming"] } },
            { "criteriaJson.applicationStatus": { $exists: false } },
          ],
        },
        {
          $or: [
            { "criteriaJson.applicationStatus": { $exists: false } },
            { "criteriaJson.applicationStatus": { $nin: ["expired", "closed", "news", "results"] } },
          ],
        },
        {
          $or: [
            { applicationEndAt: null },
            { applicationEndAt: { $gte: now } },
          ],
        },
      ],
    }).sort({ publishedAt: -1 });

    // Match and cache results
    const matched: IOpportunity[] = [];
    for (const opp of opportunities) {
      const matchResult = evaluateMatch(
        profile.toObject(),
        opp.criteriaRulesJson as CriteriaRules,
        opp
      );
      if (matchResult.matched) {
        await UserOpportunity.findOneAndUpdate(
          { userId, opportunityId: opp._id },
          {
            userId,
            opportunityId: opp._id,
            matched: true,
            reasons: matchResult.reasons,
            missingFields: matchResult.missingFields,
            confidence: matchResult.confidence,
          },
          { upsert: true }
        );
        matched.push(opp);
      }
    }

    return matched;
  }

  async getNewSinceLastVisit(userId: string): Promise<IOpportunity[]> {
    const profile = await UserProfile.findOne({ userId });
    if (!profile || !profile.lastVisitAt) {
      return [];
    }

    const opportunities = await Opportunity.find({
      status: "published",
      deletedAt: null,
      publishedAt: { $gt: profile.lastVisitAt },
    }).sort({ publishedAt: -1 });

    const matched: IOpportunity[] = [];
    for (const opp of opportunities) {
      const matchResult = evaluateMatch(
        profile.toObject(),
        opp.criteriaRulesJson as CriteriaRules,
        opp
      );
      if (matchResult.matched) {
        await UserOpportunity.findOneAndUpdate(
          { userId, opportunityId: opp._id },
          {
            userId,
            opportunityId: opp._id,
            matched: true,
            reasons: matchResult.reasons,
            missingFields: matchResult.missingFields,
            confidence: matchResult.confidence,
          },
          { upsert: true }
        );
        matched.push(opp);
      }
    }

    return matched;
  }

  async getExpiringSoon(
    userId: string,
    days: number = 30
  ): Promise<IOpportunity[]> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    const now = new Date();

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return [];
    }

    const opportunities = await Opportunity.find({
      status: "published",
      deletedAt: null,
      deadlineAt: { $gte: now, $lte: deadline },
      $and: [
        {
          $or: [
            { "criteriaJson.applicationStatus": { $in: ["open", "upcoming"] } },
            { "criteriaJson.applicationStatus": { $exists: false } },
          ],
        },
        {
          $or: [
            { "criteriaJson.applicationStatus": { $exists: false } },
            { "criteriaJson.applicationStatus": { $nin: ["expired", "closed", "news", "results"] } },
          ],
        },
      ],
    }).sort({ deadlineAt: 1 });

    const matched: IOpportunity[] = [];
    for (const opp of opportunities) {
      const matchResult = evaluateMatch(
        profile.toObject(),
        opp.criteriaRulesJson as CriteriaRules,
        opp
      );
      if (matchResult.matched) {
        matched.push(opp);
      }
    }

    return matched;
  }

  async getMatchReasons(
    userId: string,
    opportunityId: string
  ): Promise<{
    matched: boolean;
    reasons: string[];
    missingFields: string[];
  }> {
    const userOpp = await UserOpportunity.findOne({ userId, opportunityId });
    if (userOpp) {
      return {
        matched: userOpp.matched,
        reasons: userOpp.reasons,
        missingFields: userOpp.missingFields,
      };
    }

    const profile = await UserProfile.findOne({ userId });
    const opportunity = await Opportunity.findById(opportunityId);

    if (!profile || !opportunity) {
      return { matched: false, reasons: [], missingFields: [] };
    }

    const matchResult = evaluateMatch(
      profile.toObject(),
      opportunity.criteriaRulesJson as CriteriaRules,
      opportunity
    );
    return {
      matched: matchResult.matched,
      reasons: matchResult.reasons,
      missingFields: matchResult.missingFields,
    };
  }
}
