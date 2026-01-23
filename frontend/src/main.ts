import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createHead } from '@unhead/vue/client';
import App from './App.vue';
import router from './router';
import { registerSW } from 'virtual:pwa-register';
import * as Sentry from '@sentry/vue';

// Apply theme immediately before app initialization to prevent flash
(function applyThemeBeforeMount() {
  const root = document.documentElement;
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
})();

const app = createApp(App);
const pinia = createPinia();
const head = createHead();

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    app,
    dsn: sentryDsn,
    environment: import.meta.env.MODE ?? 'development',
    integrations: [
      Sentry.browserTracingIntegration({
        router,
      }),
    ],
    tracePropagationTargets: ["localhost", /^https?:\/\/benefitpulse/i],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
}

app.use(pinia);
app.use(router);
app.use(head);


// Register Service Worker
registerSW({
  onNeedRefresh() {},
  onOfflineReady() {},
});

app.mount('#app');
