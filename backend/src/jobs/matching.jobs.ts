import { Job } from "bullmq";
import { UserProfile } from "../models/profile.model";
import { Opportunity } from "../models/opportunity.model";
import { UserOpportunity } from "../models/userOpportunity.model";
import { evaluateMatch } from "../rules/evaluate";
import { CriteriaRules } from "../shared/rulesTypes";

interface RecomputeUserMatchesData {
  userId: string;
}

interface RecomputeOpportunityMatchesData {
  opportunityId: string;
}

export async function recomputeUserMatchesJob(
  job: Job<RecomputeUserMatchesData>
): Promise<void> {
  const { userId } = job.data;

  const profile = await UserProfile.findOne({ userId });
  if (!profile) {
    return;
  }

  const now = new Date();

  // Only match opportunities that are still "active": not past deadline or application end
  const opportunities = await Opportunity.find({
    status: "published",
    deletedAt: null,
    $and: [
      { $or: [{ deadlineAt: null }, { deadlineAt: { $gte: now } }] },
      { $or: [{ applicationEndAt: null }, { applicationEndAt: { $gte: now } }] },
    ],
  });

  for (const opp of opportunities) {
    const hasRules =
      opp.criteriaRulesJson &&
      Object.keys(opp.criteriaRulesJson || {}).length > 0;

    if (!hasRules) {
      await UserOpportunity.findOneAndUpdate(
        { userId, opportunityId: opp._id },
        {
          userId,
          opportunityId: opp._id,
          matched: false,
          matchStatus: "unknown",
          reasons: ["No eligibility rules available"],
          missingFields: [],
          confidence: 0,
        },
        { upsert: true }
      );
      continue;
    }

    const matchResult = evaluateMatch(
      profile.toObject(),
      opp.criteriaRulesJson as CriteriaRules,
      opp
    );

    await UserOpportunity.findOneAndUpdate(
      { userId, opportunityId: opp._id },
      {
        userId,
        opportunityId: opp._id,
        matched: matchResult.matched,
        matchStatus: matchResult.matched ? "matched" : "not_matched",
        reasons: matchResult.reasons,
        missingFields: matchResult.missingFields,
        confidence: matchResult.confidence,
      },
      { upsert: true }
    );
  }
}

export async function recomputeOpportunityMatchesJob(
  job: Job<RecomputeOpportunityMatchesData>
): Promise<void> {
  const { opportunityId } = job.data;

  const opportunity = await Opportunity.findById(opportunityId);
  if (!opportunity) {
    return;
  }

  const profiles = await UserProfile.find({});

  for (const profile of profiles) {
    const hasRules =
      opportunity.criteriaRulesJson &&
      Object.keys(opportunity.criteriaRulesJson || {}).length > 0;

    if (!hasRules) {
      await UserOpportunity.findOneAndUpdate(
        { userId: profile.userId, opportunityId: opportunity._id },
        {
          userId: profile.userId,
          opportunityId: opportunity._id,
          matched: false,
          matchStatus: "unknown",
          reasons: ["No eligibility rules available"],
          missingFields: [],
          confidence: 0,
        },
        { upsert: true }
      );
      continue;
    }

    const matchResult = evaluateMatch(
      profile.toObject(),
      opportunity.criteriaRulesJson as CriteriaRules,
      opportunity
    );

    await UserOpportunity.findOneAndUpdate(
      { userId: profile.userId, opportunityId: opportunity._id },
      {
        userId: profile.userId,
        opportunityId: opportunity._id,
        matched: matchResult.matched,
        matchStatus: matchResult.matched ? "matched" : "not_matched",
        reasons: matchResult.reasons,
        missingFields: matchResult.missingFields,
        confidence: matchResult.confidence,
      },
      { upsert: true }
    );
  }
}


