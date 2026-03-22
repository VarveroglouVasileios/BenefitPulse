import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { OpportunitiesService } from './opportunities.service';
import { config } from '../../config/env';
import { safeParsePage, safeParseLimit, isValidOpportunityType, isValidOpportunityTab, isValidFeedTab, isValidCategoryTag } from '../../utils/validation';

const opportunitiesService = new OpportunitiesService();

export async function getOpportunities(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit, type, status, search, tab, tag } = req.query;
    const validatedTab = isValidOpportunityTab(tab) ? (tab as "active" | "results" | "news" | "archived" | "upcoming" | "current" | "all") : undefined;
    const validatedType = isValidOpportunityType(type) ? type : undefined;
    const validatedTag = isValidCategoryTag(tag) ? tag : undefined;
    const result = await opportunitiesService.getPublicOpportunities({
      page: safeParsePage(page),
      limit: safeParseLimit(limit),
      type: validatedType,
      status: typeof status === 'string' ? status : undefined,
      search: typeof search === 'string' ? search : undefined,
      tab: validatedTab,
      tag: validatedTag,
    });
    res.status(200).json(result);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getFeed(req: Request, res: Response): Promise<void> {
  try {
    const { tab, page, limit, search, tag, type, source, kind } = req.query;

    // Admin-only flags: only honor if user is authenticated as admin
    const isAdmin = !!(req as AuthRequest).userId && (req as AuthRequest).userRole === 'admin';
    const showRejected = isAdmin && (req.query.showRejected === "true" || req.query.showRejected === "1");
    const showTendersNews = isAdmin && (req.query.showTendersNews === "true" || req.query.showTendersNews === "1");

    const validatedTab: "news" | "upcoming" | "current" | "all" = isValidFeedTab(tab) ? (tab as "news" | "upcoming" | "current" | "all") : "all";
    const validatedTag = isValidCategoryTag(tag) ? tag : undefined;
    const result = await opportunitiesService.getFeed({
      tab: validatedTab,
      page: safeParsePage(page),
      limit: safeParseLimit(limit),
      search: typeof search === 'string' ? search : undefined,
      tag: validatedTag,
      type: typeof type === 'string' ? type : undefined,
      source: typeof source === 'string' ? source : undefined,
      kind: typeof kind === 'string' ? kind : undefined,
      showRejected,
      showTendersNews,
    });
    res.status(200).json(result);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getOpportunityById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const opportunity = await opportunitiesService.getOpportunityById(id);
    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.status(200).json(opportunity);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getTrending(req: Request, res: Response): Promise<void> {
  try {
    const hours = Math.min(168, Math.max(1, parseInt(String(req.query.hours), 10) || 24));
    const opportunities = await opportunitiesService.getTrending(hours);
    res.status(200).json(opportunities);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getMatchedOpportunities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const opportunities = await opportunitiesService.getMatchedOpportunities(userId);
    res.status(200).json(opportunities);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getForYouOpportunities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const result = await opportunitiesService.getForYouOpportunities(userId);
    res.status(200).json(result);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getTodayOpportunities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const opportunities = await opportunitiesService.getTodayOpportunities(userId);
    res.status(200).json(opportunities);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getNewSinceLastVisit(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const opportunities = await opportunitiesService.getNewSinceLastVisit(userId);
    res.status(200).json(opportunities);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getExpiringSoon(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const days = Math.min(365, Math.max(1, parseInt(String(req.query.days), 10) || 30));
    const opportunities = await opportunitiesService.getExpiringSoon(userId, days);
    res.status(200).json(opportunities);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function getMatchReasons(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await opportunitiesService.getMatchReasons(userId, id);
    res.status(200).json(result);
  } catch (error: any) {
    // Don't expose internal error details in production
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}
