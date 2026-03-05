// Polyfill for Node 16 (undici expects Blob/ReadableStream). Remove on Node 18+.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Blob } = require("buffer");
if (!(global as any).Blob) {
  (global as any).Blob = Blob;
}

// Minimal File polyfill using Blob
if (!(global as any).File) {
  class PolyfillFile extends Blob {
    name: string;
    lastModified: number;
    constructor(parts: any[], name: string, options: any = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  }
  (global as any).File = PolyfillFile;
}

// Minimal DOMException polyfill
if (!(global as any).DOMException) {
  class PolyfillDOMException extends Error {
    name: string;
    constructor(message = "", name = "DOMException") {
      super(message);
      this.name = name;
    }
  }
  (global as any).DOMException = PolyfillDOMException;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("web-streams-polyfill/polyfill");

// Sentry must be initialized before Express is imported
import "./sentry-init";

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectMongo } from "./db/mongo";
import { config } from "./config/env";
import { securityMiddleware, rateLimiter, contactRateLimiter } from "./config/security";
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from "./middleware/auth.middleware";
import { validateObjectId, validateObjectIdParam } from "./middleware/validation.middleware";
import * as Sentry from "@sentry/node";

import { Opportunity } from "./models/opportunity.model";
import { UserProfile } from "./models/profile.model";
import { UserOpportunity } from "./models/userOpportunity.model";
import { evaluateMatch } from "./rules/evaluate";
import { CriteriaRules } from "./shared/rulesTypes";

// Import models to ensure they're registered
import "./models";

// Auth routes
import * as authController from "./modules/auth/auth.controller";

// Profile routes
import * as profileController from "./modules/profile/profile.controller";

// Opportunities routes
import * as opportunitiesController from "./modules/opportunities/opportunities.controller";
import * as statsController from "./modules/opportunities/stats.controller";

// Bookmarks routes
import * as bookmarksController from "./modules/bookmarks/bookmarks.controller";

// Events routes
import * as eventsController from "./modules/events/events.controller";

// Admin routes
import * as adminController from "./modules/admin/admin.controller";

// Schedules
import { scheduleIngestionJobs } from "./jobs/schedules";

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser()); // Parse cookies
app.use(cors({ 
  origin: config.frontendUrl,
  credentials: true, // Allow cookies to be sent
}));
app.use(securityMiddleware);

