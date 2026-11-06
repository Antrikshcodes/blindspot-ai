/**
 * Blindspot AI — Shared Data Contracts & TypeScript Interfaces
 * Team Null Theory — CoNSTruct 2.0 (Replit × Newton School of Technology)
 */

import {
  AssumptionCategory,
  AssumptionStatus,
  ProbeType,
  EvidenceSentiment,
  ExperimentType,
} from '../constants';

/**
 * Project container grouping submissions and validation outputs.
 */
export interface Project {
  id: string;
  title: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Step 1: Idea submission details entered by the founder.
 */
export interface Submission {
  id: string;
  projectId: string;
  productName: string;
  targetAudience: string;
  problemStatement: string;
  proposedSolution?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Step 2 & 3: Extracted unstated assumption with 2D risk scoring.
 */
export interface Assumption {
  id: string;
  submissionId: string;
  category: AssumptionCategory;
  statement: string;
  rationale: string;
  impactScore: number; // 1 to 5
  uncertaintyScore: number; // 1 to 5
  compositeRisk: number; // impactScore * uncertaintyScore (1 to 25)
  isLethal: boolean; // compositeRisk >= 15
  status: AssumptionStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Step 4: Mom Test discovery interview question linked to an assumption.
 */
export interface InterviewQuestion {
  id: string;
  assumptionId: string;
  questionText: string;
  probeType: ProbeType;
  listenFor: string;
  createdAt: string;
}

/**
 * Step 5: Raw qualitative customer feedback or interview transcript.
 */
export interface InterviewNote {
  id: string;
  projectId: string;
  intervieweeIdentifier: string;
  rawText: string;
  createdAt: string;
}

/**
 * Excerpt mapping connecting user quote back to an assumption.
 */
export interface FeedbackMapping {
  id: string;
  noteId: string;
  assumptionId: string;
  sentiment: EvidenceSentiment;
  excerptQuote: string;
  contextSummary?: string;
  createdAt: string;
}

/**
 * Step 6: Contradiction detected across multiple customer feedback items.
 */
export interface Contradiction {
  id: string;
  assumptionId: string;
  contradictionSummary: string;
  evidenceA: {
    interviewee: string;
    quote: string;
  };
  evidenceB: {
    interviewee: string;
    quote: string;
  };
  recommendation: string;
  createdAt: string;
}

/**
 * Step 7: Practical de-risking experiment recommended for high-risk assumptions.
 */
export interface Experiment {
  id: string;
  assumptionId: string;
  experimentType: ExperimentType;
  title: string;
  description: string;
  metric: string;
  falsificationThreshold: string;
  estimatedDurationDays: number;
  createdAt: string;
}

/**
 * Standard unified API success response envelope.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Standard unified API error response envelope.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  timestamp: string;
}
