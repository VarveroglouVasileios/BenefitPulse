
import { connectMongo } from "../db/mongo";
import { Opportunity } from "../models/opportunity.model";

async function fixData() {
  await connectMongo();
  
  // 1. Undelete ASEP proclamations
  const asepPattern = /\b\d+[Α-ΩΆ-ΏA-Z]+\/\d{4}\b/i;
  const deletedAsep = await Opportunity.find({ 
    deletedAt: { $ne: null },
    title: { $regex: asepPattern }
  });
  
  console.log(`Found ${deletedAsep.length} deleted ASEP items to restore.`);
  for (const opp of deletedAsep) {
    opp.deletedAt = null;
    opp.status = "published"; // Make them visible again
    await opp.save();
    console.log(`  ✅ Restored: ${opp.title}`);
  }

  // 2. Fix OPEKA A21 title
  const a21 = await Opportunity.findOne({ officialUrl: /opeka.gr\/oikogeneia\/epidoma-paidiou-a21/ });
  if (a21) {
    const oldTitle = a21.title;
    a21.title = "Επίδομα Παιδιού (Α21) - ΟΠΕΚΑ";
    await a21.save();
    console.log(`✅ Fixed A21 title: ${oldTitle} -> ${a21.title}`);
  }

  // 3. Archive old Fuel Pass
  const fuelPass = await Opportunity.findOne({ officialUrl: /vouchers.gov.gr\/fuelpass/ });
  if (fuelPass && fuelPass.status === "published") {
    fuelPass.status = "archived";
    await fuelPass.save();
    console.log(`✅ Archived old Fuel Pass III`);
  }

  // 4. Move announcements to 'news' kind or archive if they are not opportunities
  const announcements = [
    "146 εργαστήρια συμβουλευτικής",
    "Έναρξη της διαδικασίας ελέγχου των δικαιολογητικών",
    "Δημοσίευση προγραμμάτων κατάρτισης"
  ];
  
  for (const titlePart of announcements) {
    const apps = await Opportunity.find({ title: { $regex: new RegExp(titlePart, "i") }, status: "published" });
    for (const app of apps) {
      (app as any).kind = "news";
      await app.save();
      console.log(`✅ Updated kind to 'news' for: ${app.title}`);
    }
  }

  process.exit(0);
}

fixData().catch(console.error);
