import { Request, Response } from 'express';
import { StatsService } from './stats.service';

const statsService = new StatsService();

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await statsService.getPublicStats();
    res.status(200).json(stats);
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
}



