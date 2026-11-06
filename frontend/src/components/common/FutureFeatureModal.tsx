import React, { useState, useEffect } from 'react';
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

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
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
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-sand border-2 border-forest/30 rounded-3xl shadow-2xl overflow-hidden z-10 p-5 sm:p-7 md:p-8 text-forest max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-forest/15 pb-4 mb-5 sm:mb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider bg-purple/15 text-purple border border-purple/30 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Phase 1 Architecture Preview
                </span>
                <h3 id="modal-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-forest">
                  Idea Validation Studio
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-full hover:bg-forest/10 text-forest/70 hover:text-forest transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close dialog (Escape)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            {!analyzed ? (
              <div className="space-y-4">
                <p className="text-sm sm:text-base text-forest/80 leading-relaxed">
                  Blindspot AI deconstructs ideas across 10 structured risk categories to isolate lethal assumptions before coding begins. Type your concept or click the sample below to preview how the engine scores assumptions.
                </p>

                <div>
                  <label htmlFor="idea-input" className="block text-xs font-mono uppercase tracking-wider text-forest/70 mb-2 font-semibold">
                    Describe your product concept & target users:
                  </label>
                  <textarea
                    id="idea-input"
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
                    className="text-xs font-mono underline text-forest/70 hover:text-forest cursor-pointer py-1"
                  >
                    Load sample idea
                  </button>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
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
                    Submitted Concept
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-forest italic">
                    "{ideaText || sampleIdea}"
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-forest/70 font-semibold truncate">
                      Extracted Blindspots & Risk Matrix (Preview)
                    </h4>
                    <span className="text-[11px] font-mono bg-purple/15 text-purple px-2 py-0.5 rounded-full font-bold shrink-0">
                      Mom Test Logic
                    </span>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {/* Critical Risk Item */}
                    <div className="p-3.5 rounded-xl bg-forest/5 border border-purple/30">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-purple flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> CRITICAL RISK (Score: 20/25)
                        </span>
                        <span className="font-mono text-forest/60 text-[10px]">WILLINGNESS_TO_PAY</span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-forest">
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
                        <span className="font-mono text-forest/60 text-[10px]">OPERATIONAL / ACCESS</span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-forest">
                        University residential life authorities will permit external locker installations inside restricted dorm buildings.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-forest/15 flex items-center justify-between">
                  <button
                    onClick={handleReset}
                    className="text-xs font-mono text-forest/70 hover:text-forest underline cursor-pointer py-1"
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
