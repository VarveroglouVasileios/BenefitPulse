import { api } from '../api/endpoints';

export function useTracking() {
  const trackPageview = (path: string): void => {
    api.events.track({
      type: 'pageview',
      path,
    }).catch(console.error);
  };

  const trackOpportunityView = (opportunityId: string): void => {
    api.events.track({
      type: 'opportunity_view',
      opportunityId,
    }).catch(console.error);
  };

  const trackOfficialClick = (opportunityId: string): void => {
    api.events.track({
      type: 'official_click',
      opportunityId,
    }).catch(console.error);
  };

  const trackBookmarkAdd = (opportunityId: string): void => {
    api.events.track({
      type: 'bookmark_add',
      opportunityId,
    }).catch(console.error);
  };

  const trackBookmarkRemove = (opportunityId: string): void => {
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
