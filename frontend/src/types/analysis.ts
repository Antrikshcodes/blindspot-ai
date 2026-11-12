/**
 * Blindspot AI — Authoritative Phase 02 Idea Analysis Types
 * Synchronized with backend Zod contracts in backend/src/phase01/analysis/contracts.ts
 */

export type TaxonomyCategory =
  | 'PROBLEM'
  | 'CUSTOMER'
  | 'DEMAND'
  | 'BEHAVIOUR'
  | 'WILLINGNESS_TO_PAY'
  | 'TECHNICAL'
  | 'DISTRIBUTION'
  | 'BUSINESS_MODEL'
  | 'COMPETITIVE'
  | 'OPERATIONAL'
  | 'SOLUTION'
  | 'MONETIZATION';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AssumptionStatus =
  | 'UNTESTED'
  | 'TESTING'
  | 'SUPPORTED'
  | 'INVALIDATED'
  | 'INCONCLUSIVE';

export type GroundingType = 'SUBMITTED' | 'UNCERTAINTY' | 'MISSING';

export type DimensionSupport =
  | 'DESCRIPTION_ONLY'
  | 'INSUFFICIENT_EVIDENCE'
  | 'UNASSESSED';

export interface AnalysisFinding {
  statement: string | null;
  grounding: GroundingType;
  sourceQuote: string | null;
}

export interface ProductDecomposition {
  coreProblem: AnalysisFinding;
  primaryUser: AnalysisFinding;
  proposedSolution: AnalysisFinding;
  coreValueProposition: AnalysisFinding;
  mainFunctionality: AnalysisFinding[];
  technicalRequirements: AnalysisFinding[];
  businessAssumptions: string[];
}

export interface ValidationDimension {
  score: number | null;
  support: DimensionSupport;
  rationale: string;
  evidenceNeeded: string;
}

export interface ValidationDimensionsMap {
  problemClarity: ValidationDimension;
  audienceSpecificity: ValidationDimension;
  solutionClarity: ValidationDimension;
  evidenceOfDemand: ValidationDimension;
  differentiation: ValidationDimension;
  technicalFeasibility: ValidationDimension;
  validationReadiness: ValidationDimension;
}

export interface EvidenceRecord {
  id: string;
  feedbackId: string;
  assumptionId: string;
  quote: string;
  sentiment: 'SUPPORTING' | 'INVALIDATING' | 'NEUTRAL';
  reasoning: string;
  origin: string;
  createdAt: string;
}

export interface ScoredAssumption {
  id: string;
  title: string;
  description: string;
  category: TaxonomyCategory;
  whyItMatters: string;
  evidenceRequired: string;
  validationMethod: string;
  targetAudience: string;
  suggestedInterviewQuestion: string;
  grounding: 'SUBMITTED' | 'UNCERTAINTY';
  sourceQuote: string | null;
  impact: number; // 1-5
  uncertainty: number; // 1-5
  riskScore: number; // 1-25
  priorityScore: number; // alias to riskScore
  riskLevel: SeverityLevel;
  impactRationale: string;
  uncertaintyRationale: string;
  explanation: string;
  status: AssumptionStatus;
  evidenceRecords?: EvidenceRecord[];
}

export interface BlindspotItem {
  id: string;
  title: string;
  explanation: string;
  severity: SeverityLevel;
  relatedAssumptionId: string;
  whyOverlooked: string;
  suggestedAction: string;
  evidenceRequired: string;
  grounding: 'SUBMITTED' | 'UNCERTAINTY';
  sourceQuote: string | null;
}

export interface InterviewQuestionItem {
  id: string;
  question: string;
  relatedAssumptionId: string;
  purpose: string;
  evidenceToLookFor: string;
  followUpQuestion: string;
}

export interface ProviderStage {
  name: string;
  durationMs: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
}

export interface ProviderMetadata {
  provider: string;
  model: string;
  promptVersion: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  stages: ProviderStage[];
}

export interface AnalysisSummaryData {
  overallSummary: string | null;
  problemAssessment?: AnalysisFinding;
  audienceAssessment?: AnalysisFinding;
  solutionAssessment?: AnalysisFinding;
  validationDimensions: ValidationDimensionsMap | null;
  strengths?: string[];
  missingInformation?: string[];
  productRisks?: string[];
  marketAndDemandUncertainties?: string[];
  technicalFeasibilityConcerns?: string[];
  competitiveUncertainties?: string[];
  competition?: {
    submittedAlternatives: string[];
    externalResearchPerformed: boolean;
  };
  nextSteps?: string[];
  evidenceBackedValidation?: {
    assessed: boolean;
    verifiedEvidenceCount: number;
    explanation: string;
  };
  assessmentType?: string;
  disclaimer?: string;
}

