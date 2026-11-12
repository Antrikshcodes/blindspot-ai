import React from 'react';
import { motion } from 'framer-motion';
import {
  Info,
  HelpCircle,
  Quote,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useGetAnalysisBlindspots } from '../../api/analysisApi';
import type { BlindspotItem } from '../../types/analysis';
import { getRiskLevelStyles } from '../../types/analysis';

interface BlindspotDiscoveryProps {
  analysisId: string;
  fallbackItems?: BlindspotItem[];
  onSelectAssumption?: (assumptionId: string) => void;
}

export const BlindspotDiscovery: React.FC<BlindspotDiscoveryProps> = ({
  analysisId,
  fallbackItems,
  onSelectAssumption,
}) => {
  const { data, isLoading } = useGetAnalysisBlindspots(analysisId, {
    query: {
      enabled: Boolean(analysisId),
    },
  });

  const responseData = data?.data;
  const isAvailable = responseData?.available ?? true;
  const items: BlindspotItem[] = responseData?.items || fallbackItems || [];

  if (isLoading && items.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-sand-light border border-forest/15 text-center text-forest space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-purple border-t-transparent animate-spin mx-auto" />
        <p className="text-xs font-mono text-forest/70">Retrieving identified blindspots from engine...</p>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="p-8 rounded-3xl bg-sand-light border border-dashed border-forest/20 text-center space-y-3">
        <Info className="w-8 h-8 text-forest/40 mx-auto" />
        <h3 className="text-base font-serif font-bold text-forest">Blindspots Artifact Not Available</h3>
        <p className="text-xs text-forest/70 max-w-md mx-auto font-sans leading-relaxed">
          {responseData?.reason || 'This historical analysis predates the Phase 02 engine.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner: Explicitly AI-Generated Hypotheses */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold uppercase tracking-wider font-mono text-[10px] text-amber-800">
            Founder Intelligence Notice
          </p>
          <p className="leading-relaxed font-sans">
            Blindspots are <strong>AI-generated hypotheses</strong> grounded in unexamined premises within your concept description. They represent fatal operational, behavioural, and financial risks founders routinely overlook. They are not certified external facts.
          </p>
        </div>
      </div>

      {/* Blindspots Grid */}
      {items.length === 0 ? (
        <div className="p-10 rounded-3xl bg-sand-light border border-forest/15 text-center text-forest/60 space-y-2">
          <HelpCircle className="w-8 h-8 mx-auto opacity-40 text-purple" />
          <p className="text-sm font-semibold">No distinct blindspots were flagged for this hypothesis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((spot) => {
            const riskStyles = getRiskLevelStyles(spot.severity);

            return (
              <motion.div
                key={spot.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 sm:p-6 rounded-3xl bg-sand-light border border-forest/15 hover:border-purple/40 shadow-sm transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${riskStyles.bg} ${riskStyles.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${riskStyles.dot}`} />
                      {spot.severity} SEVERITY
                    </span>

                    {spot.grounding && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sand border border-forest/10 text-forest/60">
                        Grounding: {spot.grounding}
                      </span>
                    )}
                  </div>

                  {/* Title & Explanation */}
                  <div>
                    <h3 className="text-base font-serif font-bold text-forest leading-snug">
                      {spot.title}
                    </h3>
                    <p className="text-xs text-forest/80 font-sans mt-2 leading-relaxed">
                      {spot.explanation}
                    </p>
                  </div>

                  {/* Why Overlooked */}
                  <div className="p-3.5 rounded-2xl bg-sand border border-forest/10 space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-forest/60">
                      Why Founders Overlook This:
                    </span>
                    <p className="text-xs text-forest/80 font-sans leading-relaxed">
                      {spot.whyOverlooked}
                    </p>
                  </div>

                  {/* Source Quote Grounding */}
                  {spot.sourceQuote && (
                    <div className="p-3 rounded-xl bg-purple/10 border border-purple/20 space-y-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-purple font-bold flex items-center gap-1">
                        <Quote className="w-3 h-3" /> Source Context
                      </span>
                      <p className="text-xs italic text-forest/90 leading-relaxed">
                        "{spot.sourceQuote}"
                      </p>
                    </div>
                  )}

                  {/* Suggested Action & Evidence Required */}
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-forest/70 uppercase font-mono text-[10px] shrink-0 mt-0.5">
                        Action:
                      </span>
                      <p className="text-forest/85 font-sans leading-snug">{spot.suggestedAction}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-forest/70 uppercase font-mono text-[10px] shrink-0 mt-0.5">
                        Evidence Needed:
                      </span>
                      <p className="text-forest/85 font-sans leading-snug">{spot.evidenceRequired}</p>
                    </div>
                  </div>
                </div>

                {/* Footer link to related assumption */}
                {spot.relatedAssumptionId && (
                  <div className="pt-3 border-t border-forest/10 flex items-center justify-between text-[11px] font-mono text-forest/60">
                    <span className="truncate max-w-[180px]">
                      Hypothesis: {spot.relatedAssumptionId.slice(0, 8)}…
                    </span>
                    {onSelectAssumption && (
                      <button
                        type="button"
                        onClick={() => onSelectAssumption(spot.relatedAssumptionId)}
                        className="text-purple hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        Inspect Assumption <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
