import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, ShieldCheck, Layers, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MagneticButton } from './MagneticButton';

interface FutureFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FutureFeatureModal: React.FC<FutureFeatureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

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

  const handleStartRealAnalysis = () => {
    onClose();
    navigate('/dashboard');
  };

  const CATEGORIES = [
    { name: 'Problem & Customer', desc: 'Is the pain severe, frequent, and actively experienced?' },
    { name: 'Demand & Willingness to Pay', desc: 'Will users commit budget or replace active paid workarounds?' },
    { name: 'Behavior & Habits', desc: 'Does the solution demand workflow changes people resist?' },
    { name: 'Technical & Operational', desc: 'Can it be built reliably without fatal dependencies?' },
  ];

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
            className="relative w-full max-w-2xl bg-sand border-2 border-forest/30 rounded-3xl shadow-2xl overflow-hidden z-10 p-6 sm:p-8 text-forest max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-forest/15 pb-4 mb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider bg-purple/15 text-purple border border-purple/30 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Real AI Validation Engine
                </span>
                <h3 id="modal-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-forest">
                  How Blindspot AI Deconstructs Ideas
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

            {/* Educational content explaining genuine workflow */}
            <div className="space-y-6">
              <p className="text-sm sm:text-base text-forest/80 leading-relaxed font-sans">
                Blindspot AI executes a genuine 6-stage AI engine on your product hypothesis. Instead of generating generic hype or arbitrary startup scores, it decomposes your product, extracts 3–15 falsifiable assumptions across 10 risk dimensions, and synthesizes non-leading Mom Test interview questions.
              </p>

              {/* 10-Dimension Risk Taxonomy Overview */}
              <div className="p-4 sm:p-5 rounded-2xl bg-sand-light border border-forest/15 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-forest/70">
                  <Layers className="w-4 h-4 text-purple" /> 10 Structured Risk Dimensions
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {CATEGORIES.map((cat, i) => (
                    <div key={i} className="p-3 rounded-xl bg-sand border border-forest/10 space-y-1">
                      <div className="text-xs font-bold text-forest flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple shrink-0" />
                        {cat.name}
                      </div>
                      <p className="text-[11px] text-forest/70 leading-snug">{cat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Server-Enforced Evidence Policy */}
              <div className="p-4 rounded-2xl bg-forest/5 border border-forest/15 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-forest">
                  <ShieldCheck className="w-4 h-4 text-purple" /> Deterministic Evidence Protocol
                </div>
                <p className="text-xs text-forest/75 leading-relaxed font-sans">
                  Risk scores are strictly computed via <strong>Impact (1–5) × Uncertainty (1–5) = Priority (1–25)</strong>. Market demand is never fabricated or claimed validated until verified qualitative quotes or experiment observations are linked.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-forest/15 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-mono text-forest/70 hover:text-forest underline cursor-pointer py-1"
                >
                  Close Preview
                </button>

                <div className="flex items-center gap-3">
                  <MagneticButton variant="purple" size="sm" onClick={handleStartRealAnalysis}>
                    Go to Workspace & Run Real Analysis <ArrowRight className="w-4 h-4 ml-1" />
                  </MagneticButton>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
