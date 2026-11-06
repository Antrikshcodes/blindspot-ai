import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Compass, FlaskConical, Boxes, Settings, ArrowRight } from 'lucide-react';
import { MagneticButton } from './MagneticButton';

export interface FutureModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName?: string;
  modulePhase?: string;
  description?: string;
}

const MODULE_DATA: Record<string, { icon: React.ElementType; phase: string; title: string; description: string }> = {
  'Idea Analysis': {
    icon: Sparkles,
    phase: 'Phase 02',
    title: 'AI Idea Analysis & Deconstruction',
    description:
      'Extract hidden customer assumptions, compute risk-weighted uncertainty scores, and prioritize hypotheses before building.',
  },
  'Customer Discovery': {
    icon: Compass,
    phase: 'Phase 03',
    title: 'Customer Discovery & Interview Intelligence',
    description:
      'Generate non-leading interview questions, capture real customer feedback notes, and detect contradictions with your core hypotheses.',
  },
  Experiments: {
    icon: FlaskConical,
    phase: 'Phase 03',
    title: 'Experiment Planning & Tracking',
    description:
      'Formulate structured validation experiments with predefined success metrics to prove or invalidate high-impact assumptions.',
  },
  'Resource Intelligence': {
    icon: Boxes,
    phase: 'Phase 03',
    title: 'Resource Intelligence Engine',
    description:
      'Discover relevant GitHub repositories, Hugging Face models, public datasets, and APIs to accelerate proof-of-concept development.',
  },
  Settings: {
    icon: Settings,
    phase: 'Coming Soon',
    title: 'Workspace & Security Settings',
    description:
      'Manage team collaboration, custom AI provider API keys, and validation export preferences.',
  },
};

export const FutureModuleModal: React.FC<FutureModuleModalProps> = ({
  isOpen,
  onClose,
  moduleName = 'Idea Analysis',
  modulePhase,
  description,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeData = MODULE_DATA[moduleName] || {
    icon: Sparkles,
    phase: modulePhase || 'Upcoming Phase',
    title: moduleName,
    description: description || 'This module is scheduled for the next development phase.',
  };

  const Icon = activeData.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="module-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-forest-dark/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-sand-light border border-forest/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-forest z-10 overflow-hidden"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full text-forest/60 hover:text-forest hover:bg-forest/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider bg-purple/10 text-purple border border-purple/20">
                <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse" />
                {activeData.phase}
              </span>
            </div>

            {/* Icon & Title */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-forest/5 border border-forest/10 flex items-center justify-center text-purple flex-shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 id="module-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-forest">
                  {activeData.title}
                </h3>
                <p className="text-xs font-mono text-forest/60 mt-0.5">
                  Scheduled Implementation Roadmap
                </p>
              </div>
            </div>

            {/* Body Description */}
            <p className="text-sm text-forest/80 leading-relaxed mb-6 font-sans">
              {activeData.description}
            </p>

            <div className="p-4 rounded-2xl bg-sand border border-forest/10 mb-6 text-xs text-forest/75 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-purple flex-shrink-0" />
              <span>
                The Project Management foundation is fully operational. This intelligence module will be wired to the verified backend endpoints in the next release.
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <MagneticButton variant="forest" size="sm" onClick={onClose}>
                Understood <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
              </MagneticButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
