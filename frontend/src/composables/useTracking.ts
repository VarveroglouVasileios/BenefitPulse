import { api } from "../api/endpoints";
import { useCookieConsentStore } from "../stores/cookieConsent.store";

// Check cookie consent before tracking
// Returns true ONLY if user explicitly accepted cookies ('accepted')
// Returns false for 'rejected', null, or any other value
function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  const cookieConsentStore = useCookieConsentStore();
  return cookieConsentStore.hasConsent();
}

// Export function to check consent (can be used by other components)
export function hasCookieConsent(): boolean {
  return hasConsent();
}

// Helper to safely call gtag
function gtag(...args: any[]) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag(...args);
  }
}

export function useTracking() {
  // All tracking functions check consent BEFORE sending any data
  // If consent is 'rejected' or not set, NO data is sent to the server
  const trackPageview = (path: string): void => {
    if (!hasConsent()) return; // Early return - no tracking if consent not 'accepted'
    
    // 1. Backend tracking
    api.events
      .track({
        type: "pageview",
        path,
      })
      .catch(console.error);

    // 2. Google Analytics tracking
    gtag('event', 'page_view', {
      page_path: path,
      send_to: 'G-MHM8CCW7QG'
    });
  };

  const trackOpportunityView = (opportunityId: string): void => {
    if (!hasConsent()) return;
    
    api.events
      .track({
        type: "opportunity_view",
        opportunityId,
      })
      .catch(console.error);

    gtag('event', 'view_item', {
      items: [{ item_id: opportunityId }],
      send_to: 'G-MHM8CCW7QG'
    });
  };

  const trackOfficialClick = (opportunityId: string): void => {
    if (!hasConsent()) return;
    
    api.events
      .track({
        type: "official_click",
        opportunityId,
      })
      .catch(console.error);

    gtag('event', 'select_content', {
      content_type: 'opportunity_official_link',
      item_id: opportunityId,
      send_to: 'G-MHM8CCW7QG'
    });
  };

  const trackBookmarkAdd = (opportunityId: string): void => {
    if (!hasConsent()) return;
    
    api.events
      .track({
        type: "bookmark_add",
        opportunityId,
      })
      .catch(console.error);

    gtag('event', 'add_to_wishlist', {
      items: [{ item_id: opportunityId }],
      send_to: 'G-MHM8CCW7QG'
    });
  };

  const trackBookmarkRemove = (opportunityId: string): void => {
    if (!hasConsent()) return;
    
    api.events
      .track({
        type: "bookmark_remove",
        opportunityId,
      })
      .catch(console.error);
  };

  return {
    trackPageview,
    trackOpportunityView,
    trackOfficialClick,
    trackBookmarkAdd,
    trackBookmarkRemove,
  };
}
