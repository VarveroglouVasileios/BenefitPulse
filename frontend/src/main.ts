import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// Apply theme immediately before app initialization to prevent flash (system preference only)
(function applyThemeBeforeMount() {
  const root = document.documentElement;
  // Use system preference initially, will be updated when user profile loads
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
})();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');
