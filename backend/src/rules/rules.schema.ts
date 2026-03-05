import { CriteriaRules } from "../shared/rulesTypes";
import { UserProfile } from "../shared/types";

export function validateCriteriaRules(rules: any): CriteriaRules {
  // Basic validation - can be extended with Zod
  return rules as CriteriaRules;
}
