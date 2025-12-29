import { Opportunity, IOpportunity } from "../../models/opportunity.model";
import { UserOpportunity } from "../../models/userOpportunity.model";
import { UserProfile } from "../../models/profile.model";
import { Event } from "../../models/event.model";
import { evaluateMatch } from "../../rules/evaluate";
import { CriteriaRules } from "../../../../shared/src/rulesTypes";
import { sanitizeSearchQuery } from "../../utils/validation";

export class OpportunitiesService {
  async getPublicOpportunities(query: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
    showExpired?: boolean;
    tab?:
      | "active"
      | "results"
      | "news"
      | "archived"
      | "upcoming"
      | "current"
      | "all"; // Legacy tabs
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
          "criteriaJson.applicationStatus": {
            $nin: ["expired", "closed", "news", "results", "unknown"],
          },
        },
      ];
    }

    // For active tab: add date filters to exclude expired
    if (
      !query.showExpired &&
      query.tab !== "results" &&
      query.tab !== "news" &&
      query.tab !== "archived"
    ) {
      // Also filter by deadlineAt and applicationEndAt for backwards compatibility
      const dateFilter: any[] = [
        {
          $or: [{ deadlineAt: null }, { deadlineAt: { $gte: now } }],
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
      // Sanitize search query to prevent injection and errors
      const sanitized = sanitizeSearchQuery(query.search);
      if (sanitized) {
        filter.$text = { $search: sanitized };
      }
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
    showRejected?: boolean; // Admin filter: show rejected items
    showTendersNews?: boolean; // Admin filter: show tenders/news
  }): Promise<{
    opportunities: Array<
      IOpportunity & {
        badge?: {
          sourceName: string;
          kind: string;
          applicationStatus?: string;
        };
      }
    >;
    total: number;
    page: number;
    limit: number;
    exclusionStats?: {
      excludedItems: number;
      exclusionReasons: Record<string, number>;
    };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const now = new Date();
    const tab = query.tab || "all";
    const showRejected = query.showRejected === true;
    const showTendersNews = query.showTendersNews === true;

    // Base filter - include rejected if admin filter is enabled
    const filter: any = {
      deletedAt: null,
    };

    if (showRejected) {
      // Admin: show all statuses including rejected
      filter.status = { $in: ["published", "draft", "archived", "rejected"] };
    } else {
      // Normal: only published
      filter.status = "published";
    }

    // Default: exclude service_info and tenders from Opportunities tabs (unless admin filter enabled)
    if (!showTendersNews) {
      filter.kind = { $nin: ["service_info", "tender"] };
    } else {
      // Admin: allow tenders/news but still exclude service_info
      filter.kind = { $ne: "service_info" };
    }

    // Track exclusion reasons
    const exclusionReasons: Record<string, number> = {};

    // Sort based on tab (declare early)
    let sort: any = {};

    // Tab-based filtering (non-overlapping criteria)
    if (tab === "news") {
      // Νέα: STRICT filter - must be kind='news' OR kind='program' AND title MUST contain announcement keywords
      const announcementKeywords = [
        "παράταση",
        "παραταση",
        "αποτελέσματα",
        "αποτελεσματα",
        "πίνακες",
        "πινακες",
        "έναρξη",
        "εναρξη",
        "αιτήσεις",
        "αιτησεις",
        "προκήρυξη",
        "προκηρυξη",
      ];

      // Must be kind='news' OR kind='program', AND title must contain announcement keywords, AND exclude service_info
      // OR source is ASEP AND title contains news keywords
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          // Standard news/program with keywords
          {
            $and: [
              { $or: [{ kind: "news" }, { kind: "program" }] },
              {
                title: {
                  $regex: new RegExp(announcementKeywords.join("|"), "i"),
                },
              },
            ],
          },
          // ASEP source with news-like title
          {
            $and: [
              {
                $or: [
                  { source: { $regex: /asep/i } },
                  { source: { $regex: /ασεπ/i } },
                ],
              },
              {
                title: {
                  $regex: new RegExp(announcementKeywords.join("|"), "i"),
                },
              },
            ],
          },
        ],
      });
      filter.$and.push({
        kind: { $ne: "service_info" },
      });

      // Sort strictly by updatedAt desc (news is about recency)
      sort = { updatedAt: -1 };
    } else if (tab === "upcoming") {
      // Upcoming: kind="program" AND applicationStatus="upcoming"
      // FIXED: Don't require verificationResult - allow items with applicationStatus="upcoming" even if not verified yet
      filter.kind = "program";
      filter.$or = [
        { applicationStatus: "upcoming" },
        { "criteriaJson.applicationStatus": "upcoming" },
      ];
      // EXCLUDE broken links from Upcoming tab (only if verified as broken)
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { brokenLink: { $exists: false } }, // Not verified yet - allow it
          { brokenLink: false }, // Verified and not broken
        ],
      });
      filter.$and.push({
        $or: [
          { verificationResult: { $exists: false } }, // Not verified yet - allow it
          { verificationResult: { $ne: "dead_link" } }, // Not dead link
        ],
      });

      // Calculate exclusion stats
      const baseFilterForStats: any = {
        status: showRejected
          ? { $in: ["published", "draft", "archived", "rejected"] }
          : "published",
        deletedAt: null,
        kind: "program",
        $or: [
          { applicationStatus: "upcoming" },
          { "criteriaJson.applicationStatus": "upcoming" },
        ],
      };
      const totalUpcoming = await Opportunity.countDocuments(
        baseFilterForStats
      );
      const excludedBroken = await Opportunity.countDocuments({
        ...baseFilterForStats,
        brokenLink: true,
      });
      const excludedDeadLink = await Opportunity.countDocuments({
        ...baseFilterForStats,
        verificationResult: "dead_link",
      });
      exclusionReasons.brokenLink = excludedBroken;
      exclusionReasons.deadLink = excludedDeadLink;
    } else if (tab === "current") {
      // Τρέχοντα: kind="program" AND applicationStatus="open"
      // FIXED: Don't require verificationResult - allow items with applicationStatus="open" even if not verified yet
      filter.kind = "program";
      filter.$or = [
        { applicationStatus: "open" },
        { "criteriaJson.applicationStatus": "open" },
      ];
      // EXCLUDE broken links from Current tab (only if verified as broken)
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { brokenLink: { $exists: false } }, // Not verified yet - allow it
          { brokenLink: false }, // Verified and not broken
        ],
      });
      filter.$and.push({
        $or: [
          { verificationResult: { $exists: false } }, // Not verified yet - allow it
          { verificationResult: { $ne: "dead_link" } }, // Not dead link
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
          $or: [{ deadlineAt: null }, { deadlineAt: { $gte: now } }],
        }
      );

      // Calculate exclusion stats for Current tab
      const baseFilterForStats: any = {
        status: showRejected
          ? { $in: ["published", "draft", "archived", "rejected"] }
          : "published",
        deletedAt: null,
        kind: "program",
        $or: [
          { applicationStatus: "open" },
          { "criteriaJson.applicationStatus": "open" },
        ],
      };
      const totalOpen = await Opportunity.countDocuments(baseFilterForStats);
      const excludedBroken = await Opportunity.countDocuments({
        ...baseFilterForStats,
        brokenLink: true,
      });
      const excludedDeadLink = await Opportunity.countDocuments({
        ...baseFilterForStats,
        verificationResult: "dead_link",
      });
      const excludedExpiredEndAt = await Opportunity.countDocuments({
        ...baseFilterForStats,
        applicationEndAt: { $exists: true, $lt: now },
      });
      const excludedExpiredDeadline = await Opportunity.countDocuments({
        ...baseFilterForStats,
        deadlineAt: { $exists: true, $lt: now },
      });
      exclusionReasons.brokenLink = excludedBroken;
      exclusionReasons.deadLink = excludedDeadLink;
      exclusionReasons.expiredEndAt = excludedExpiredEndAt;
      exclusionReasons.expiredDeadline = excludedExpiredDeadline;
    } else {
      // Όλα: union of program + news + decisions (no specific filter)
      // Just exclude service_info and tender (already done above, unless admin filter enabled)
      if (!showTendersNews) {
        filter.kind = {
          $in: ["program", "benefit", "voucher_pass", "decision", "news"],
        };
      } else {
        // Admin: include tenders too
        filter.kind = {
          $in: [
            "program",
            "benefit",
            "voucher_pass",
            "decision",
            "news",
            "tender",
          ],
        };
      }

      // Calculate exclusion stats for All tab
      const baseFilterForStats: any = {
        status: showRejected
          ? { $in: ["published", "draft", "archived", "rejected"] }
          : "published",
        deletedAt: null,
      };
      const totalAll = await Opportunity.countDocuments(baseFilterForStats);
      const excludedServiceInfo = await Opportunity.countDocuments({
        ...baseFilterForStats,
        kind: "service_info",
      });
      const excludedTender = await Opportunity.countDocuments({
        ...baseFilterForStats,
        kind: "tender",
      });
      if (!showTendersNews) {
        exclusionReasons.excludedFromOpportunities = excludedTender;
        exclusionReasons.serviceInfo = excludedServiceInfo;
      }
    }

    // Calculate exclusion stats for News tab
    if (tab === "news") {
      const baseFilterForStats: any = {
        status: showRejected
          ? { $in: ["published", "draft", "archived", "rejected"] }
          : "published",
        deletedAt: null,
        kind: { $ne: "service_info" },
      };
      const totalNews = await Opportunity.countDocuments(baseFilterForStats);
      // News tab includes tenders, so no exclusion for tenders here
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

    // Sort based on tab (if not already set by news tab)
    if (!sort || Object.keys(sort).length === 0) {
      if (tab === "upcoming") {
        // Asc by applicationStartAt, fallback to publishedAt desc
        sort = { applicationStartAt: 1, publishedAt: -1 };
      } else if (tab === "current") {
        // Asc by applicationEndAt, fallback to publishedAt desc
        sort = { applicationEndAt: 1, publishedAt: -1 };
      } else {
        // All: default sort
        sort = { publishedAt: -1 };
      }
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
        applicationStatus:
          opp.applicationStatus ||
          opp.criteriaJson?.applicationStatus ||
          "unknown",
      },
    }));

    // Calculate total excluded items
    const excludedItems = Object.values(exclusionReasons).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      opportunities: opportunitiesWithBadges,
      total,
      page,
      limit,
      exclusionStats: {
        excludedItems,
        exclusionReasons,
      },
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
                    "criteriaJson.applicationStatus": {
                      $in: ["open", "upcoming"],
                    },
                  },
                  // Exclude expired/closed/news/results/unknown
                  {
                    "criteriaJson.applicationStatus": {
                      $nin: ["expired", "closed", "news", "results", "unknown"],
                    },
                  },
                  // STRICT: Exclude Pass items with year in title that are expired
                  {
                    $or: [
                      {
                        title: {
                          $not: { $regex: /pass.*20\d{2}|20\d{2}.*pass/i },
                        },
                      },
                      {
                        $and: [
                          { title: { $regex: /pass.*20\d{2}|20\d{2}.*pass/i } },
                          {
                            "criteriaJson.applicationStatus": {
                              $in: ["open", "upcoming"],
                            },
                          },
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
                    $or: [{ deadlineAt: null }, { deadlineAt: { $gte: now } }],
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
                      {
                        title: {
                          $not: { $regex: /pass.*20\d{2}|20\d{2}.*pass/i },
                        },
                      },
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
        if (
          opp.status !== "published" ||
          opp.deletedAt ||
          (opp as any).kind === "service_info"
        ) {
          return false;
        }

        const appStatus = (opp.criteriaJson as any)?.applicationStatus;

        // STRICT: Only allow open/upcoming (NO unknown, NO legacy without status)
        if (!appStatus || !["open", "upcoming"].includes(appStatus)) {
          return false;
        }

        // Exclude expired/closed/news/results/unknown
        if (
          ["expired", "closed", "news", "results", "unknown"].includes(
            appStatus
          )
        ) {
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
            if (
              titleYear === currentYear &&
              !opp.deadlineAt &&
              !opp.applicationEndAt &&
              !opp.applicationStartAt
            ) {
              const currentMonth = now.getMonth(); // 0-11
              if (currentMonth >= 6) {
                // July onwards
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
      })
      .slice(0, 10);

    // COLD START FIX: If top 10 items have 0 views, fallback to "Smart Featured" query
    if (
      scored.length === 0 ||
      scored.every((opp: any) => {
        const oppViews = top.find(
          (t: any) => t.opportunity?._id?.toString() === opp._id?.toString()
        );
        return !oppViews || (oppViews.views === 0 && oppViews.clicks === 0);
      })
    ) {
      // Smart Featured fallback: Sort by createdAt desc, filter for confidence > 0.8, exclude "Manual" source
      const smartFeatured = await Opportunity.find({
        status: "published",
        deletedAt: null,
        kind: { $ne: "service_info" },
        confidence: { $gt: 0.8 },
        source: { $ne: "Manual" }, // Prefer official sources
        $or: [
          { applicationStatus: { $in: ["open", "upcoming"] } },
          { "criteriaJson.applicationStatus": { $in: ["open", "upcoming"] } },
        ],
        "criteriaJson.applicationStatus": {
          $nin: ["expired", "closed", "news", "results", "unknown"],
        },
        $and: [
          {
            $or: [{ deadlineAt: null }, { deadlineAt: { $gte: now } }],
          },
          {
            $or: [
              { applicationEndAt: null },
              { applicationEndAt: { $gte: now } },
            ],
          },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      return smartFeatured as unknown as IOpportunity[];
    }

    return scored;
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
        (!appStatus ||
          !["expired", "closed", "news", "results"].includes(appStatus)) &&
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
            {
              "criteriaJson.applicationStatus": {
                $nin: ["expired", "closed", "news", "results"],
              },
            },
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
            {
              "criteriaJson.applicationStatus": {
                $nin: ["expired", "closed", "news", "results"],
              },
            },
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
