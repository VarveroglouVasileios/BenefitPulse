import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { ProfileService } from './profile.service';
import { matchingQueue } from '../../jobs/queues';
import { userProfileSchema } from '../../../../shared/src/zodSchemas';
import { config } from '../../config/env';

const profileService = new ProfileService();

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const profile = await profileService.getProfile(userId);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    const obj = profile.toObject();
    // Return all fields including ASEP qualifications
    const response = {
      userId: obj.userId,
      ageRange: obj.ageRange,
      incomeRange: obj.incomeRange,
      employmentStatus: obj.employmentStatus,
      isStudent: obj.isStudent,
      region: obj.region,
      theme: obj.theme,
      lastVisitAt: obj.lastVisitAt,
      // ASEP Qualifications
      highestEducationLevel: obj.highestEducationLevel,
      degrees: obj.degrees,
      languages: obj.languages,
      itSkills: obj.itSkills,
      licenses: obj.licenses,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
    res.status(200).json(response);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const parseResult = userProfileSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      res.status(400).json({
        error: "Validation failed",
        errors,
      });
      return;
    }

    const updates = parseResult.data;
    const profile = await profileService.updateProfile(userId, updates);

    // Enqueue background job to recompute matches for this user
    try {
      await matchingQueue.add("recompute-user-matches", { userId });
    } catch (queueError) {
      console.error("Failed to enqueue matching job for user profile update:", queueError);
    }

    res.status(200).json(profile);
  } catch (error: any) {
    const errorMessage = config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
}
