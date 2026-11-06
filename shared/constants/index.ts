/**
 * Blindspot AI — Shared Constants & Enums
 * Team Null Theory — CoNSTruct 2.0 (Replit × Newton School of Technology)
 */

/**
 * Four fundamental assumption categories to assess venture risk.
 */
export enum AssumptionCategory {
  PROBLEM = 'PROBLEM',
  CUSTOMER = 'CUSTOMER',
  SOLUTION = 'SOLUTION',
  MONETIZATION = 'MONETIZATION',
}

/**
 * Validation lifecycle state of an assumption.
 */
export enum AssumptionStatus {
  UNVERIFIED = 'UNVERIFIED',
  SUPPORTED = 'SUPPORTED',
  INVALIDATED = 'INVALIDATED',
}

/**
 * Mom Test inquiry classifications focusing on past behavior and current commitments.
 */
export enum ProbeType {
  PAST_BEHAVIOR = 'PAST_BEHAVIOR',
  CURRENT_EXPENDITURE = 'CURRENT_EXPENDITURE',
  WORKAROUND = 'WORKAROUND',
  EMOTIONAL_INTENSITY = 'EMOTIONAL_INTENSITY',
}

/**
 * Classification of qualitative feedback excerpt against a specific assumption.
 */
export enum EvidenceSentiment {
  SUPPORTING = 'SUPPORTING',
  INVALIDATING = 'INVALIDATING',
  NEUTRAL = 'NEUTRAL',
}

/**
 * Standard lean experiment typologies for fast assumption falsification.
 */
export enum ExperimentType {
  SMOKE_TEST = 'SMOKE_TEST',
  CONCIERGE_TEST = 'CONCIERGE_TEST',
  LANDING_PAGE = 'LANDING_PAGE',
  PROTOTYPE_WALKTHROUGH = 'PROTOTYPE_WALKTHROUGH',
  PRE_SALE = 'PRE_SALE',
}

/**
 * Scoring and calculation constants.
 */
export const RISK_SCORING = {
  MIN_SCORE: 1,
  MAX_SCORE: 5,
  /**
   * Composite risk score threshold (Impact x Uncertainty).
   * Any assumption scoring >= 15 is flagged as a "Lethal Assumption".
   */
  LETHAL_THRESHOLD: 15,
} as const;

/**
 * Input length and validation boundary constraints.
 */
export const VALIDATION_LIMITS = {
  PRODUCT_NAME_MIN_LENGTH: 2,
  PRODUCT_NAME_MAX_LENGTH: 100,
  TARGET_AUDIENCE_MIN_LENGTH: 10,
  TARGET_AUDIENCE_MAX_LENGTH: 300,
  PROBLEM_STATEMENT_MIN_LENGTH: 30,
  PROBLEM_STATEMENT_MAX_LENGTH: 1500,
  PROPOSED_SOLUTION_MAX_LENGTH: 1500,
} as const;
