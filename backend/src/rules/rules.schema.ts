import { CriteriaRules } from "../../shared/src/rulesTypes";
import { UserProfile } from "../../shared/src/types";

export function validateCriteriaRules(rules: any): CriteriaRules {
  // Basic validation - can be extended with Zod
  return rules as CriteriaRules;
}
