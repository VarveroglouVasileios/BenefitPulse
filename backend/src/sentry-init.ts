/**
 * Initialize Sentry before any other imports.
 * Must be imported first in main.ts so Express can be instrumented.
 */
import * as Sentry from "@sentry/node";
import { config } from "./config/env";

if (config.sentry.enabled) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.nodeEnv,
    tracesSampleRate: config.sentry.tracesSampleRate,
    profilesSampleRate: config.sentry.profilesSampleRate,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      Sentry.mongoIntegration(),
    ],
  });
}
