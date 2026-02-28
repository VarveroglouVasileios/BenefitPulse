import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { OpportunitiesService } from './opportunities.service';
import { config } from '../../config/env';

const opportunitiesService = new OpportunitiesService();

export async function getOpportunities(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit, type, status, search, tab } = req.query;
    const result = await opportunitiesService.getPublicOpportunities({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      type: type as string,
      status: status as string,
      search: search as string,
      tab: tab as "active" | "results" | "news" | "archived" | "upcoming" | "current" | "all",
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
    const { tab, page, limit, search } = req.query;

    // Admin-only flags: only honor if user is authenticated as admin
    const isAdmin = !!(req as any).userId && (req as any).isAdmin;
    const showRejected = isAdmin && (req.query.showRejected === "true" || req.query.showRejected === "1");
    const showTendersNews = isAdmin && (req.query.showTendersNews === "true" || req.query.showTendersNews === "1");

    const result = await opportunitiesService.getFeed({
      tab: tab as "news" | "upcoming" | "current" | "all",
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
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
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
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
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
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
