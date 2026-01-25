import { Opportunity, IOpportunity } from "../../models/opportunity.model";
import { RawItem } from "../../models/rawItem.model";
import { User } from "../../models/user.model";
import { Event } from "../../models/event.model";
import { AdminAudit } from "../../models/adminAudit.model";
import { Session } from "../../models/session.model";
import { OpportunityType } from "../../../../shared/src/types";
import { IngestionService } from "../ingestion/ingestion.service";
import { cleanAndValidate, CleanerInput } from "../ingestion/cleaner";
import axios from "axios";
import * as cheerio from "cheerio";
import { sendEmail, generateContactReplyEmail } from "../../utils/email";

export class AdminService {
  // CMS - Opportunities CRUD
  async createOpportunity(
    data: Partial<IOpportunity>,
    adminId: string
  ): Promise<IOpportunity> {
    const opportunity = await Opportunity.create({
      ...data,
      status: "draft",
    });

    await AdminAudit.create({
      adminId,
      action: "create",
      resourceType: "opportunity",
      resourceId: opportunity._id,
      after: opportunity.toObject(),
    });

    return opportunity;
  }

  async updateOpportunity(
    id: string,
    updates: Partial<IOpportunity>,
    adminId: string
  ): Promise<IOpportunity | null> {
    const before = await Opportunity.findById(id);
    if (!before) {
      throw new Error("Opportunity not found");
    }

    const opportunity = await Opportunity.findByIdAndUpdate(id, updates, {
      new: true,
    });
    if (!opportunity) {
      return null;
    }

    await AdminAudit.create({
      adminId,
      action: "update",
      resourceType: "opportunity",
      resourceId: opportunity._id,
      before: before.toObject(),
      after: opportunity.toObject(),
    });

    return opportunity;
  }

  async publishOpportunity(
    id: string,
    adminId: string
  ): Promise<IOpportunity | null> {
    return this.updateOpportunity(id, { status: "published" }, adminId);
  }

  async unpublishOpportunity(
    id: string,
    adminId: string
  ): Promise<IOpportunity | null> {
    return this.updateOpportunity(id, { status: "draft" }, adminId);
  }

  async archiveOpportunity(
    id: string,
    adminId: string
  ): Promise<IOpportunity | null> {
    return this.updateOpportunity(id, { status: "archived" }, adminId);
  }

  async deleteOpportunity(id: string, adminId: string): Promise<void> {
    const opportunity = await Opportunity.findById(id);
    if (!opportunity) {
      throw new Error("Opportunity not found");
    }

    // Log audit before deletion
    await AdminAudit.create({
      adminId,
      action: "delete",
      resourceType: "opportunity",
      resourceId: opportunity._id,
      before: opportunity.toObject(),
      after: null,
    });

    // Hard delete from database
    await Opportunity.findByIdAndDelete(id);
  }

  async restoreOpportunity(
    id: string,
    adminId: string
  ): Promise<IOpportunity | null> {
    // 1. Check if it already exists (to avoid duplicate key error if soft-delete was used or it wasn't deleted)
    const existing = await Opportunity.findById(id);
    if (existing) {
      if (existing.status === 'archived' || existing.status === 'rejected') {
         return this.updateOpportunity(id, { status: 'draft' }, adminId);
      }
      return existing;
    }

    // 2. Find the deletion audit log
    const deletionLog = await AdminAudit.findOne({
      resourceType: "opportunity",
      resourceId: id,
      action: "delete",
    }).sort({ createdAt: -1 });

    if (!deletionLog || !deletionLog.before) {
      throw new Error("Cannot restore: No deletion record found or data missing");
    }

    // 3. Re-create the opportunity
    const opportunityData = deletionLog.before;
    
    // Use findByIdAndUpdate with upsert to safely restore the document
    // This will insert if the document doesn't exist, or update if it does
    // Setting isNew = false ensures Mongoose treats it as an existing document
    // and performs an UPDATE operation, which is correct for restoration
    const restored = await Opportunity.findByIdAndUpdate(
      id,
      { $set: opportunityData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Log the restore action
    await AdminAudit.create({
      adminId,
      action: "restore",
      resourceType: "opportunity",
      resourceId: restored._id,
      after: restored.toObject(),
    });

    return restored;
  }

  async getOpportunities(query: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    showRejected?: boolean;
    showTendersNews?: boolean;
    search?: string;
  }): Promise<{ opportunities: IOpportunity[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      deletedAt: null,
    };

    // Status filter
    if (query.status) {
      filter.status = query.status;
    } else if (query.showRejected) {
      // Admin: show all including rejected
      filter.status = { $in: ["published", "draft", "archived", "rejected"] };
    } else {
      // Default: exclude rejected
      filter.status = { $in: ["published", "draft", "archived"] };
    }

    // Type filter
    if (query.type) {
      filter.type = query.type;
    }

    // Kind filter: exclude tenders/news unless admin filter enabled
    if (!query.showTendersNews) {
      filter.kind = { $nin: ["service_info", "tender", "news"] };
    } else {
      // Admin: allow tenders/news but exclude service_info
      filter.kind = { $ne: "service_info" };
    }

    // Search filter (Title or Summary)
    if (query.search) {
      const searchRegex = new RegExp(query.search, "i");
      filter.$or = [
        { title: searchRegex },
        { summary: searchRegex },
        { officialUrl: searchRegex },
      ];
    }

    const opportunities = await Opportunity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Opportunity.countDocuments(filter);

    return { opportunities, total };
  }

  async getOpportunityById(id: string): Promise<IOpportunity | null> {
    return Opportunity.findById(id);
  }

  // Moderation - Draft Queue
  async getDraftQueue(): Promise<IOpportunity[]> {
    return Opportunity.find({ status: "draft", deletedAt: null }).sort({
      createdAt: -1,
    });
  }

  async getRawItems(query: { processed?: boolean }): Promise<any[]> {
    const filter: any = {};
    if (query.processed !== undefined) {
      filter.processed = query.processed;
    }
    return RawItem.find(filter).sort({ createdAt: -1 });
  }

  // Metrics
  async getOverviewMetrics(): Promise<any> {
    const now = new Date();
    // Create today at midnight without mutating 'now'
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      totalOpportunities,
      publishedOpportunities,
      totalEvents,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      Opportunity.countDocuments({ deletedAt: null }),
      Opportunity.countDocuments({ status: "published", deletedAt: null }),
      Event.countDocuments(),
    ]);

