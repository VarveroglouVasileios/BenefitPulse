import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { EventsService } from "./events.service";
import { eventDataSchema } from "../../../../shared/src/zodSchemas";

const eventsService = new EventsService();

export async function trackEvent(
  req: Request | AuthRequest,
  res: Response
): Promise<void> {
  try {
    const data = eventDataSchema.parse(req.body);
    const authReq = req as AuthRequest;
    const userId = authReq.userId;
    const sessionId = (req.headers["x-session-id"] as string) || data.sessionId;

    await eventsService.trackEvent(data, sessionId, userId);
    res.status(201).json({ message: "Event tracked" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
