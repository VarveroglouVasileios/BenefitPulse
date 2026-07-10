/**
 * Verification Jobs
 * 
 * Verifies live status of published opportunities
 */

import { Job } from "bullmq";
import { Opportunity } from "../models/opportunity.model";
import { verifyLiveStatus } from "../modules/verification/live-status-verifier";
import { ProgressTracker, logPhaseStart } from "../utils/progress";

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
  logPhaseStart("VERIFICATION", "🔍");
  
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
  }).limit(100);
  
  stats.total = opportunities.length;

  const progress = new ProgressTracker({
    label: "Link Verification",
    total: stats.total,
    logEvery: Math.max(1, Math.floor(stats.total / 15)),
    showItems: true,
  });
  progress.start();
  
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
        brokenLink: result.brokenLink || false,
      };
      
      // Handle Diavgeia irrelevant decisions
      if (result.isRelevantDecision === false) {
        // Mark as decision (not opportunity) and exclude from active tabs
        updates.kind = "decision";
        updates.status = "published"; // Keep published but as decision
        updates.applicationStatus = "closed"; // Not an active opportunity
        shouldUpdate = true;
        console.log(`   📋 Diavgeia irrelevant decision: ${opp.title.substring(0, 50)} → kind=decision`);
      }
      
      // Handle dead links
      if (result.verificationResult === "dead_link" || result.brokenLink) {
        stats.deadLinks++;
        
        // Mark as rejected if recent, archived if old
        const isOld = opp.publishedAt && (now.getTime() - opp.publishedAt.getTime()) > 90 * 24 * 60 * 60 * 1000; // 90 days
        updates.status = isOld ? "archived" : "rejected";
        updates.rejectionReason = "dead_link";
        updates.brokenLink = true;
        shouldUpdate = true;
        
        console.log(`   ❌ Dead link: ${opp.title.substring(0, 50)} → ${updates.status}`);
      }
      
      // Update applicationStatus if verification found clear signal
      if (result.shouldUpdateStatus && result.newApplicationStatus) {
        updates.applicationStatus = result.newApplicationStatus;
        
        // Also update status if needed
        if (result.newApplicationStatus === "closed") {
          updates.status = "archived";
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
      
    } catch (error: any) {
      stats.errors++;
      console.error(`   ❌ Error verifying ${opp._id}:`, error.message);
    }

    progress.tick(opp.title?.substring(0, 50));
  }
  
  progress.finish({
    "Processed": stats.processed,
    "Updated": stats.updated,
    "Dead links": stats.deadLinks,
    "Errors": stats.errors,
  });
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
  opportunity.brokenLink = result.brokenLink || false;
  
  // Handle Diavgeia irrelevant decisions
  if (result.isRelevantDecision === false) {
    opportunity.kind = "decision";
    opportunity.status = "published"; // Keep published but as decision
    opportunity.applicationStatus = "closed"; // Not an active opportunity
  }
  
  if (result.shouldUpdateStatus && result.newApplicationStatus) {
    opportunity.applicationStatus = result.newApplicationStatus;
    if (result.newApplicationStatus === "closed") {
      opportunity.status = "archived";
    }
  }
  
  if (result.verificationResult === "dead_link" || result.brokenLink) {
    const now = new Date();
    const isOld = opportunity.publishedAt && 
      (now.getTime() - opportunity.publishedAt.getTime()) > 90 * 24 * 60 * 60 * 1000;
    opportunity.status = isOld ? "archived" : "rejected";
    opportunity.rejectionReason = "dead_link";
    opportunity.brokenLink = true;
  }
  
  await opportunity.save();
  
  console.log(`✅ Verified opportunity ${opportunityId}: ${result.verificationResult}`);
}

