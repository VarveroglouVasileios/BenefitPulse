import { evaluateMatch } from "./evaluate";
import { UserProfile } from "../../../shared/src/types";
import { CriteriaRules } from "../../../shared/src/rulesTypes";

describe("Rules Engine", () => {
  const studentProfile: UserProfile = {
    userId: "test",
    ageRange: "18-24",
    incomeRange: "<10k",
    employmentStatus: "employed",
    isStudent: true,
    region: "attiki",
  };

  it("should match when all criteria are met", () => {
    const rules: CriteriaRules = {
      ageRange: { includes: ["18-24", "25-34"] },
      incomeRange: { max: "10-20k" },
      statusFlags: { required: ["student"] },
      region: { includes: ["attiki", "central_macedonia"] },
    };

    const result = evaluateMatch(studentProfile, rules);
    expect(result.matched).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("should not match when required status flag is missing", () => {
    const rules: CriteriaRules = {
      statusFlags: { required: ["unemployed"] },
    };

    const result = evaluateMatch(studentProfile, rules);
    expect(result.matched).toBe(false);
  });

  it("should match when at least 50% of conditions are met", () => {
    const rules: CriteriaRules = {
      ageRange: { includes: ["18-24"] },
      incomeRange: { max: "10-20k" },
      statusFlags: { required: ["unemployed"] }, // This won't match
    };

    const result = evaluateMatch(studentProfile, rules);
    expect(result.matched).toBe(true); // 2 out of 3 conditions met
  });

  it("should handle missing profile fields gracefully", () => {
    const incompleteProfile: UserProfile = {
      userId: "test",
    };

    const rules: CriteriaRules = {
      ageRange: { includes: ["18-24"] },
      statusFlags: { required: ["student"] },
    };

    const result = evaluateMatch(incompleteProfile, rules);
    expect(result.missingFields).toContain("ageRange");
    expect(result.missingFields).toContain("statusFlags");
  });
});
