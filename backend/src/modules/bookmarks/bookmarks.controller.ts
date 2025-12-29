import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { BookmarksService } from './bookmarks.service';
import { config } from '../../config/env';

const bookmarksService = new BookmarksService();

export async function getBookmarks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const bookmarks = await bookmarksService.getBookmarks(userId);
    res.status(200).json(bookmarks);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function addBookmark(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { opportunityId } = req.params;
    const bookmark = await bookmarksService.addBookmark(userId, opportunityId);
    res.status(201).json(bookmark);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Failed to add bookmark' 
      : error.message;
    res.status(400).json({ error: errorMessage });
  }
}

export async function removeBookmark(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { opportunityId } = req.params;
    await bookmarksService.removeBookmark(userId, opportunityId);
    res.status(200).json({ message: 'Bookmark removed' });
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}
