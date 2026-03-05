import { Bookmark, IBookmark } from '../../models/bookmark.model';
import { Opportunity } from '../../models/opportunity.model';

export class BookmarksService {
  async getBookmarks(userId: string): Promise<IBookmark[]> {
    return Bookmark.find({ userId }).populate('opportunityId');
  }

  async addBookmark(userId: string, opportunityId: string): Promise<IBookmark> {
    const existing = await Bookmark.findOne({ userId, opportunityId });
    if (existing) {
      return existing;
    }

    // Verify opportunity exists
    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    return Bookmark.create({ userId, opportunityId });
  }

  async removeBookmark(userId: string, opportunityId: string): Promise<void> {
    await Bookmark.findOneAndDelete({ userId, opportunityId });
  }

  async isBookmarked(userId: string, opportunityId: string): Promise<boolean> {
    const bookmark = await Bookmark.findOne({ userId, opportunityId });
    return !!bookmark;
  }
}
