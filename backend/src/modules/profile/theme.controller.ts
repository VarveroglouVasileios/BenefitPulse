import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { ProfileService } from './profile.service';

const profileService = new ProfileService();

export async function updateTheme(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { theme } = req.body;

    if (theme !== "light" && theme !== "dark") {
      res.status(400).json({ error: "Theme must be 'light' or 'dark'" });
      return;
    }

    await profileService.updateProfile(userId, { theme });
    res.status(200).json({ theme });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}