    const dau = await Session.countDocuments({ lastAt: { $gte: today } });
    const wau = await Session.countDocuments({ lastAt: { $gte: weekAgo } });
    const mau = await Session.countDocuments({ lastAt: { $gte: monthAgo } });

    return {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        dau,
        wau,
        mau,
      },
      content: {
        total: totalOpportunities,
        published: publishedOpportunities,
      },
      events: {
        total: totalEvents,
      },
    };
  }

  async getTimeseriesMetrics(days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = await Event.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          pageviews: {
            $sum: { $cond: [{ $eq: ["$type", "pageview"] }, 1, 0] },
          },
          opportunityViews: {
            $sum: { $cond: [{ $eq: ["$type", "opportunity_view"] }, 1, 0] },
          },
          officialClicks: {
            $sum: { $cond: [{ $eq: ["$type", "official_click"] }, 1, 0] },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return events;
  }

  async getTopRoutes(limit: number = 10): Promise<any[]> {
    return Event.aggregate([
      {
        $match: {
          type: "pageview",
          path: { $exists: true },
        },
      },
      {
        $group: {
          _id: "$path",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limit,
      },
    ]);
  }

  async getTopOpportunities(limit: number = 10): Promise<any[]> {
    return Event.aggregate([
      {
        $match: {
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
      {
        $sort: { views: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "opportunities",
          localField: "_id",
          foreignField: "_id",
          as: "opportunity",
        },
      },
      {
        $unwind: "$opportunity",
      },
    ]);
  }

  // Audit Log
  async getAuditLog(query: {
    page?: number;
    limit?: number;
    adminId?: string;
    resourceType?: string;
  }): Promise<{ audits: any[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.adminId) {
      filter.adminId = query.adminId;
    }
    if (query.resourceType) {
      filter.resourceType = query.resourceType;
    }

    const audits = await AdminAudit.find(filter)
      .populate("adminId", "email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AdminAudit.countDocuments(filter);

    return { audits, total };
  }

  // Admin Actions - Manual Triggers
  async triggerIngestion(adminId: string): Promise<{ count: number }> {
    const service = new IngestionService();
    const count = await service.processAllEnabledSources();

    await AdminAudit.create({
      adminId,
      action: "trigger_ingestion",
      resourceType: "system",
      // resourceId omitted for system-level actions
      after: { count },
    });

    return { count };
  }

  async archiveExpiredOpportunities(adminId: string): Promise<{
    archived: number;
    checked: number;
    breakdown: {
      deadlineExpired: number;
      summaryExpired: number;
      cleanerExpired: number;
      noRawItem: number;
    };
  }> {
    const now = new Date();
    const today = new Date().toISOString();

    const published = await Opportunity.find({
      status: "published",
      deletedAt: null,
    });

    let archivedCount = 0;
    let checkedCount = 0;
    let noRawItemCount = 0;
    let deadlineExpiredCount = 0;
    let summaryExpiredCount = 0;
    let cleanerExpiredCount = 0;

    function hasExpiredKeywords(text: string): boolean {
      const lowerText = text.toLowerCase();
      const expiredKeywords = [
        "ολοκληρώθηκαν",
        "έληξε",
        "έκλεισε",
        "ολοκληρώθηκε",
        "τελείωσε",
        "completed",
        "closed",
        "ended",
        "finished",
        "η πλατφόρμα έκλεισε",
        "η πλατφορμα εκλεισε",
        "ολοκλήρωση αιτήσεων",
        "ολοκληρωση αιτησεων",
        // New keywords based on user feedback (results/objections phase = application closed)
        "υποβολή ενστάσεων",
        "υποβολη ενστασεων",
        "προσωρινά αποτελέσματα",
        "προσωρινα αποτελεσματα",
        "οριστικά αποτελέσματα",
        "οριστικα αποτελεσματα",
      ];
      return expiredKeywords.some((kw) => lowerText.includes(kw));
    }

    function hasPastYearInTitle(title: string): boolean {
      const currentYear = new Date().getFullYear();
      const match = title.match(/\b(20\d{2})\b/);
      if (match) {
        const year = parseInt(match[1], 10);
        // If year is older than previous year (e.g. 2024 when now is 2026) -> Definitely Expired
        if (year < currentYear - 1) {
          return true;
        }
        // If year is previous year (2025 in 2026), ONLY expire if we are past March (Q1 grace period)
        if (year === currentYear - 1) {
           const month = new Date().getMonth(); // 0-based
           return month > 2; // April onwards
        }
      }
      return false;
    }

    function canonicalizeUrl(url: string): string {
      try {
        const u = new URL(url);
        u.search = "";
        u.hash = "";
        let pathname = u.pathname;
        if (pathname.endsWith("/") && pathname !== "/") {
          pathname = pathname.slice(0, -1);
        }
        return `${u.protocol}//${u.hostname}${pathname}`;
      } catch {
        return url;
      }
    }

    async function fetchFullPageContent(url: string): Promise<string | null> {
      try {
        const response = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 10000,
        });
        const $ = cheerio.load(response.data);
        $("script, style").remove();
        const content = $("main, article, .content, body").text().trim();
        return content || null;
      } catch {
        return null;
      }
    }

    for (const opp of published) {
      checkedCount++;
      let shouldArchive = false;

      // Check 1: deadlineAt < today
      if (opp.deadlineAt && opp.deadlineAt < now) {
        shouldArchive = true;
        deadlineExpiredCount++;
      }

      // Check 2: Summary/title contains expired keywords OR title has past year
      // CRITICAL: Only run heuristic checks if we DON'T have a valid future deadline
      // If we have an explicit future deadline, trust it!
      const hasFutureDeadline = opp.deadlineAt && opp.deadlineAt > now;
      
      if (!shouldArchive && !hasFutureDeadline) {
        if (hasPastYearInTitle(opp.title)) {
             shouldArchive = true;
             summaryExpiredCount++; 
        } else {
             const combinedText = `${opp.title} ${opp.summary}`;
             if (hasExpiredKeywords(combinedText)) {
               shouldArchive = true;
               summaryExpiredCount++;
             }
        }
      }

      // Check 3: Try to find raw item and re-validate with Cleaner
      if (!shouldArchive) {
        try {
          let rawItem = await RawItem.findOne({
            url: opp.officialUrl,
          }).sort({ createdAt: -1 });

          if (!rawItem) {
            const canonicalUrl = canonicalizeUrl(opp.officialUrl);
            rawItem = await RawItem.findOne({
              url: canonicalUrl,
            }).sort({ createdAt: -1 });
          }

          if (!rawItem) {
            try {
              const urlObj = new URL(opp.officialUrl);
              const pathname = urlObj.pathname;
              rawItem = await RawItem.findOne({
                url: {
                  $regex: pathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                },
              }).sort({ createdAt: -1 });
            } catch {
              // URL parsing failed
            }
          }

          if (rawItem && rawItem.content) {
            let contentToCheck = rawItem.content;

            if (rawItem.content.length < 500 && opp.officialUrl) {
              const fullContent = await fetchFullPageContent(opp.officialUrl);
              if (fullContent && fullContent.length > rawItem.content.length) {
                contentToCheck = fullContent;
              }
            }

            if (hasExpiredKeywords(contentToCheck)) {
              shouldArchive = true;
              summaryExpiredCount++;
            } else {
              const nowIso = new Date().toISOString();
              const cleanerInput: CleanerInput = {
                nowIso: nowIso,
                source: opp.source,
                sourceUrl: opp.officialUrl,
                itemUrl: opp.officialUrl,
                rawTitle: opp.title,
                rawContent: contentToCheck,
                rawFetchedAtIso: nowIso,
              };

              const cleaned = cleanAndValidate(cleanerInput);

              if (
                cleaned.status === "archived" ||
                cleaned.status === "rejected" ||
                cleaned.applicationStatus === "expired" ||
                cleaned.applicationStatus === "closed"
              ) {
                shouldArchive = true;
                cleanerExpiredCount++;
              }
            }
          } else {
            noRawItemCount++;
          }
        } catch (error) {
          // Skip on error
        }
      }

      if (shouldArchive) {
        await Opportunity.updateOne(
          { _id: opp._id },
          { $set: { status: "archived" } }
        );
        archivedCount++;
      }
    }

    await AdminAudit.create({
      adminId,
      action: "archive_expired",
      resourceType: "system",
      // resourceId omitted for system-level actions
      after: { archived: archivedCount, checked: checkedCount },
    });

    return {
      archived: archivedCount,
      checked: checkedCount,
      breakdown: {
        deadlineExpired: deadlineExpiredCount,
        summaryExpired: summaryExpiredCount,
        cleanerExpired: cleanerExpiredCount,
        noRawItem: noRawItemCount,
      },
    };
  }

  async resetBadData(adminId: string): Promise<{ modified: number }> {
    const garbageTitleRegex = new RegExp(
      [
        "Πολιτική",
        "Πολιτικη",
        "Δήλωση",
        "Δηλωση",
        "Συχνές",
        "Συχνες",
        "Στατιστικά",
        "Στατιστικα",
        "Κατάλογος",
        "Καταλογος",
        "Δελτία",
        "Δελτια",
        "Ηλεκτρονικές Υπηρεσίες",
        "Ηλεκτρονικες Υπηρεσιες",
        "Κώδικας",
        "Κωδικας",
        "Επικοινωνία",
        "Επικοινωνια",
        "Site map",
        "Sitemap",
        "Cookies",
        "Privacy",
        "Terms",
      ].join("|"),
      "i"
    );

    const genericTitleRegex = new RegExp(
      "^(gov\\.gr|vouchers\\.gov\\.gr|υπουργείο|υπουργειο)\\b",
      "i"
    );

    const garbageUrlRegex = new RegExp(
      [
        "privacy",
        "cookies",
        "terms",
        "politiki",
        "policy",
        "dilosi",
        "statement",
        "faq",
        "sitemap",
        "site-map",
        "contact",
        "epikoinonia",
        "stats",
        "statistika",
        "catalog",
        "katologos",
        "kodikas",
        "code-of-conduct",
      ].join("|"),
      "i"
    );

    const filter: any = {
      $or: [
        { kind: "garbage" },
        { kind: "service_page" },
        { title: garbageTitleRegex },
        { title: genericTitleRegex },
        { officialUrl: garbageUrlRegex },
      ],
    };

    const result = await Opportunity.updateMany(filter, {
      $set: { kind: "service_info" },
    });

    await AdminAudit.create({
      adminId,
      action: "reset_bad_data",
      resourceType: "system",
      // resourceId omitted for system-level actions
      after: { modified: result.modifiedCount ?? 0 },
    });

    return { modified: result.modifiedCount ?? 0 };
  }

  // Contact Management
  async getContactSubmissions(query: {
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<{ submissions: any[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      type: "contact_form",
    };

    if (query.type) {
      filter["data.formType"] = query.type;
    }

    const submissions = await Event.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Event.countDocuments(filter);

    // Transform submissions to a more readable format
    const formattedSubmissions = submissions.map((event) => ({
      _id: event._id,
      name: event.data?.name || "Άγνωστο",
      email: event.data?.email || "N/A",
      subject: event.data?.subject || "Χωρίς θέμα",
      message: event.data?.message || "",
      type: event.data?.formType || "general",
      createdAt: event.createdAt,
    }));

    return { submissions: formattedSubmissions, total };
  }

  async replyToContact(
    submissionId: string,
    replyMessage: string,
    adminId: string
  ): Promise<void> {
    const submission = await Event.findById(submissionId);

    if (!submission || submission.type !== "contact_form") {
      throw new Error("Contact submission not found");
    }

    const contactData = submission.data;
    if (!contactData || !contactData.email || !contactData.message) {
      throw new Error("Invalid contact submission data");
    }

    // Generate and send email
    const emailHtml = generateContactReplyEmail(
      contactData.name || "Χρήστη",
      contactData.message,
      replyMessage
    );

    await sendEmail({
      to: contactData.email,
      subject: `Re: ${contactData.subject || "Απάντηση από BenefitPulse"}`,
      html: emailHtml,
    });

    // Log admin action
    await AdminAudit.create({
      adminId,
      action: "reply_to_contact",
      resourceType: "contact",
      resourceId: submissionId,
      after: {
        to: contactData.email,
        subject: contactData.subject,
      },
    });
  }
}
