import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/benefitpulse',
  },
  
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  jwt: {
    secret: (() => {
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
      if (process.env.NODE_ENV === 'production' && secret === 'your-super-secret-jwt-key-change-in-production') {
        console.warn('SECURITY: JWT_SECRET is not set; using default. Set JWT_SECRET in production.');
      }
      return secret;
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  },
  
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@benefitpulse.gr',
    password: process.env.ADMIN_PASSWORD || 'change-me-in-production',
  },
  
  aiExtractor: {
    url: process.env.AI_EXTRACTOR_URL || 'http://localhost:8000/extract',
    apiKey: process.env.AI_EXTRACTOR_API_KEY || '',
  },
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
  },
  
  chatbot: {
    apiKey: process.env.GROQ_API_KEY || process.env.CHATBOT_API_KEY || process.env.AI_EXTRACTOR_API_KEY || '',
    apiUrl: process.env.CHATBOT_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
    model: process.env.CHATBOT_MODEL || 'llama-3.3-70b-versatile',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  ingestion: {
    debug: process.env.INGESTION_DEBUG === 'true',
  },
  
  analytics: {
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90', 10),
  },
  
  sentry: {
    enabled: !!process.env.SENTRY_DSN,
    dsn: process.env.SENTRY_DSN || '',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0'),
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      } : undefined,
    },
    from: process.env.EMAIL_FROM || 'noreply@benefitpulse.gr',
    fromName: process.env.EMAIL_FROM_NAME || 'BenefitPulse',
  },

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    mailto: process.env.VAPID_MAILTO || 'mailto:admin@benefitpulse.gr',
  },
};
