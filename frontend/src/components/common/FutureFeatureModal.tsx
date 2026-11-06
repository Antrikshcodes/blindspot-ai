import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { MagneticButton } from './MagneticButton';

interface FutureFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultIdea?: string;
}

export const FutureFeatureModal: React.FC<FutureFeatureModalProps> = ({
  isOpen,
  onClose,
  defaultIdea = '',
}) => {
  const [ideaText, setIdeaText] = useState(defaultIdea);
  const [analyzed, setAnalyzed] = useState(false);

  const sampleIdea = "An on-demand laundry app for university dorms where students pay $15/month for automated locker drop-off.";

  const handlePreviewAnalysis = () => {
    if (!ideaText.trim()) {
      setIdeaText(sampleIdea);
    }
    setAnalyzed(true);
  };

  const handleReset = () => {
    setAnalyzed(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-forest-dark/80 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-sand border-2 border-forest/30 rounded-3xl shadow-2xl overflow-hidden z-10 p-6 md:p-8 text-forest"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-forest/15 pb-4 mb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider bg-purple/15 text-purple border border-purple/30 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Phase 1 Live Architecture Preview
                </span>
                <h3 id="modal-title" className="text-2xl md:text-3xl font-extrabold tracking-tight text-forest">
                  Idea Validation Studio
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-forest/10 text-forest/70 hover:text-forest transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            {!analyzed ? (
              <div className="space-y-4">
                <p className="text-sm md:text-base text-forest/80 leading-relaxed">
                  Blindspot AI deconstructs ideas into 10 structured risk categories and isolates lethal assumptions before you write code. Try entering an idea or click the sample below to preview how the engine evaluates assumptions.
                </p>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-forest/70 mb-2">
                    Describe your product concept & target users:
                  </label>
                  <textarea
                    rows={3}
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    placeholder="e.g. A peer-to-peer textbook rental marketplace for college students..."
                    className="w-full p-4 rounded-xl bg-sand-light border border-forest/20 text-forest placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple text-sm font-sans"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIdeaText(sampleIdea)}
                    className="text-xs font-mono underline text-forest/70 hover:text-forest cursor-pointer"
                  >
                    Load sample idea
                  </button>

                  <div className="flex items-center gap-3">
                    <MagneticButton variant="ghost" size="sm" onClick={onClose}>
                      Cancel
                    </MagneticButton>
                    <MagneticButton variant="purple" size="sm" onClick={handlePreviewAnalysis}>
                      Preview Assumption Breakdown <ArrowRight className="w-4 h-4 ml-1" />
                    </MagneticButton>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="p-4 rounded-2xl bg-sand-light border border-forest/15">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-forest/60 mb-1">
                    Submitted Idea
                  </div>
                  <p className="text-sm font-medium text-forest italic">
                    "{ideaText || sampleIdea}"
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-forest/70 font-semibold">
                      Extracted Blindspots & Lethal Assumptions (Preview)
                    </h4>
                    <span className="text-xs font-mono bg-purple/15 text-purple px-2 py-0.5 rounded-full font-bold">
                      Mom Test Logic
                    </span>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {/* Lethal Risk Item */}
                    <div className="p-3.5 rounded-xl bg-forest/5 border border-purple/30">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-purple flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> CRITICAL RISK (Score: 20/25)
                        </span>
                        <span className="font-mono text-forest/60">Category: WILLINGNESS_TO_PAY</span>
                      </div>
                      <p className="text-xs md:text-sm font-semibold text-forest">
                        Students have sufficient recurring budget and will prioritize paying $15/mo over using existing dorm coin laundry.
                      </p>
                      <p className="text-xs font-serif italic text-forest/70 mt-1">
                        Recommended Mom Test Probe: "How much did you spend on laundry last month, and what workarounds have you tried when machines were broken?"
                      </p>
                    </div>

                    {/* Operational Risk Item */}
                    <div className="p-3.5 rounded-xl bg-forest/5 border border-forest/20">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-forest flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-forest" /> HIGH RISK (Score: 16/25)
                        </span>
                        <span className="font-mono text-forest/60">Category: OPERATIONAL / ACCESS</span>
                      </div>
                      <p className="text-xs md:text-sm font-semibold text-forest">
                        University residential life authorities will permit external locker installations inside restricted dorm buildings.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-forest/15 flex items-center justify-between">
                  <button
                    onClick={handleReset}
                    className="text-xs font-mono text-forest/70 hover:text-forest underline cursor-pointer"
                  >
                    Test another idea
                  </button>
                  <MagneticButton variant="forest" size="sm" onClick={onClose}>
                    Done Exploring
                  </MagneticButton>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

