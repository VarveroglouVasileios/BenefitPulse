import { defineStore } from "pinia";
import { ref } from "vue";

type ConsentStatus = "accepted" | "rejected" | null;

const COOKIE_CONSENT_KEY = "cookie_consent";

// Helper functions to read/write cookies (not localStorage)
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export const useCookieConsentStore = defineStore("cookieConsent", () => {
  // Initialize from cookie on store creation
  const initialConsent = getCookie(COOKIE_CONSENT_KEY) as ConsentStatus;
  const consent = ref<ConsentStatus>(initialConsent);

  function setConsent(status: "accepted" | "rejected"): void {
    consent.value = status;
    // Store in cookie (not localStorage) - persists across page refreshes
    setCookie(COOKIE_CONSENT_KEY, status, 365); // 1 year expiration
  }

  function hasConsent(): boolean {
    // Check both memory and cookie (in case store was reset)
    return consent.value === "accepted" || getCookie(COOKIE_CONSENT_KEY) === "accepted";
  }

  function getConsent(): ConsentStatus {
    // Check cookie first, then memory
    const cookieConsent = getCookie(COOKIE_CONSENT_KEY) as ConsentStatus;
    return cookieConsent || consent.value;
  }

  return {
    consent,
    setConsent,
    hasConsent,
    getConsent,
  };
});

