import { UserProfile, IUserProfile } from "../../models/profile.model";
import { UserProfile as ProfileType } from "../../../../shared/src/types";

export class ProfileService {
  async getProfile(userId: string): Promise<IUserProfile | null> {
    return UserProfile.findOne({ userId });
  }

  async updateProfile(
    userId: string,
    updates: Partial<ProfileType & { theme?: "light" | "dark" }>
  ): Promise<IUserProfile> {
    const {
      ageRange,
      incomeRange,
      employmentStatus,
      isStudent,
      region,
      theme,
      // ASEP Qualifications
      highestEducationLevel,
      degrees,
      languages,
      itSkills,
      licenses,
    } = updates;

    const updateDoc: any = {
      $set: {
        ageRange: ageRange ?? undefined,
        incomeRange: incomeRange ?? undefined,
        employmentStatus: employmentStatus ?? undefined,
        isStudent: isStudent ?? false,
        region: region ?? undefined,
        theme: theme ?? undefined,
        // ASEP Qualifications
        highestEducationLevel: highestEducationLevel ?? undefined,
        degrees: degrees ?? undefined,
        languages: languages ?? undefined,
        itSkills: itSkills ?? undefined,
        licenses: licenses ?? undefined,
        lastVisitAt: new Date(),
      },
      $unset: {
        statusFlags: "",
      },
    };

    const profile = await UserProfile.findOneAndUpdate({ userId }, updateDoc, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    return profile!;
  }
}
