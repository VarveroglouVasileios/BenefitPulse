// Rate limiting utilities are handled by express-rate-limit middleware
// This file can be extended with custom rate limiting logic if needed

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}
