import dotenv from "dotenv";

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/benefitpulse",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  session: {
    secret:
      process.env.SESSION_SECRET || "your-session-secret-change-in-production",
  },

  admin: {
    email: process.env.ADMIN_EMAIL || "admin@benefitpulse.gr",
    password: process.env.ADMIN_PASSWORD || "change-me-in-production",
  },

  aiExtractor: {
    url: process.env.AI_EXTRACTOR_URL || "http://localhost:8000/extract",
    apiKey: process.env.AI_EXTRACTOR_API_KEY || "",
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
  },

  chatbot: {
    model: process.env.CHATBOT_MODEL || "llama-3.3-70b-versatile",
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },

  ingestion: {
    debug: process.env.INGESTION_DEBUG === "true",
  },

  analytics: {
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || "90", 10),
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
    },
    from: process.env.EMAIL_FROM || "noreply@benefitpulse.gr",
    fromName: process.env.EMAIL_FROM_NAME || "BenefitPulse",
  },
};