export interface DetailedAnalysisResult {
  engineVersion: string;
  decomposition: ProductDecomposition;
  problemClarity: string;
  audienceClarity: string;
  problemAssessment: AnalysisFinding;
  audienceAssessment: AnalysisFinding;
  solutionAssessment: AnalysisFinding;
  validationDimensions: ValidationDimensionsMap;
  overallSummary: string;
  strengths: string[];
  missingInformation: string[];
  productRisks: string[];
  marketAndDemandUncertainties: string[];
  technicalFeasibilityConcerns: string[];
  competitiveUncertainties: string[];
  nextSteps: string[];
  assumptions: ScoredAssumption[];
  blindspots: BlindspotItem[];
  interviewQuestions: InterviewQuestionItem[];
  consideredCategories: TaxonomyCategory[];
  competition: {
    submittedAlternatives: string[];
    externalResearchPerformed: boolean;
  };
  evidenceBackedValidation: {
    assessed: boolean;
    verifiedEvidenceCount: number;
    explanation: string;
  };
  assessmentType: string;
  disclaimer: string;
}

export interface FullAnalysis {
  id: string;
  projectId: string;
  version: number;
  engineVersion: string;
  model: string;
  marketContext: string | null;
  additionalContext: string | null;
  createdAt: string;
  updatedAt?: string;
  projectSnapshot: {
    id?: string;
    name: string;
    productDescription: string;
    problemStatement: string;
    targetAudience: string;
    proposedSolution: string;
    existingAlternatives?: string[];
  };
  result: DetailedAnalysisResult;
  assumptions: ScoredAssumption[];
  providerMetadata?: ProviderMetadata;
}

export interface AnalysisHistoryItem {
  id: string;
  projectId: string;
  version: number;
  createdAt: string;
  model: string;
}

export interface BlindspotsArtifactResponse {
  analysisId: string;
  projectId: string;
  version: number;
  engineVersion: string;
  available: boolean;
  items: BlindspotItem[];
  reason?: string;
}

export interface InterviewQuestionsArtifactResponse {
  analysisId: string;
  projectId: string;
  version: number;
  engineVersion: string;
  available: boolean;
  items: InterviewQuestionItem[];
  reason?: string;
}

export interface AnalysisSummaryArtifactResponse {
  analysisId: string;
  projectId: string;
  version: number;
  engineVersion: string;
  available: boolean;
  summary: AnalysisSummaryData;
  providerMetadata?: ProviderMetadata;
  reason?: string;
}

/**
 * Phase 02 Risk Level thresholds:
 * 20–25: CRITICAL
 * 13–19: HIGH
 *  7–12: MEDIUM
 *  1–6:  LOW
 */
export function getPhase02RiskLevel(score: number): SeverityLevel {
  if (score >= 20) return 'CRITICAL';
  if (score >= 13) return 'HIGH';
  if (score >= 7) return 'MEDIUM';
  return 'LOW';
}

export function getRiskLevelStyles(level: SeverityLevel | string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return {
        bg: 'bg-red-500/10 text-red-700',
        text: 'text-red-700',
        border: 'border-red-500/30',
        dot: 'bg-red-500',
      };
    case 'HIGH':
      return {
        bg: 'bg-purple/15 text-purple',
        text: 'text-purple',
        border: 'border-purple/30',
        dot: 'bg-purple',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-amber-500/15 text-amber-800',
        text: 'text-amber-800',
        border: 'border-amber-500/30',
        dot: 'bg-amber-600',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-forest/10 text-forest',
        text: 'text-forest',
        border: 'border-forest/20',
        dot: 'bg-forest/60',
      };
  }
}

export function getStatusBadgeStyles(status: AssumptionStatus | string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'SUPPORTED':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-800 font-semibold',
        border: 'border-emerald-500/30',
      };
    case 'INVALIDATED':
      return {
        bg: 'bg-red-500/15',
        text: 'text-red-800 font-semibold',
        border: 'border-red-500/30',
      };
    case 'TESTING':
      return {
        bg: 'bg-purple/15',
        text: 'text-purple font-semibold',
        border: 'border-purple/30',
      };
    case 'INCONCLUSIVE':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-800 font-semibold',
        border: 'border-amber-500/30',
      };
    case 'UNTESTED':
    default:
      return {
        bg: 'bg-forest/10',
        text: 'text-forest/70 font-semibold',
        border: 'border-forest/20',
      };
  }
}

