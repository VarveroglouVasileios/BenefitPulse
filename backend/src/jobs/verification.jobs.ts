/**
 * Verification Jobs
 * 
 * Verifies live status of published opportunities
 */

import { Job } from "bullmq";
import { Opportunity } from "../models/opportunity.model";
import { verifyLiveStatus } from "../modules/verification/live-status-verifier";

interface VerificationStats {
  total: number;
  processed: number;
  updated: number;
  deadLinks: number;
  errors: number;
}

/**
 * Verify all published opportunities
 */
export async function verifyAllPublishedJob(job: Job): Promise<void> {
  console.log(`\n🔍 [Verification] Verifying all published opportunities (job ${job.id})...`);
  
  const stats: VerificationStats = {
    total: 0,
    processed: 0,
    updated: 0,
    deadLinks: 0,
    errors: 0,
  };
  
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Get published opportunities that haven't been verified in last 24h
  const opportunities = await Opportunity.find({
    status: "published",
    deletedAt: null,
    kind: { $ne: "service_info" },
    $or: [
      { verifiedAt: { $exists: false } },
      { verifiedAt: { $lt: oneDayAgo } },
    ],
  }).limit(100); // Process in batches
  
  stats.total = opportunities.length;
  console.log(`📊 Found ${stats.total} opportunities to verify`);
  
  for (const opp of opportunities) {
    try {
      stats.processed++;
      
      const result = await verifyLiveStatus(opp);
      
      // Update opportunity based on verification result
      let shouldUpdate = false;
      const updates: any = {
        verifiedAt: result.verifiedAt,
        verificationResult: result.verificationResult,
        evidenceSnippet: result.evidenceSnippet,
      };
      
      // Handle dead links
      if (result.verificationResult === "dead_link") {
        stats.deadLinks++;
        
        // Mark as rejected if recent, archived if old
        const isOld = opp.publishedAt && (now.getTime() - opp.publishedAt.getTime()) > 90 * 24 * 60 * 60 * 1000; // 90 days
        updates.status = isOld ? "archived" : "rejected";
        updates.rejectionReason = "dead_link";
        shouldUpdate = true;
        
        console.log(`   ❌ Dead link: ${opp.title.substring(0, 50)} → ${updates.status}`);
      }
      
      // Update applicationStatus if verification found clear signal
      if (result.shouldUpdateStatus && result.newApplicationStatus) {
        updates.applicationStatus = result.newApplicationStatus;
        
        // Also update status if needed
        if (result.newApplicationStatus === "closed") {
          // Closed: archive if old, keep published if recent
          const isOld = opp.publishedAt && (now.getTime() - opp.publishedAt.getTime()) > 30 * 24 * 60 * 60 * 1000; // 30 days
          if (isOld) {
            updates.status = "archived";
          }
        } else if (result.newApplicationStatus === "open" && opp.status !== "published") {
          // Open: ensure published
          updates.status = "published";
        }
        
        shouldUpdate = true;
        
        if (opp.applicationStatus !== result.newApplicationStatus) {
          console.log(`   🔄 Status update: ${opp.title.substring(0, 50)} → ${result.newApplicationStatus}`);
        }
      }
      
      if (shouldUpdate) {
        Object.assign(opp, updates);
        await opp.save();
        stats.updated++;
      } else {
        // Just update verification timestamp
        opp.verifiedAt = result.verifiedAt;
        opp.verificationResult = result.verificationResult;
        opp.evidenceSnippet = result.evidenceSnippet;
        await opp.save();
      }
      
      // Progress indicator
      if (stats.processed % 10 === 0) {
        console.log(`   ⏳ Processed ${stats.processed}/${stats.total}...`);
      }
    } catch (error: any) {
      stats.errors++;
      console.error(`   ❌ Error verifying ${opp._id}:`, error.message);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total: ${stats.total}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Dead links: ${stats.deadLinks}`);
  console.log(`Errors: ${stats.errors}`);
  console.log("=".repeat(60) + "\n");
}

/**
 * Verify specific opportunity
 */
export async function verifyOpportunityJob(job: Job): Promise<void> {
  const { opportunityId } = job.data;
  
  if (!opportunityId) {
    throw new Error("opportunityId is required");
  }
  
  const opportunity = await Opportunity.findById(opportunityId);
  if (!opportunity) {
    throw new Error(`Opportunity ${opportunityId} not found`);
  }
  
  const result = await verifyLiveStatus(opportunity);
  
  // Update opportunity
  opportunity.verifiedAt = result.verifiedAt;
  opportunity.verificationResult = result.verificationResult;
  opportunity.evidenceSnippet = result.evidenceSnippet;
  
  if (result.shouldUpdateStatus && result.newApplicationStatus) {
    opportunity.applicationStatus = result.newApplicationStatus;
  }
  
  if (result.verificationResult === "dead_link") {
    const now = new Date();
    const isOld = opportunity.publishedAt && 
      (now.getTime() - opportunity.publishedAt.getTime()) > 90 * 24 * 60 * 60 * 1000;
    opportunity.status = isOld ? "archived" : "rejected";
    (opportunity as any).rejectionReason = "dead_link";
  }
  
  await opportunity.save();
  
  console.log(`✅ Verified opportunity ${opportunityId}: ${result.verificationResult}`);
}

