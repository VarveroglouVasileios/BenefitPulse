import { connectMongo } from "../db/mongo";
import { UserProfile } from "../models/profile.model";

async function migrateUserProfiles() {
  await connectMongo();

  const cursor = UserProfile.find().cursor();

  let migrated = 0;

  for await (const profile of cursor as any) {
    const flags: string[] = (profile as any).statusFlags || [];

    let employmentStatus: string | undefined = profile.employmentStatus;
    let isStudent: boolean | undefined = profile.isStudent;

    if (!employmentStatus && flags && flags.length > 0) {
      if (flags.includes("unemployed")) {
        employmentStatus = "unemployed";
      } else if (flags.includes("employee")) {
        employmentStatus = "employed";
      } else if (flags.includes("self_employed")) {
        employmentStatus = "selfEmployed";
      } else if (flags.includes("retired")) {
        employmentStatus = "pensioner";
      } else {
        employmentStatus = "other";
      }
    }

    if (isStudent === undefined) {
      isStudent = flags.includes("student") || false;
    }

    await UserProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          employmentStatus,
          isStudent,
        },
        $unset: {
          statusFlags: "",
        },
      }
    );
    migrated++;
  }

  console.log(`✅ Migrated ${migrated} user profiles to new schema`);
}

export default migrateUserProfiles;
