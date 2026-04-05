import * as dotenv from "dotenv";
import * as path from "path";

const nodeEnv = process.env.NODE_ENV || "development";
const envPath = path.resolve(process.cwd(), `.env.${nodeEnv}`);

dotenv.config({ path: envPath });
// Fallback to default .env if specific one doesn't exist
dotenv.config();

export const config = {
  nodeEnv,
  port: parseInt(process.env.PORT || "3001", 10),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5174",

  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/benefitpulse",
  },

  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: (() => {
      const defaultSecret = "your-super-secret-jwt-key-change-in-production";
      const secret = process.env.JWT_SECRET || defaultSecret;
      if (process.env.NODE_ENV === "production" && secret === defaultSecret) {
        console.error(
          "SECURITY: JWT_SECRET must be set in production. Refusing to start.",
        );
        process.exit(1);
      }
      return secret;
    })(),
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

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
  },

  googleAi: {
    apiKey: process.env.GEMINI_API_KEY || "",
    apiUrl:
      process.env.GOOGLE_AI_API_URL ||
      "https://generativelanguage.googleapis.com/v1beta",
    model: process.env.GOOGLE_AI_MODEL || "gemini-3.1-flash-lite-preview",
    fallbackModels: (process.env.GOOGLE_AI_FALLBACK_MODELS ||
      "gemini-2.5-flash-lite,gemini-2.5-flash").split(",")
      .map((m) => m.trim())
      .filter(Boolean),
    rpm: parseInt(process.env.GOOGLE_AI_RPM || "10", 10),
    rpd: parseInt(process.env.GOOGLE_AI_RPD || "500", 10),
    minIntervalMs: parseInt(process.env.GOOGLE_AI_MIN_INTERVAL_MS || "7000", 10),
    embeddingModel:
      process.env.GOOGLE_AI_EMBEDDING_MODEL || "gemini-embedding-001",
    embeddingRpm: parseInt(process.env.GOOGLE_AI_EMBEDDING_RPM || "60", 10),
    embeddingRpd: parseInt(process.env.GOOGLE_AI_EMBEDDING_RPD || "1000", 10),
    embeddingMinIntervalMs: parseInt(
      process.env.GOOGLE_AI_EMBEDDING_MIN_INTERVAL_MS || "1000",
      10,
    ),
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.1-8b-instant",
  },

  chatbot: {
    apiKey:
      process.env.GROQ_API_KEY ||
      process.env.CHATBOT_API_KEY ||
      process.env.AI_EXTRACTOR_API_KEY ||
      "",
    apiUrl:
      process.env.CHATBOT_API_URL ||
      "https://api.groq.com/openai/v1/chat/completions",
    model: process.env.CHATBOT_MODEL || "llama-3.3-70b-versatile",
    primaryModel:
      process.env.CHATBOT_PRIMARY_MODEL || "llama-3.3-70b-versatile",
    fallbackModel:
      process.env.CHATBOT_FALLBACK_MODEL || "llama-3.1-8b-instant",
    primaryRpm: parseInt(process.env.CHATBOT_PRIMARY_RPM || "20", 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },

  ingestion: {
    debug: process.env.INGESTION_DEBUG === "true",
    sourceTimeoutMs: parseInt(
      process.env.INGESTION_SOURCE_TIMEOUT_MS || "35000",
      10,
    ),
    aiThrottleMs: parseInt(process.env.INGESTION_AI_THROTTLE_MS || "35000", 10),
  },

  analytics: {
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || "90", 10),
  },

  sentry: {
    enabled: !!process.env.SENTRY_DSN,
    dsn: process.env.SENTRY_DSN || "",
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0"),
    profilesSampleRate: parseFloat(
      process.env.SENTRY_PROFILES_SAMPLE_RATE || "0",
    ),
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

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    mailto: process.env.VAPID_MAILTO || "mailto:admin@benefitpulse.gr",
  },
};
