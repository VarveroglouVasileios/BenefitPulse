import { Event, IEvent } from "../../models/event.model";
import { Session } from "../../models/session.model";
import { UserProfile } from "../../models/profile.model";
import { EventData } from "../../../../shared/src/types";

export class EventsService {
  async trackEvent(
    data: EventData,
    sessionId?: string,
    userId?: string
  ): Promise<IEvent> {
    // Update session
    if (sessionId) {
      await Session.findOneAndUpdate(
        { sessionId },
        { lastAt: new Date() },
        { upsert: true }
      );
    }

    // Update user profile lastVisitAt
    if (userId) {
      await UserProfile.findOneAndUpdate(
        { userId },
        { lastVisitAt: new Date() }
      );
    }

    return Event.create({
      type: data.type,
      path: data.path,
      opportunityId: data.opportunityId,
      userId: userId,
      sessionId: sessionId || data.sessionId,
      data: data.data, // Store additional data if provided
    });
  }
}
