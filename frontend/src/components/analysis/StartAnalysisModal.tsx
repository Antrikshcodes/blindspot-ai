import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Clock,
  Layers,
  ShieldAlert,
  ServerCrash,
  Lock,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRunRealAnalysis } from '../../api/analysisApi';
import type { FullAnalysis } from '../../types/analysis';
import { AnalysisProcessingState } from './AnalysisProcessingState';

interface StartAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    productDescription: string;
    problemStatement: string;
    targetAudience: string;
    proposedSolution: string;
    existingAlternatives?: string[] | null;
  };
  onAnalysisComplete: (analysis: FullAnalysis) => void;
}

export const StartAnalysisModal: React.FC<StartAnalysisModalProps> = ({
  isOpen,
  onClose,
  project,
  onAnalysisComplete,
}) => {
  const queryClient = useQueryClient();
  const [marketContext, setMarketContext] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  const {
    mutateAsync: runAnalysis,
    isPending,
    error: apiError,
    reset: resetMutation,
  } = useRunRealAnalysis();

  // Reset local state when opened
  useEffect(() => {
    if (isOpen) {
      setMarketContext('');
      setAdditionalContext('');
      setClientError(null);
      resetMutation();
    }
  }, [isOpen, resetMutation]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isPending, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    // Validate lengths matching backend contracts
    if (marketContext.length > 4000) {
      setClientError('Market context cannot exceed 4,000 characters.');
      return;
    }
    if (additionalContext.length > 6000) {
      setClientError('Additional context cannot exceed 6,000 characters.');
      return;
    }

    try {
      const payload: { marketContext?: string; additionalContext?: string } = {};
      if (marketContext.trim()) payload.marketContext = marketContext.trim();
      if (additionalContext.trim()) payload.additionalContext = additionalContext.trim();

      const response = await runAnalysis({
        id: project.id,
        data: payload,
      });

      // Invalidate relevant React Query caches
      await queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'analysis'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'analyses'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id] });

      if (response?.data) {
        onAnalysisComplete(response.data);
      }
    } catch (err: any) {
      // Handled via apiError render
    }
  };

  // Human-friendly error parsing
  const renderError = () => {
    if (clientError) {
      return (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{clientError}</span>
        </div>
      );
    }

    if (!apiError) return null;

    const errorObj = (apiError as any)?.data?.error;
    const statusCode = (apiError as any)?.status;
    const errorCode = errorObj?.code || 'ANALYSIS_FAILED';
    const errorMessage = errorObj?.message || (apiError as any)?.message || 'AI Idea Analysis request failed.';

    let title = 'Analysis Request Failed';
    let Icon = AlertCircle;

    if (statusCode === 401 || errorCode === 'UNAUTHENTICATED') {
      title = 'Authentication Required';
      Icon = Lock;
    } else if (statusCode === 403 || errorCode === 'ORIGIN_REJECTED') {
      title = 'Access Denied';
      Icon = ShieldAlert;
    } else if (statusCode === 429 || errorCode === 'RATE_LIMITED' || errorCode === 'AI_BUSY') {
      title = 'AI Rate Limit Reached';
      Icon = Clock;
    } else if (statusCode === 502 || errorCode === 'AI_PROVIDER_ERROR' || errorCode === 'AI_REFERENCE_INVALID') {
      title = 'AI Provider Temporary Error';
      Icon = ServerCrash;
    } else if (statusCode === 504 || errorCode === 'AI_TIMEOUT') {
      title = 'Analysis Timed Out';
      Icon = Clock;
    }

    return (
      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-800 space-y-1">
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
          <Icon className="w-4 h-4 text-red-600 shrink-0" />
          <span>{title}</span>
          <span className="text-[10px] font-mono text-red-500 ml-auto">
            {errorCode} {statusCode ? `// HTTP ${statusCode}` : ''}
          </span>
        </div>
        <p className="text-xs text-red-700 leading-relaxed font-sans">{errorMessage}</p>
      </div>
    );
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
            onClick={!isPending ? onClose : undefined}
            className="fixed inset-0 bg-forest-dark/80 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-3xl bg-sand border-2 border-forest/30 rounded-3xl shadow-2xl overflow-hidden z-10 p-5 sm:p-7 md:p-8 text-forest max-h-[92vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-modal-title"
          >
            {isPending ? (
              <AnalysisProcessingState projectName={project.name} />
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-forest/15 pb-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider bg-purple/15 text-purple border border-purple/30 mb-2">
                      <Sparkles className="w-3.5 h-3.5" /> Phase 02 AI Engine
                    </span>
                    <h2
                      id="analysis-modal-title"
                      className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-forest"
                    >
                      Initiate AI Idea Deconstruction
                    </h2>
                    <p className="text-xs sm:text-sm text-forest/75 mt-1 font-sans">
                      Verify your project hypothesis inputs and provide optional market context before running analysis.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2.5 rounded-full hover:bg-forest/10 text-forest/70 hover:text-forest transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                    aria-label="Close dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Project Snapshot Review */}
                <div className="p-5 rounded-2xl bg-sand-light border border-forest/15 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-forest/60 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple" /> Verified Project Snapshot
                    </span>
                    <span className="text-[10px] text-forest/40">UUID: {project.id.slice(0, 8)}…</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-forest/70 uppercase text-[10px]">Product Name:</span>
                      <p className="font-semibold text-forest mt-0.5">{project.name}</p>
                    </div>

                    <div>
                      <span className="font-bold text-forest/70 uppercase text-[10px]">Target Audience:</span>
                      <p className="text-forest mt-0.5">{project.targetAudience}</p>
                    </div>

                    <div className="md:col-span-2">
                      <span className="font-bold text-forest/70 uppercase text-[10px]">Core Problem Statement:</span>
                      <p className="text-forest mt-0.5 italic border-l-2 border-purple pl-2.5">
                        "{project.problemStatement}"
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <span className="font-bold text-forest/70 uppercase text-[10px]">Proposed Solution:</span>
                      <p className="text-forest mt-0.5">{project.proposedSolution}</p>
                    </div>

                    {project.existingAlternatives && project.existingAlternatives.length > 0 && (
                      <div className="md:col-span-2">
                        <span className="font-bold text-forest/70 uppercase text-[10px]">
                          Existing Alternatives ({project.existingAlternatives.length}):
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {project.existingAlternatives.map((alt, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-sand border border-forest/10 text-[11px] text-forest font-medium"
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Context Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {renderError()}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="marketContext"
                        className="text-xs font-mono font-bold uppercase tracking-wider text-forest/80"
                      >
                        Market & Industry Context (Optional)
                      </label>
                      <span className="text-[10px] font-mono text-forest/50">
                        {marketContext.length}/4000
                      </span>
                    </div>
                    <textarea
                      id="marketContext"
                      rows={3}
                      value={marketContext}
                      maxLength={4000}
                      onChange={(e) => setMarketContext(e.target.value)}
                      placeholder="e.g. Industry vertical dynamics, known consumer habits, regulatory landscape, or competitive forces..."
                      className="w-full p-3.5 rounded-xl bg-sand-light border border-forest/20 text-forest placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple text-xs font-sans"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="additionalContext"
                        className="text-xs font-mono font-bold uppercase tracking-wider text-forest/80"
                      >
                        Additional Constraints or Founder Notes (Optional)
                      </label>
                      <span className="text-[10px] font-mono text-forest/50">
                        {additionalContext.length}/6000
                      </span>
                    </div>
                    <textarea
                      id="additionalContext"
                      rows={3}
                      value={additionalContext}
                      maxLength={6000}
                      onChange={(e) => setAdditionalContext(e.target.value)}
                      placeholder="e.g. Early founder intuition, technical constraints, team strengths, distribution channels planned..."
                      className="w-full p-3.5 rounded-xl bg-sand-light border border-forest/20 text-forest placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple text-xs font-sans"
                    />
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-forest/15 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isPending}
                      className="px-4 py-2 rounded-full text-xs font-bold text-forest/70 hover:text-forest hover:bg-forest/5 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-6 py-2.5 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light transition-all flex items-center gap-2 shadow-sm hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-purple disabled:opacity-60 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple" />
                      <span>Start Real AI Analysis</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

