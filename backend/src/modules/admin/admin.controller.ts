import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AdminService } from './admin.service';
import { matchingQueue } from '../../jobs/queues';
import { isValidObjectId } from '../../utils/validation';
import { config } from '../../config/env';
import { adminOpportunityCreateSchema, adminOpportunityUpdateSchema } from '../../shared/zodSchemas';
import { safeParsePage, safeParseLimit, isValidAdminStatus, isValidOpportunityType } from '../../utils/validation';

const adminService = new AdminService();

// CMS - Opportunities
export async function createOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = adminOpportunityCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors.map((e) => e.message).join('; ') });
      return;
    }
    const adminId = req.userId!;
    const opportunity = await adminService.createOpportunity(parsed.data, adminId);
    res.status(201).json(opportunity);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production'
      ? 'Failed to create opportunity'
      : error.message;
    res.status(400).json({ error: errorMessage });
  }
}

export async function updateOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.userId!;
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }

    const parsed = adminOpportunityUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors.map((e) => e.message).join('; ') });
      return;
    }
    const opportunity = await adminService.updateOpportunity(id, parsed.data, adminId);
    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.status(200).json(opportunity);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Failed to update opportunity' 
      : error.message;
    res.status(400).json({ error: errorMessage });
  }
}

export async function publishOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.userId!;
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }
    
    const opportunity = await adminService.publishOpportunity(id, adminId);
    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }

    // Enqueue background job to recompute matches for this opportunity
    try {
      await matchingQueue.add("recompute-opportunity-matches", { opportunityId: id });
    } catch (queueError) {
      console.error("Failed to enqueue matching job for published opportunity:", queueError);
    }

    res.status(200).json(opportunity);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Failed to publish opportunity' 
      : error.message;
    res.status(400).json({ error: errorMessage });
  }
}

export async function unpublishOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.userId!;
    const { id } = req.params;
    const opportunity = await adminService.unpublishOpportunity(id, adminId);
    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.status(200).json(opportunity);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Failed to unpublish opportunity' 
      : error.message;
    res.status(400).json({ error: errorMessage });
  }
}

export async function archiveOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.userId!;
    const { id } = req.params;
    const opportunity = await adminService.archiveOpportunity(id, adminId);
    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.status(200).json(opportunity);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Failed to archive opportunity' 
      : error.message;
    res.status(400).json({ error: errorMessage });
  }
}

export async function deleteOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.userId!;
    const { id } = req.params;
    await adminService.deleteOpportunity(id, adminId);
    res.status(200).json({ message: 'Opportunity deleted' });
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Failed to delete opportunity' 
      : error.message;
    res.status(400).json({ error: errorMessage });
  }
}

export async function restoreOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.userId!;
    const { id } = req.params;
    const opportunity = await adminService.restoreOpportunity(id, adminId);
    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.status(200).json(opportunity);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Failed to restore opportunity' 
      : error.message;
    res.status(400).json({ error: errorMessage });
  }
}

export async function getAdminOpportunities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page, limit, status, type, showRejected, showTendersNews, search } = req.query;
    const validatedStatus = isValidAdminStatus(status) ? status : undefined;
    const validatedType = isValidOpportunityType(type) ? type : undefined;
    const result = await adminService.getOpportunities({
      page: safeParsePage(page),
      limit: safeParseLimit(limit),
      status: validatedStatus,
      type: validatedType,
      showRejected: (showRejected as unknown) === "true" || (showRejected as unknown) === true,
      showTendersNews: (showTendersNews as unknown) === "true" || (showTendersNews as unknown) === true,
      search: search as string,
    });
    res.status(200).json(result);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getAdminOpportunityById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const opportunity = await adminService.getOpportunityById(id);
    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.status(200).json(opportunity);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

// Moderation
export async function getDraftQueue(req: AuthRequest, res: Response): Promise<void> {
  try {
    const drafts = await adminService.getDraftQueue();
    res.status(200).json(drafts);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getRawItems(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { processed } = req.query;
    const items = await adminService.getRawItems({
      processed: processed === 'true' ? true : processed === 'false' ? false : undefined,
    });
    res.status(200).json(items);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

// Metrics
export async function getOverviewMetrics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const metrics = await adminService.getOverviewMetrics();
    res.status(200).json(metrics);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getTimeseriesMetrics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const days = Math.min(365, Math.max(1, parseInt(String(req.query.days), 10) || 30));
    const metrics = await adminService.getTimeseriesMetrics(days);
    res.status(200).json(metrics);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getTopRoutes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const limit = safeParseLimit(req.query.limit, 50);
    const routes = await adminService.getTopRoutes(limit);
    res.status(200).json(routes);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getTopOpportunities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const limit = safeParseLimit(req.query.limit, 50);
    const opportunities = await adminService.getTopOpportunities(limit);
    res.status(200).json(opportunities);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

// Audit
export async function getAuditLog(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page, limit, adminId, resourceType } = req.query;
    const result = await adminService.getAuditLog({
      page: safeParsePage(page),
      limit: safeParseLimit(limit),
      adminId: typeof adminId === "string" ? adminId : undefined,
      resourceType: typeof resourceType === "string" ? resourceType : undefined,
    });
    res.status(200).json(result);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

// Admin Actions - Manual Triggers
export async function triggerIngestion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.userId!;
    const result = await adminService.triggerIngestion(adminId);
    res.status(200).json(result);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function archiveExpired(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.userId!;
    const result = await adminService.archiveExpiredOpportunities(adminId);
    res.status(200).json(result);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function resetBadData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.userId!;
    const result = await adminService.resetBadData(adminId);
    res.status(200).json(result);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

// Contact Management
const VALID_CONTACT_TYPES = ["error", "source", "general"] as const;
export async function getContactSubmissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page, limit, type } = req.query;
    const validatedType = typeof type === "string" && VALID_CONTACT_TYPES.includes(type as any) ? type : undefined;
    const result = await adminService.getContactSubmissions({
      page: safeParsePage(page),
      limit: safeParseLimit(limit),
      type: validatedType,
    });
    res.status(200).json(result);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function replyToContact(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.userId!;
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: "Το μήνυμα είναι υποχρεωτικό" });
      return;
    }

    await adminService.replyToContact(id, message, adminId);
    res.status(200).json({ message: "Η απάντηση στάλθηκε επιτυχώς" });
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}
