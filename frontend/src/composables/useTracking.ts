import { api } from '../api/endpoints';

const COOKIE_CONSENT_KEY = 'benefitpulse_cookie_consent';

// Check cookie consent before tracking
function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted';
}

// Export function to check consent (can be used by other components)
export function hasCookieConsent(): boolean {
  return hasConsent();
}

export function useTracking() {
  const trackPageview = (path: string): void => {
    if (!hasConsent()) return;
    api.events.track({
      type: 'pageview',
      path,
    }).catch(console.error);
  };

  const trackOpportunityView = (opportunityId: string): void => {
    if (!hasConsent()) return;
    api.events.track({
      type: 'opportunity_view',
      opportunityId,
    }).catch(console.error);
  };

  const trackOfficialClick = (opportunityId: string): void => {
    if (!hasConsent()) return;
    api.events.track({
      type: 'official_click',
      opportunityId,
    }).catch(console.error);
  };

  const trackBookmarkAdd = (opportunityId: string): void => {
    if (!hasConsent()) return;
    api.events.track({
      type: 'bookmark_add',
      opportunityId,
    }).catch(console.error);
  };

  const trackBookmarkRemove = (opportunityId: string): void => {
    if (!hasConsent()) return;
    api.events.track({
      type: 'bookmark_remove',
      opportunityId,
    }).catch(console.error);
  };

  return {
    trackPageview,
    trackOpportunityView,
    trackOfficialClick,
    trackBookmarkAdd,
    trackBookmarkRemove,
  };
}
