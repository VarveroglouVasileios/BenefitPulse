/**
 * Script to manually trigger archive expired opportunities
 * Usage: npm run cli archive:now
 */

import { connectMongo } from "../db/mongo";
import { archiveExpiredOpportunitiesJob } from "../jobs/archive.jobs";
import { Job } from "bullmq";

export default async function main() {
  console.log("🔄 Connecting to MongoDB...");
  await connectMongo();
  console.log("✅ Connected");

  // Create a mock job object
  const mockJob = {
    id: "manual-archive-" + Date.now(),
    name: "archive-expired-opportunities",
  } as Job;

  console.log("🔍 Starting archive expired opportunities...");
  await archiveExpiredOpportunitiesJob(mockJob);
  console.log("✅ Archive completed!");

  process.exit(0);
}