// Rate limiting - always enabled; protects against brute force and DoS
app.use(rateLimiter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Debug endpoints (dev only) - protected: admin auth required
if (config.nodeEnv !== "production") {
  app.get("/api/debug/counts", authMiddleware, adminMiddleware, async (_req, res) => {
    const [draft, published, archived] = await Promise.all([
      Opportunity.countDocuments({ status: "draft", deletedAt: null }),
      Opportunity.countDocuments({ status: "published", deletedAt: null }),
      Opportunity.countDocuments({ status: "archived", deletedAt: null }),
    ]);

    const latest = await Opportunity.find({ deletedAt: null })
      .sort({ publishedAt: -1 })
      .limit(10)
      .select("title status source officialUrl publishedAt");

    res.json({ draft, published, archived, latest });
  });

  app.get("/api/debug/profile/:userId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = await UserProfile.findOne({ userId });
      if (!profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }
      res.json(profile.toObject());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/debug/matching/:userId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;

      const profile = await UserProfile.findOne({ userId });
      if (!profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }

      const now = new Date();
      const [matchedCount, notMatchedCount, unknownCount, samples] =
        await Promise.all([
          UserOpportunity.countDocuments({ userId, matchStatus: "matched" }),
          UserOpportunity.countDocuments({ userId, matchStatus: "not_matched" }),
          UserOpportunity.countDocuments({ userId, matchStatus: "unknown" }),
          UserOpportunity.find({ userId })
            .sort({ updatedAt: -1 })
            .limit(10)
            .populate("opportunityId"),
        ]);

      const sampleDetails = samples.map((uo) => ({
        opportunityId: (uo.opportunityId as any)?._id,
        title: (uo.opportunityId as any)?.title,
        matchStatus: uo.matchStatus,
        matched: uo.matched,
        reasons: uo.reasons,
        missingFields: uo.missingFields,
        confidence: uo.confidence,
      }));

      res.json({
        profile: profile.toObject(),
        counts: {
          matched: matchedCount,
          not_matched: notMatchedCount,
          unknown: unknownCount,
        },
        samples: sampleDetails,
      });
    } catch (error: any) {
      console.error("Debug matching error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}

// Auth routes
app.post("/api/auth/register", authController.register);
app.post("/api/auth/login", authController.login);
app.get("/api/auth/me", authMiddleware, authController.me);
app.post("/api/auth/logout", authMiddleware, authController.logout);

// Profile routes
import * as themeController from "./modules/profile/theme.controller";
app.get("/api/profile", authMiddleware, profileController.getProfile);
app.put("/api/profile", authMiddleware, profileController.updateProfile);
app.put("/api/profile/theme", authMiddleware, themeController.updateTheme);

// Public opportunities routes
app.get("/api/opportunities", opportunitiesController.getOpportunities);
app.get("/api/feed", optionalAuthMiddleware, opportunitiesController.getFeed); // Feed with optional admin filters
app.get("/api/opportunities/trending", opportunitiesController.getTrending);
app.get("/api/opportunities/:id", validateObjectId, opportunitiesController.getOpportunityById);
app.get("/api/stats", statsController.getStats);

// User opportunities routes
app.get(
  "/api/me/opportunities/matched",
  authMiddleware,
  opportunitiesController.getMatchedOpportunities
);
app.get(
  "/api/me/opportunities/for-you",
  authMiddleware,
  opportunitiesController.getForYouOpportunities
);
app.get(
  "/api/me/opportunities/today",
  authMiddleware,
  opportunitiesController.getTodayOpportunities
);
app.get(
  "/api/me/opportunities/new-since-last-visit",
  authMiddleware,
  opportunitiesController.getNewSinceLastVisit
);
app.get(
  "/api/me/opportunities/expiring-soon",
  authMiddleware,
  opportunitiesController.getExpiringSoon
);
app.get(
  "/api/opportunities/:id/match-reasons",
  authMiddleware,
  validateObjectId,
  opportunitiesController.getMatchReasons
);

// Bookmarks routes
app.get("/api/me/bookmarks", authMiddleware, bookmarksController.getBookmarks);
app.post(
  "/api/me/bookmarks/:opportunityId",
  authMiddleware,
  validateObjectIdParam("opportunityId"),
  bookmarksController.addBookmark
);
app.delete(
  "/api/me/bookmarks/:opportunityId",
  authMiddleware,
  validateObjectIdParam("opportunityId"),
  bookmarksController.removeBookmark
);

// Events route
app.post("/api/events", eventsController.trackEvent);

// Notifications routes
import { notificationsRoutes } from "./routes/notifications.routes";
app.use("/api/notifications", notificationsRoutes);

// Contact route (rate-limited to prevent abuse)
import * as contactController from "./modules/contact/contact.controller";
app.post("/api/contact", contactRateLimiter, contactController.submitContact);

// Chatbot route
import * as chatbotController from "./modules/chatbot/chatbot.controller";
app.post("/api/chatbot/chat", chatbotController.chat);

// Admin routes
app.get(
  "/api/admin/opportunities",
  authMiddleware,
  adminMiddleware,
  adminController.getAdminOpportunities
);
app.get(
  "/api/admin/opportunities/:id",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  adminController.getAdminOpportunityById
);
app.post(
  "/api/admin/opportunities",
  authMiddleware,
  adminMiddleware,
  adminController.createOpportunity
);
app.put(
  "/api/admin/opportunities/:id",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  adminController.updateOpportunity
);
app.post(
  "/api/admin/opportunities/:id/publish",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  adminController.publishOpportunity
);
app.post(
  "/api/admin/opportunities/:id/unpublish",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  adminController.unpublishOpportunity
);
app.post(
  "/api/admin/opportunities/:id/archive",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  adminController.archiveOpportunity
);
app.delete(
  "/api/admin/opportunities/:id",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  adminController.deleteOpportunity
);
app.post(
  "/api/admin/opportunities/:id/restore",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  adminController.restoreOpportunity
);

app.get(
  "/api/admin/raw-items",
  authMiddleware,
  adminMiddleware,
  adminController.getRawItems
);
app.get(
  "/api/admin/draft-queue",
  authMiddleware,
  adminMiddleware,
  adminController.getDraftQueue
);

app.get(
  "/api/admin/metrics/overview",
  authMiddleware,
  adminMiddleware,
  adminController.getOverviewMetrics
);
app.get(
  "/api/admin/metrics/timeseries",
  authMiddleware,
  adminMiddleware,
  adminController.getTimeseriesMetrics
);
app.get(
  "/api/admin/metrics/top-routes",
  authMiddleware,
  adminMiddleware,
  adminController.getTopRoutes
);
app.get(
  "/api/admin/metrics/top-opportunities",
  authMiddleware,
  adminMiddleware,
  adminController.getTopOpportunities
);

app.get(
  "/api/admin/audit",
  authMiddleware,
  adminMiddleware,
  adminController.getAuditLog
);

// Admin Actions - Manual Triggers
app.post(
  "/api/admin/actions/ingest",
  authMiddleware,
  adminMiddleware,
  adminController.triggerIngestion
);
app.post(
  "/api/admin/actions/archive-expired",
  authMiddleware,
  adminMiddleware,
  adminController.archiveExpired
);
app.post(
  "/api/admin/actions/reset-bad-data",
  authMiddleware,
  adminMiddleware,
  adminController.resetBadData
);

// Contact Management
app.get(
  "/api/admin/contact",
  authMiddleware,
  adminMiddleware,
  adminController.getContactSubmissions
);
app.post(
  "/api/admin/contact/:id/reply",
  authMiddleware,
  adminMiddleware,
  adminController.replyToContact
);

// Sentry error handler must be before any other error middleware
if (config.sentry.enabled) {
  Sentry.setupExpressErrorHandler(app);
}

// Fallback error handler to avoid leaking stack traces
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

async function start() {
  try {
    await connectMongo();
    await scheduleIngestionJobs();

    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
