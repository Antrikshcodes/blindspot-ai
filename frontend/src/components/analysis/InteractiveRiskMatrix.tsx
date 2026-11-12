import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FilterX,
  Layers,
  ChevronRight,
} from 'lucide-react';
import type { ScoredAssumption, SeverityLevel } from '../../types/analysis';
import {
  getPhase02RiskLevel,
  getRiskLevelStyles,
  getStatusBadgeStyles,
} from '../../types/analysis';

interface InteractiveRiskMatrixProps {
  assumptions: ScoredAssumption[];
  onSelectAssumption?: (assumption: ScoredAssumption) => void;
}

export const InteractiveRiskMatrix: React.FC<InteractiveRiskMatrixProps> = ({
  assumptions,
  onSelectAssumption,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ impact: number; uncertainty: number } | null>(null);

  // Filter assumptions for currently selected cell (if any)
  const cellAssumptions = selectedCell
    ? assumptions.filter(
        (a) => a.impact === selectedCell.impact && a.uncertainty === selectedCell.uncertainty
      )
    : [];

  const handleCellClick = (impact: number, uncertainty: number) => {
    if (selectedCell?.impact === impact && selectedCell?.uncertainty === uncertainty) {
      setSelectedCell(null); // toggle off
    } else {
      setSelectedCell({ impact, uncertainty });
    }
  };

  const getCellColorClass = (score: number, isSelected: boolean): string => {
    const level: SeverityLevel = getPhase02RiskLevel(score);

    if (isSelected) {
      return 'ring-2 ring-forest shadow-md border-forest scale-[1.02] z-10';
    }

    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/15 border-red-500/30 text-red-900 hover:bg-red-500/25';
      case 'HIGH':
        return 'bg-purple/20 border-purple/35 text-forest hover:bg-purple/30';
      case 'MEDIUM':
        return 'bg-amber-500/15 border-amber-500/30 text-forest hover:bg-amber-500/25';
      case 'LOW':
      default:
        return 'bg-forest/5 border-forest/15 text-forest/80 hover:bg-forest/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Matrix Controls & Legend Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-sand-light border border-forest/15">
        <div>
          <h3 className="text-base font-serif font-bold text-forest flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple" /> 5×5 Deterministic Risk Matrix
          </h3>
          <p className="text-xs text-forest/70 font-sans mt-0.5">
            Formula: <code>Impact (1–5) × Uncertainty (1–5) = Priority (1–25)</code>. Click any cell to inspect linked hypotheses.
          </p>
        </div>

        {/* Risk Tier Legend */}
        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-800 border border-red-500/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> CRITICAL (20–25)
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple/20 text-purple border border-purple/35 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple" /> HIGH (13–19)
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> MEDIUM (7–12)
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-forest/10 text-forest/70 border border-forest/20 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-forest/40" /> LOW (1–6)
          </span>
        </div>
      </div>

      {/* Interactive 5x5 Grid Layout with Axes */}
      <div className="p-4 sm:p-6 rounded-3xl bg-sand-light border border-forest/15 shadow-sm overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Y-Axis Label + Grid Container */}
          <div className="flex items-stretch gap-3">
            {/* Y-Axis Title (Vertical) */}
            <div className="flex flex-col items-center justify-center w-8 shrink-0 py-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-forest/70 -rotate-90 whitespace-nowrap">
                Impact (1–5) →
              </span>
            </div>

            {/* Matrix Body: Rows 5 down to 1 */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((impact) => (
                <div key={impact} className="flex items-center gap-2">
                  {/* Row Impact Label */}
                  <div className="w-14 text-right pr-2 text-xs font-mono font-bold text-forest/70 shrink-0">
                    Imp {impact}
                  </div>

                  {/* 5 Columns for Uncertainty 1 to 5 */}
                  <div className="flex-1 grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((uncertainty) => {
                      const score = impact * uncertainty;
                      const level = getPhase02RiskLevel(score);
                      const inCell = assumptions.filter(
                        (a) => a.impact === impact && a.uncertainty === uncertainty
                      );
                      const isSelected =
                        selectedCell?.impact === impact && selectedCell?.uncertainty === uncertainty;

                      return (
                        <button
                          key={uncertainty}
                          type="button"
                          onClick={() => handleCellClick(impact, uncertainty)}
                          aria-label={`Impact ${impact}, Uncertainty ${uncertainty}, Score ${score}, ${level} Risk, ${inCell.length} assumptions`}
                          className={`relative p-2.5 sm:p-3 rounded-2xl border transition-all text-left flex flex-col justify-between min-h-[72px] sm:min-h-[82px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple ${getCellColorClass(
                            score,
                            isSelected
                          )}`}
                        >
                          <div className="flex items-start justify-between w-full">
                            <span className="text-[10px] font-mono font-bold">
                              {score}
                              <span className="text-[8px] font-normal opacity-60 ml-0.5">pts</span>
                            </span>

                            {inCell.length > 0 && (
                              <span className="w-5 h-5 rounded-full bg-forest text-sand text-[10px] font-mono font-bold flex items-center justify-center shadow-sm">
                                {inCell.length}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[9px] font-mono opacity-80">
                            <span>({impact},{uncertainty})</span>
                            <span className="uppercase text-[8px] font-bold">{level.slice(0, 3)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* X-Axis Header (Uncertainty 1 to 5) */}
              <div className="flex items-center gap-2 pt-2 border-t border-forest/10">
                <div className="w-14 text-right pr-2 text-xs font-mono text-forest/40 shrink-0"></div>
                <div className="flex-1 grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((u) => (
                    <div key={u} className="text-center text-xs font-mono font-bold text-forest/70 py-1">
                      Unc {u}
                    </div>
                  ))}
                </div>
              </div>

              {/* X-Axis Title */}
              <div className="text-center pt-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-forest/70">
                  Uncertainty (1–5) →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Cell Assumptions Panel */}
      <AnimatePresence mode="wait">
        {selectedCell && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-5 sm:p-6 rounded-3xl bg-sand-light border-2 border-purple/30 shadow-md space-y-4"
          >
            <div className="flex items-center justify-between gap-3 border-b border-forest/10 pb-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple/15 text-purple border border-purple/30">
                  Impact {selectedCell.impact} × Uncertainty {selectedCell.uncertainty} = {selectedCell.impact * selectedCell.uncertainty} Score
                </span>
                <span className="text-xs font-serif font-bold text-forest">
                  {cellAssumptions.length} Assumption{cellAssumptions.length === 1 ? '' : 's'} in this Cell
                </span>
              </div>

              <button
                onClick={() => setSelectedCell(null)}
                className="inline-flex items-center gap-1 text-xs font-mono text-forest/70 hover:text-forest underline cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" /> Clear Cell Filter
              </button>
            </div>

            {cellAssumptions.length === 0 ? (
              <p className="text-xs text-forest/60 italic py-2">
                No assumptions were placed in this coordinate by the AI risk assessment.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cellAssumptions.map((assumption) => {
                  const riskStyles = getRiskLevelStyles(assumption.riskLevel);
                  const statusStyles = getStatusBadgeStyles(assumption.status);

                  return (
                    <div
                      key={assumption.id}
                      onClick={() => onSelectAssumption?.(assumption)}
                      className="p-4 rounded-2xl bg-sand border border-forest/15 hover:border-purple/50 transition-all cursor-pointer group space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${riskStyles.bg} ${riskStyles.border} font-bold`}>
                            {assumption.riskLevel} ({assumption.riskScore}/25)
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusStyles.bg} ${statusStyles.border}`}>
                            {assumption.status}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-forest group-hover:text-purple transition-colors leading-snug">
                          {assumption.title || assumption.description}
                        </h4>
                        <p className="text-[11px] text-forest/70 line-clamp-2 mt-1 font-sans">
                          {assumption.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-forest/10 text-[10px] font-mono text-forest/60">
                        <span className="uppercase">{assumption.category}</span>
                        <span className="text-purple group-hover:translate-x-1 transition-transform flex items-center gap-0.5 font-bold">
                          View details <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
