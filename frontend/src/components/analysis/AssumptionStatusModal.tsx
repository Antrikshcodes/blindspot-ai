import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateAssumptionStatus } from '../../api/analysisApi';
import type { ScoredAssumption, AssumptionStatus } from '../../types/analysis';

interface AssumptionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  assumption: ScoredAssumption | null;
  onSuccess?: (updated: ScoredAssumption) => void;
}

export const AssumptionStatusModal: React.FC<AssumptionStatusModalProps> = ({
  isOpen,
  onClose,
  assumption,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [targetStatus, setTargetStatus] = useState<AssumptionStatus | ''>('');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);

  const {
    mutateAsync: updateStatus,
    isPending,
    error: apiError,
  } = useUpdateAssumptionStatus();

  if (!assumption) return null;

  const currentStatus = assumption.status;
  const evidenceRecords = assumption.evidenceRecords || [];

  // Allowed transitions per backend rules:
  const allowedTransitions: Record<AssumptionStatus, AssumptionStatus[]> = {
    UNTESTED: ['TESTING'],
    TESTING: ['SUPPORTED', 'INVALIDATED', 'INCONCLUSIVE'],
    SUPPORTED: ['TESTING'],
    INVALIDATED: ['TESTING'],
    INCONCLUSIVE: ['TESTING'],
  };

  const availableTargets = allowedTransitions[currentStatus] || [];
  const isTerminal = targetStatus === 'SUPPORTED' || targetStatus === 'INVALIDATED' || targetStatus === 'INCONCLUSIVE';

  const handleToggleEvidence = (id: string) => {
    setSelectedEvidenceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    if (!targetStatus) {
      setClientError('Please select a target status.');
      return;
    }

    if (isTerminal && selectedEvidenceIds.length === 0) {
      setClientError(
        'Terminal outcomes (SUPPORTED, INVALIDATED, INCONCLUSIVE) require at least one cited evidence record per backend validation rules.'
      );
      return;
    }

    // Client-side sentiment check to guide founder
    if (targetStatus === 'SUPPORTED') {
      const cited = evidenceRecords.filter((rec) => selectedEvidenceIds.includes(rec.id));
      const hasSupporting = cited.some((r) => r.sentiment === 'SUPPORTING');
      if (!hasSupporting) {
        setClientError(
          'Backend Policy: An assumption cannot be marked SUPPORTED unless at least one cited evidence record has SUPPORTING sentiment.'
        );
        return;
      }
    }

    if (targetStatus === 'INVALIDATED') {
      const cited = evidenceRecords.filter((rec) => selectedEvidenceIds.includes(rec.id));
      const hasInvalidating = cited.some((r) => r.sentiment === 'INVALIDATING');
      if (!hasInvalidating) {
        setClientError(
          'Backend Policy: An assumption cannot be marked INVALIDATED unless at least one cited evidence record has INVALIDATING sentiment.'
        );
        return;
      }
    }

    try {
      const response = await updateStatus({
        id: assumption.id,
        data: {
          status: targetStatus,
          evidenceIds: selectedEvidenceIds,
        },
      });

      // Invalidate assumption queries
      await queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      if (response?.data) {
        onSuccess?.(response.data);
      }
      onClose();
    } catch (err: any) {
      // Caught via apiError
    }
  };

  const renderErrorMessage = () => {
    if (clientError) {
      return (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{clientError}</span>
        </div>
      );
    }

    if (!apiError) return null;

    const errorObj = (apiError as any)?.data?.error;
    const errorCode = errorObj?.code || 'STATUS_UPDATE_FAILED';
    const errorMessage = errorObj?.message || (apiError as any)?.message || 'Failed to update assumption status.';

    return (
      <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-800 text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-red-600">
          <ShieldAlert className="w-3.5 h-3.5" /> {errorCode}
        </div>
        <p>{errorMessage}</p>
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
            className="relative w-full max-w-xl bg-sand border-2 border-forest/30 rounded-3xl shadow-2xl overflow-hidden z-10 p-6 sm:p-8 text-forest max-h-[90vh] overflow-y-auto space-y-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-forest/15 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider bg-purple/15 text-purple border border-purple/30 mb-2">
                  Validation Lifecycle Gate
                </span>
                <h3 id="status-modal-title" className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-forest">
                  Manage Assumption Status
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={isPending}
                className="p-2.5 rounded-full hover:bg-forest/10 text-forest/70 hover:text-forest transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Assumption Title */}
            <div className="p-4 rounded-2xl bg-sand-light border border-forest/15 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-forest/60 font-semibold">
                Target Hypothesis
              </span>
              <p className="text-xs sm:text-sm font-bold text-forest leading-snug">
                {assumption.title || assumption.description}
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] font-mono">
                <span className="text-forest/60">Current Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-forest/10 text-forest font-bold">
                  {currentStatus}
                </span>
              </div>
            </div>

            {/* State Transition Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {renderErrorMessage()}

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-forest/80 mb-2">
                  Select New Status:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableTargets.map((status) => {
                    const isSelected = targetStatus === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setTargetStatus(status);
                          setClientError(null);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-forest text-sand border-forest shadow-sm'
                            : 'bg-sand-light border-forest/20 text-forest hover:bg-forest/5'
                        }`}
                      >
                        <span className="text-xs font-bold font-mono">{status}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-purple" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Terminal Evidence Requirement Notice */}
              {isTerminal && (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-purple/10 border border-purple/20 text-xs text-forest space-y-1">
                    <div className="flex items-center gap-1.5 font-bold font-mono text-purple uppercase text-[10px]">
                      <Info className="w-3.5 h-3.5" /> Backend Evidence Rule
                    </div>
                    <p className="text-[11px] text-forest/80 leading-relaxed font-sans">
                      Marking an assumption as <strong>{targetStatus}</strong> requires cited customer evidence. The server requires at least one reviewed evidence record with matching sentiment.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-forest/80 mb-1.5">
                      Cite Verified Evidence Records ({selectedEvidenceIds.length} selected):
                    </label>

                    {evidenceRecords.length === 0 ? (
                      <div className="p-4 rounded-xl bg-sand-light border border-dashed border-forest/30 text-center space-y-2">
                        <FileText className="w-6 h-6 text-forest/40 mx-auto" />
                        <p className="text-xs text-forest/70 font-sans">
                          No interview feedback or evidence records are currently linked to this assumption.
                        </p>
                        <p className="text-[11px] text-forest/60 italic font-sans">
                          Tip: Move to <strong>TESTING</strong> first, then record customer discovery interviews in Phase 3.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {evidenceRecords.map((record) => {
                          const isChecked = selectedEvidenceIds.includes(record.id);
                          return (
                            <label
                              key={record.id}
                              className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs transition-all ${
                                isChecked
                                  ? 'bg-purple/15 border-purple/40 text-forest font-medium'
                                  : 'bg-sand-light border-forest/15 text-forest/80 hover:bg-forest/5'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleEvidence(record.id)}
                                className="mt-0.5 rounded text-purple focus:ring-purple"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple font-bold">
                                  <span>{record.sentiment}</span>
                                  <span>•</span>
                                  <span className="text-forest/50">{record.origin}</span>
                                </div>
                                <p className="text-[11px] italic mt-0.5 line-clamp-2">"{record.quote}"</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-forest/15 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="px-4 py-2 rounded-full text-xs font-bold text-forest/70 hover:text-forest transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending || !targetStatus}
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Updating...' : 'Confirm Status Update'}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
