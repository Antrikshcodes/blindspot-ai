import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Layers,
  HelpCircle,
  Compass,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Clock,
  RefreshCw,
  Activity,
  History,
  Cpu,
} from 'lucide-react';
import type {
  FullAnalysis,
  ScoredAssumption,
  ValidationDimension,
  AnalysisFinding,
} from '../../types/analysis';
import { InteractiveRiskMatrix } from './InteractiveRiskMatrix';
import { AssumptionExplorer } from './AssumptionExplorer';
import { BlindspotDiscovery } from './BlindspotDiscovery';
import { InterviewQuestionPreview } from './InterviewQuestionPreview';
import { AnalysisHistoryList } from './AnalysisHistoryList';

interface AnalysisReportViewProps {
  analysis: FullAnalysis;
  onRunNewAnalysis: () => void;
  onSelectHistoricalVersion?: (analysisId: string) => void;
  isLatestVersion?: boolean;
}

type AnalysisReportTab =
  | 'summary'
  | 'decomposition'
  | 'matrix'
  | 'blindspots'
  | 'interviews'
  | 'history';

export const AnalysisReportView: React.FC<AnalysisReportViewProps> = ({
  analysis,
  onRunNewAnalysis,
  onSelectHistoricalVersion,
  isLatestVersion = true,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisReportTab>('summary');
  const [selectedAssumptionId, setSelectedAssumptionId] = useState<string | null>(null);

  const result = analysis.result;
  const assumptions: ScoredAssumption[] = analysis.assumptions || result?.assumptions || [];
  const blindspots = result?.blindspots || [];
  const interviewQuestions = result?.interviewQuestions || [];
  const decomposition = result?.decomposition;
  const dimensions = result?.validationDimensions;
  const providerMetadata = analysis.providerMetadata || (result as any)?.providerMetadata;

  const createdDate = new Date(analysis.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSelectAssumptionFromOtherModule = (id: string) => {
    setSelectedAssumptionId(id);
    setActiveTab('matrix');
  };

  const REPORT_TABS: Array<{ id: AnalysisReportTab; label: string; icon: React.ElementType; badge?: string | number }> = [
    { id: 'summary', label: 'Summary & Dimensions', icon: Activity },
    { id: 'decomposition', label: 'Product Decomposition', icon: Layers },
    { id: 'matrix', label: 'Risk Matrix & Hypotheses', icon: HelpCircle, badge: assumptions.length },
    { id: 'blindspots', label: 'Blindspots', icon: Sparkles, badge: blindspots.length },
    { id: 'interviews', label: 'Mom Test Questions', icon: Compass, badge: interviewQuestions.length },
    { id: 'history', label: 'Version History', icon: History, badge: `v${analysis.version}` },
  ];

  const renderFindingCard = (title: string, finding?: AnalysisFinding) => {
    if (!finding) return null;

    let groundingBadgeClass = 'bg-forest/10 text-forest/70 border-forest/20';
    if (finding.grounding === 'SUBMITTED') {
      groundingBadgeClass = 'bg-purple/15 text-purple border-purple/30 font-bold';
    } else if (finding.grounding === 'UNCERTAINTY') {
      groundingBadgeClass = 'bg-amber-500/15 text-amber-800 border-amber-500/30';
    } else if (finding.grounding === 'MISSING') {
      groundingBadgeClass = 'bg-red-500/15 text-red-800 border-red-500/30 font-bold';
    }

    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-sand border border-forest/15 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-forest/60">
            {title}
          </span>
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${groundingBadgeClass}`}>
            {finding.grounding}
          </span>
        </div>

        <p className="text-xs sm:text-sm font-semibold text-forest leading-relaxed">
          {finding.statement || 'Not specified in submitted hypothesis.'}
        </p>

        {finding.sourceQuote && (
          <div className="pt-1 text-[11px] text-forest/70 italic border-l-2 border-purple pl-2.5">
            "{finding.sourceQuote}"
          </div>
        )}
      </div>
    );
  };

  const renderDimensionCard = (name: string, label: string, dim?: ValidationDimension) => {
    if (!dim) return null;

    // Respect backend evidence policy: null score is Insufficient Evidence or Unassessed, NEVER 0!
    const isScoreNull = dim.score === null || dim.score === undefined;
    const isDemand = name === 'evidenceOfDemand';

    let supportClass = 'bg-forest/10 text-forest/70 border-forest/20';
    if (dim.support === 'INSUFFICIENT_EVIDENCE') {
      supportClass = 'bg-amber-500/15 text-amber-800 border-amber-500/30 font-bold';
    } else if (dim.support === 'DESCRIPTION_ONLY') {
      supportClass = 'bg-purple/15 text-purple border-purple/30 font-bold';
    } else if (dim.support === 'UNASSESSED') {
      supportClass = 'bg-forest/10 text-forest/60 border-forest/15';
    }

    return (
      <div className="p-5 rounded-3xl bg-sand border border-forest/15 space-y-3 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold font-serif text-forest">{label}</span>
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${supportClass}`}>
              {dim.support}
            </span>
          </div>

          {/* Numeric Score or Honest Insufficient Evidence Badge */}
          <div className="flex items-baseline gap-2">
            {!isScoreNull ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-serif font-bold text-forest">{dim.score}</span>
                <span className="text-xs font-mono text-forest/50">/100</span>
              </div>
            ) : (
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-800 border border-amber-500/25">
                {isDemand ? 'INSUFFICIENT EVIDENCE (UNSCORED)' : 'UNASSESSED'}
              </span>
            )}
          </div>

          <p className="text-xs text-forest/80 font-sans leading-relaxed">{dim.rationale}</p>
        </div>

        {dim.evidenceNeeded && (
          <div className="pt-2 border-t border-forest/10 text-[11px] text-forest/70 space-y-0.5 font-sans">
            <span className="font-bold text-[9px] font-mono uppercase tracking-wider text-forest/50">
              Evidence Required to Certify:
            </span>
            <p className="leading-snug">{dim.evidenceNeeded}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & VERSION CONTROL BAR */}
      <div className="p-6 sm:p-8 rounded-3xl bg-sand-light border-2 border-forest/20 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-forest text-sand">
                Version {analysis.version}
              </span>

              {isLatestVersion ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Latest Analysis
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Historical Version
                </span>
              )}

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-purple/15 text-purple border border-purple/30">
                Phase 02 Engine (v{analysis.engineVersion || '2.0'})
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-tight text-forest pt-1">
              AI Idea Deconstruction & Validation Record
            </h2>

            <div className="flex items-center gap-4 text-xs font-mono text-forest/60 pt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-forest/40" /> {createdDate}
              </span>
              <span>•</span>
              <span className="text-purple flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> Model: {analysis.model || 'openai:gpt-4o'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onRunNewAnalysis}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple" />
              <span>Run New Analysis</span>
            </button>
          </div>
        </div>

        {/* Optional Context Banner if provided */}
        {(analysis.marketContext || analysis.additionalContext) && (
          <div className="pt-3 border-t border-forest/10 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {analysis.marketContext && (
              <div className="p-3 rounded-xl bg-sand border border-forest/10">
                <span className="text-[10px] font-mono font-bold uppercase text-forest/60">
                  Market Context Supplied:
                </span>
                <p className="text-forest/80 italic mt-0.5 font-sans line-clamp-2">
                  "{analysis.marketContext}"
                </p>
              </div>
            )}
            {analysis.additionalContext && (
              <div className="p-3 rounded-xl bg-sand border border-forest/10">
                <span className="text-[10px] font-mono font-bold uppercase text-forest/60">
                  Founder Notes Supplied:
                </span>
                <p className="text-forest/80 italic mt-0.5 font-sans line-clamp-2">
                  "{analysis.additionalContext}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. TAB NAVIGATION */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-forest/15 no-scrollbar">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-forest text-sand shadow-sm'
                  : 'text-forest/70 hover:text-forest hover:bg-forest/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple' : 'text-forest/50'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-purple/20 text-purple' : 'bg-forest/10 text-forest/60'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. TAB PANELS */}

      {/* TAB A: EXECUTIVE SUMMARY & DIMENSIONS */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Executive Summary Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple">
                Phase 02 Executive Synthesis
              </span>
              <span className="text-[10px] font-mono text-forest/50">
                Deterministic Scoring & Verification Rules
              </span>
            </div>

            <p className="text-base sm:text-lg font-serif text-forest leading-relaxed font-medium">
              {result?.overallSummary || 'No summary text available.'}
            </p>

            {/* Core Findings Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {renderFindingCard('Core Problem Assessment', result?.problemAssessment)}
              {renderFindingCard('Primary User Segment', result?.audienceAssessment)}
              {renderFindingCard('Solution Mechanism', result?.solutionAssessment)}
            </div>
          </div>

          {/* 7 Validation Dimensions Grid */}
          <div className="p-6 sm:p-8 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-forest/10 pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-forest">
                  7 Core Validation Dimensions
                </h3>
                <p className="text-xs text-forest/70 font-sans mt-0.5">
                  Evaluated under strict description-only constraints. Note: Evidence of Demand cannot be scored from an idea description alone.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {renderDimensionCard('problemClarity', 'Problem Clarity', dimensions?.problemClarity)}
              {renderDimensionCard('audienceSpecificity', 'Audience Specificity', dimensions?.audienceSpecificity)}
              {renderDimensionCard('solutionClarity', 'Solution Clarity', dimensions?.solutionClarity)}
              {renderDimensionCard('evidenceOfDemand', 'Evidence of Demand', dimensions?.evidenceOfDemand)}
              {renderDimensionCard('differentiation', 'Differentiation', dimensions?.differentiation)}
              {renderDimensionCard('technicalFeasibility', 'Technical Feasibility', dimensions?.technicalFeasibility)}
              {renderDimensionCard('validationReadiness', 'Validation Readiness', dimensions?.validationReadiness)}
            </div>

            {/* Evidence Policy Banner */}
            <div className="p-4 rounded-2xl bg-forest/5 border border-forest/10 text-xs text-forest/80 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-purple shrink-0 mt-0.5" />
              <div className="space-y-1 font-sans">
                <span className="font-mono font-bold uppercase text-[10px] text-forest">
                  Server Evidence Policy Enforced
                </span>
                <p className="leading-relaxed">
                  Blindspot AI does not claim market demand has been validated or create an overall probability of startup success from a description alone. Verification requires qualitative customer interviews and structured falsification experiments.
                </p>
              </div>
            </div>
          </div>

          {/* Strengths & Missing Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="p-6 sm:p-7 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Concept Strengths ({result?.strengths?.length || 0})
              </span>
              <ul className="space-y-2 text-xs font-sans">
                {result?.strengths && result.strengths.length > 0 ? (
                  result.strengths.map((str, idx) => (
                    <li key={idx} className="p-2.5 rounded-xl bg-sand border border-forest/10 flex items-start gap-2">
                      <span className="text-emerald-700 font-bold shrink-0 mt-0.5">✓</span>
                      <span className="text-forest/85 leading-snug">{str}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-forest/50 italic">None noted.</p>
                )}
              </ul>
            </div>

            {/* Missing Information */}
            <div className="p-6 sm:p-7 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" /> Missing Critical Information ({result?.missingInformation?.length || 0})
              </span>
              <ul className="space-y-2 text-xs font-sans">
                {result?.missingInformation && result.missingInformation.length > 0 ? (
                  result.missingInformation.map((info, idx) => (
                    <li key={idx} className="p-2.5 rounded-xl bg-sand border border-red-500/15 flex items-start gap-2 text-red-900">
                      <span className="text-red-600 font-bold shrink-0 mt-0.5">!</span>
                      <span className="leading-snug">{info}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-forest/50 italic">None noted.</p>
                )}
              </ul>
            </div>
          </div>

          {/* Product Risks & Uncertainties */}
          <div className="p-6 sm:p-8 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-4">
            <h3 className="text-lg font-serif font-bold text-forest">
              Identified Product Risks & Uncertainties
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Risks */}
              {result?.productRisks && result.productRisks.length > 0 && (
                <div className="p-4 rounded-2xl bg-sand border border-forest/10 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-forest/70">
                    Product Risks ({result.productRisks.length})
                  </span>
                  <ul className="space-y-1.5 text-xs">
                    {result.productRisks.map((r, i) => (
                      <li key={i} className="text-forest/80 list-disc list-inside">{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Market & Demand */}
              {result?.marketAndDemandUncertainties && result.marketAndDemandUncertainties.length > 0 && (
                <div className="p-4 rounded-2xl bg-sand border border-forest/10 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-forest/70">
                    Market & Demand Uncertainties ({result.marketAndDemandUncertainties.length})
                  </span>
                  <ul className="space-y-1.5 text-xs">
                    {result.marketAndDemandUncertainties.map((u, i) => (
                      <li key={i} className="text-forest/80 list-disc list-inside">{u}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Technical Feasibility */}
              {result?.technicalFeasibilityConcerns && result.technicalFeasibilityConcerns.length > 0 && (
                <div className="p-4 rounded-2xl bg-sand border border-forest/10 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-forest/70">
                    Technical Feasibility Concerns ({result.technicalFeasibilityConcerns.length})
                  </span>
                  <ul className="space-y-1.5 text-xs">
                    {result.technicalFeasibilityConcerns.map((c, i) => (
                      <li key={i} className="text-forest/80 list-disc list-inside">{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Competitive Uncertainties */}
              {result?.competitiveUncertainties && result.competitiveUncertainties.length > 0 && (
                <div className="p-4 rounded-2xl bg-sand border border-forest/10 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-forest/70">
                    Competitive Uncertainties ({result.competitiveUncertainties.length})
                  </span>
                  <ul className="space-y-1.5 text-xs">
                    {result.competitiveUncertainties.map((cu, i) => (
                      <li key={i} className="text-forest/80 list-disc list-inside">{cu}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps Roadmap */}
          {result?.nextSteps && result.nextSteps.length > 0 && (
            <div className="p-6 sm:p-8 rounded-3xl bg-forest text-sand shadow-lg space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-purple flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Actionable Validation Roadmap
              </span>
              <h3 className="text-xl sm:text-2xl font-serif font-bold">
                Recommended Immediate Next Steps
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {result.nextSteps.map((step, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-sand-light/10 border border-sand/15 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-sand/90 font-sans leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB B: PRODUCT DECOMPOSITION */}
      {activeTab === 'decomposition' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 sm:p-8 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple">
                Stage 2 Pipeline Output
              </span>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-forest mt-1">
                Structured Product Decomposition
              </h3>
              <p className="text-xs sm:text-sm text-forest/70 font-sans mt-0.5">
                Isolating core problem, user, solution, and technical architecture with source quote grounding tags.
              </p>
            </div>

            {/* Core 4 Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFindingCard('Core Problem Hypothesis', decomposition?.coreProblem)}
              {renderFindingCard('Primary User Segment', decomposition?.primaryUser)}
              {renderFindingCard('Proposed Solution Architecture', decomposition?.proposedSolution)}
              {renderFindingCard('Core Value Proposition', decomposition?.coreValueProposition)}
            </div>

            {/* Technical Requirements */}
            {decomposition?.technicalRequirements && decomposition.technicalRequirements.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-forest/70">
                  Technical Architecture Requirements ({decomposition.technicalRequirements.length})
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {decomposition.technicalRequirements.map((req, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-sand border border-forest/10 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-forest/60">Req #{idx + 1}</span>
                        <span className="px-2 py-0.5 rounded-full bg-forest/5 text-purple font-bold">
                          {req.grounding}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-forest font-sans">{req.statement}</p>
                      {req.sourceQuote && (
                        <p className="text-[11px] italic text-forest/70">"{req.sourceQuote}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Business Assumptions */}
            {decomposition?.businessAssumptions && decomposition.businessAssumptions.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-forest/70">
                  Extracted Business Model Premises ({decomposition.businessAssumptions.length})
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {decomposition.businessAssumptions.map((assump, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-sand border border-forest/10 text-xs font-sans text-forest/85 flex items-start gap-2">
                      <span className="font-mono text-purple font-bold">#{idx + 1}</span>
                      <span>{assump}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB C: RISK MATRIX & HYPOTHESES */}
      {activeTab === 'matrix' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 5x5 Matrix */}
          <InteractiveRiskMatrix
            assumptions={assumptions}
            onSelectAssumption={(assump) => setSelectedAssumptionId(assump.id)}
          />

          {/* Assumption Explorer List */}
          <div className="pt-4 border-t border-forest/15">
            <h3 className="text-xl font-serif font-bold text-forest mb-4">
              Hypothesis Explorer & Verification Status
            </h3>
            <AssumptionExplorer
              assumptions={assumptions}
              selectedAssumptionId={selectedAssumptionId}
            />
          </div>
        </div>
      )}

      {/* TAB D: BLINDSPOTS */}
      {activeTab === 'blindspots' && (
        <div className="animate-in fade-in duration-200">
          <BlindspotDiscovery
            analysisId={analysis.id}
            fallbackItems={blindspots}
            onSelectAssumption={handleSelectAssumptionFromOtherModule}
          />
        </div>
      )}

      {/* TAB E: MOM TEST INTERVIEW QUESTIONS */}
      {activeTab === 'interviews' && (
        <div className="animate-in fade-in duration-200">
          <InterviewQuestionPreview
            analysisId={analysis.id}
            fallbackItems={interviewQuestions}
            onSelectAssumption={handleSelectAssumptionFromOtherModule}
          />
        </div>
      )}

      {/* TAB F: VERSION HISTORY & AUDIT */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <AnalysisHistoryList
            projectId={analysis.projectId}
            activeAnalysisId={analysis.id}
            onSelectAnalysis={(id) => onSelectHistoricalVersion?.(id)}
          />

          {/* Provider Pipeline Audit Telemetry */}
          {providerMetadata && (
            <div className="p-6 rounded-3xl bg-sand-light border border-forest/15 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-forest/70">
                  AI Pipeline Telemetry & Provider Metadata
                </span>
                <span className="text-[10px] font-mono text-forest/50">
                  {providerMetadata.provider}:{providerMetadata.model}
                </span>
              </div>

              {providerMetadata.tokenUsage && (
                <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-sand border border-forest/10">
                    <span className="text-[10px] text-forest/50 uppercase">Prompt Tokens</span>
                    <p className="text-sm font-bold text-forest mt-0.5">{providerMetadata.tokenUsage.promptTokens}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-sand border border-forest/10">
                    <span className="text-[10px] text-forest/50 uppercase">Completion Tokens</span>
                    <p className="text-sm font-bold text-forest mt-0.5">{providerMetadata.tokenUsage.completionTokens}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-sand border border-forest/10">
                    <span className="text-[10px] text-forest/50 uppercase">Total Tokens</span>
                    <p className="text-sm font-bold text-purple mt-0.5">{providerMetadata.tokenUsage.totalTokens}</p>
                  </div>
                </div>
              )}

              {providerMetadata.stages && providerMetadata.stages.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-forest/60">
                    Server Pipeline Stage Latencies
                  </span>
                  <div className="space-y-1 text-xs font-mono">
                    {providerMetadata.stages.map((st: { name: string; durationMs: number }, i: number) => (
                      <div key={i} className="p-2 rounded-lg bg-sand border border-forest/10 flex items-center justify-between">
                        <span>{st.name}</span>
                        <span className="text-forest/60">{st.durationMs}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
