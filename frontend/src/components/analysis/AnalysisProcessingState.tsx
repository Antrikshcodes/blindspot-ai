import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BrainCircuit, Layers, ShieldCheck, Compass, FileCheck } from 'lucide-react';

interface AnalysisProcessingStateProps {
  projectName?: string;
  onCancel?: () => void;
}

const STAGES = [
  { id: 1, title: 'Understanding the Idea', desc: 'Validating problem, audience & proposed value mechanism', icon: BrainCircuit },
  { id: 2, title: 'Decomposing the Product', desc: 'Isolating core functionality, requirements & business premises', icon: Layers },
  { id: 3, title: 'Extracting Assumptions', desc: 'Scanning across 10 structured risk dimensions', icon: Compass },
  { id: 4, title: 'Assessing Risk Deterministically', desc: 'Computing Impact (1–5) × Uncertainty (1–5) scores', icon: ShieldCheck },
  { id: 5, title: 'Discovering Blindspots', desc: 'Extracting lethal unstated premises & non-leading interview probes', icon: Sparkles },
  { id: 6, title: 'Synthesizing Validation Report', desc: 'Assembling grounded dimensions, risks & next steps', icon: FileCheck },
];

export const AnalysisProcessingState: React.FC<AnalysisProcessingStateProps> = ({
  projectName,
  onCancel,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="p-6 sm:p-10 rounded-3xl bg-sand-light border-2 border-forest/20 shadow-xl max-w-3xl mx-auto space-y-8 text-forest"
      role="status"
      aria-live="polite"
    >
      {/* Top Header with Pulsing Neural Radar */}
      <div className="text-center space-y-3">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-purple/20"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-1 rounded-full border-2 border-dashed border-purple/60"
          />
          <div className="w-10 h-10 rounded-full bg-forest text-purple flex items-center justify-center shadow-md z-10">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div>
          <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest text-purple bg-purple/10 px-3 py-1 rounded-full mb-1">
            Phase 02 AI Engine Active
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-forest">
            Deconstructing {projectName ? `"${projectName}"` : 'Hypothesis'}
          </h2>
          <p className="text-xs sm:text-sm text-forest/75 max-w-lg mx-auto font-sans mt-1">
            The AI engine is running server-side idea analysis. The backend executes this multi-stage pipeline atomically and returns once the full verification record is ready.
          </p>
        </div>
      </div>

      {/* Six Stage Pipeline Conceptual Architecture Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-sand border border-forest/15 space-y-4">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-forest/70 uppercase tracking-wider pb-2 border-b border-forest/10">
          <span>Server Execution Pipeline (6 Stages)</span>
          <span className="text-[10px] text-purple lowercase font-normal italic">atomic server execution</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className="p-3 rounded-xl bg-sand-light/70 border border-forest/10 flex items-start gap-3 transition-colors"
              >
                <div className="p-2 rounded-lg bg-forest/5 text-purple shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-forest truncate">
                      {stage.id}. {stage.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-forest/70 leading-snug mt-0.5 font-sans">
                    {stage.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Honest Status Note & Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-forest/10 text-xs text-forest/65 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple animate-ping shrink-0" />
          <span>Awaiting server response • LLM structured output parsing in progress</span>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-forest/60 hover:text-forest underline font-mono py-1"
          >
            Cancel / Back to Project
          </button>
        )}
      </div>
    </motion.div>
  );
};

