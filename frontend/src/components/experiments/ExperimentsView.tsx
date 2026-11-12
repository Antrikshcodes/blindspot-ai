import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  FlaskConical,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  useListExperiments,
  useCreateExperiment,
  useUpdateExperiment,
  type Experiment,
  type ExperimentInput,
  ExperimentUpdateStatus,
} from '@workspace/api-client-react';

interface ExperimentsViewProps {
  projectId: string;
  assumptions?: Array<{ id: string; assumption: string; riskScore?: number }>;
}

export const ExperimentsView: React.FC<ExperimentsViewProps> = ({
  projectId,
  assumptions = [],
}) => {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [observedResultInput, setObservedResultInput] = useState('');

  // Form state
  const [formData, setFormData] = useState<Partial<ExperimentInput>>({
    assumptionId: assumptions[0]?.id || '',
    name: '',
    explanation: '',
    method: 'Landing Page Smoke Test',
    evidenceToCollect: 'Conversion rate on sign-up CTA button',
    successCriteria: '>= 15% conversion across 100 unique visitors',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Queries & Mutations
  const {
    data: experimentsData,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useListExperiments(projectId);

  const { mutateAsync: createMutation, isPending: isCreating } = useCreateExperiment();
  const { mutateAsync: updateMutation, isPending: isUpdating } = useUpdateExperiment();

  const experiments: Experiment[] = experimentsData?.data?.items || [];

  const filteredExperiments = experiments.filter((exp) => {
    if (statusFilter === 'ALL') return true;
    return exp.status === statusFilter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setCreateError('Please enter an experiment title.');
      return;
    }
    const targetAssumptionId = formData.assumptionId?.trim() || assumptions[0]?.id || 'general-hypothesis';

    try {
      setCreateError(null);
      await createMutation({
        id: projectId,
        data: {
          assumptionId: targetAssumptionId,
          name: formData.name.trim(),
          explanation: formData.explanation?.trim() || '',
          method: formData.method?.trim() || 'Custom Validation Test',
          evidenceToCollect: formData.evidenceToCollect?.trim() || '',
          successCriteria: formData.successCriteria?.trim() || '',
        },
      });

      setFormData({
        assumptionId: assumptions[0]?.id || '',
        name: '',
        explanation: '',
        method: 'Landing Page Smoke Test',
        evidenceToCollect: 'Conversion rate on sign-up CTA button',
        successCriteria: '>= 15% conversion across 100 unique visitors',
      });
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/experiments`] });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create experiment.');
    }
  };

  const handleStatusChange = async (
    experimentId: string,
    newStatus: ExperimentUpdateStatus,
    observed?: string
  ) => {
    try {
      await updateMutation({
        id: experimentId,
        data: {
          status: newStatus,
          observedResult: observed,
        },
      });
      setEditingResultId(null);
      setObservedResultInput('');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/experiments`] });
    } catch (err) {
      console.error('Failed to update experiment status:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>Planned</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple/10 text-purple border border-purple/20">
            <TrendingUp className="w-3 h-3" />
            <span>In Progress</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'ABANDONED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>Abandoned</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-forest/5 text-forest/70 border border-forest/15">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-forest/15">
        <div>
          <h2 className="text-2xl font-bold text-forest tracking-tight flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 text-purple" />
            <span>Validation Experiments</span>
          </h2>
          <p className="text-xs text-forest/70 mt-1 max-w-xl">
            Design structured, low-cost falsification experiments. Test riskiest assumptions before investing code or capital.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-forest/20 hover:bg-forest/5 text-forest/70 hover:text-forest transition-colors"
            title="Refresh experiments"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-forest text-sand text-xs font-semibold hover:bg-forest/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-purple" />
            <span>New Experiment</span>
          </button>
        </div>
      </div>

      {/* Metrics & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-sand/30 border border-forest/10">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'] as const).map((s) => {
            const count = s === 'ALL' ? experiments.length : experiments.filter((e) => e.status === s).length;
            const isSelected = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-forest text-sand shadow-sm'
                    : 'bg-white/80 text-forest/70 hover:bg-white hover:text-forest border border-forest/10'
                }`}
              >
                <span>{s.replace('_', ' ')}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isSelected ? 'bg-purple text-white' : 'bg-forest/10 text-forest/70'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="p-12 text-center text-forest/60 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple" />
          <p className="text-xs">Loading validation experiments...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>Failed to load experiments. Please retry.</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredExperiments.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-sand/20 border border-dashed border-forest/20 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-forest/5 text-purple mx-auto flex items-center justify-center">
            <FlaskConical className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-forest">No Experiments Found</p>
          <p className="text-xs text-forest/70 max-w-sm mx-auto leading-relaxed">
            {statusFilter === 'ALL'
              ? 'Formulate your first test: create a smoke test, concierge MVP, or customer pre-commitment test.'
              : `No experiments currently marked as ${statusFilter.toLowerCase().replace('_', ' ')}.`}
          </p>
          {statusFilter === 'ALL' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest text-sand text-xs font-semibold hover:bg-forest/90 transition-all"
            >
              <Plus className="w-4 h-4 text-purple" />
              <span>Create Experiment</span>
            </button>
          )}
        </div>
      )}

      {/* Experiments Grid */}
      {!isLoading && filteredExperiments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredExperiments.map((exp) => {
            const linkedAssumption = assumptions.find((a) => a.id === exp.assumptionId);
            const isEditingResult = editingResultId === exp.id;

            return (
              <div
                key={exp.id}
                className="p-5 rounded-3xl bg-white border border-forest/15 hover:border-forest/30 shadow-sm transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-purple block">
                        {exp.method || 'Validation Test'}
                      </span>
                      <h4 className="text-base font-bold text-forest leading-snug mt-0.5">
                        {exp.name}
                      </h4>
                    </div>
                    {getStatusBadge(exp.status)}
                  </div>

                  {/* Linked Assumption info */}
                  <div className="p-2.5 rounded-xl bg-sand/30 border border-forest/10 flex items-start gap-2 text-xs">
                    <Target className="w-3.5 h-3.5 text-forest/60 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-forest/60 block">Testing Assumption:</span>
                      <p className="text-forest text-[11px] font-medium truncate">
                        {linkedAssumption?.assumption || exp.assumptionId}
                      </p>
                    </div>
                  </div>

                  {/* Explanation / Hypothesis */}
                  {exp.explanation && (
                    <p className="text-xs text-forest/75 leading-relaxed font-sans">
                      {exp.explanation}
                    </p>
                  )}

                  {/* Criteria & Metric */}
                  <div className="space-y-2 pt-1 border-t border-forest/10 text-xs">
                    {exp.successCriteria && (
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-forest shrink-0">Pass Criteria:</span>
                        <span className="text-forest/80 font-mono text-[11px]">{exp.successCriteria}</span>
                      </div>
                    )}
                    {exp.evidenceToCollect && (
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-forest shrink-0">Signal to Capture:</span>
                        <span className="text-forest/80 text-[11px]">{exp.evidenceToCollect}</span>
                      </div>
                    )}
                  </div>

                  {/* Observed Result Box */}
                  {exp.observedResult && !isEditingResult && (
                    <div className="p-3 rounded-xl bg-forest/5 border border-forest/15 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-forest/70 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-purple" />
                          <span>Observed Outcome</span>
                        </span>
                        <button
                          onClick={() => {
                            setEditingResultId(exp.id);
                            setObservedResultInput(exp.observedResult || '');
                          }}
                          className="text-[10px] text-purple hover:underline font-semibold"
                        >
                          Edit Result
                        </button>
                      </div>
                      <p className="text-xs text-forest/90 whitespace-pre-wrap">{exp.observedResult}</p>
                    </div>
                  )}

                  {/* Inline Edit Observed Result Form */}
                  {isEditingResult && (
                    <div className="p-3 rounded-xl bg-sand/40 border border-purple/30 space-y-2">
                      <label className="text-[10px] uppercase font-bold text-forest block">
                        Record Observed Outcome / Metrics
                      </label>
                      <textarea
                        value={observedResultInput}
                        onChange={(e) => setObservedResultInput(e.target.value)}
                        placeholder="e.g. 18 signups out of 85 visitors (21.1% conversion). Surpassed threshold."
                        rows={3}
                        className="w-full text-xs p-2 rounded-lg border border-forest/20 bg-white focus:outline-none focus:ring-1 focus:ring-purple"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingResultId(null)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-forest/70 hover:bg-forest/5"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(exp.id, exp.status as ExperimentUpdateStatus, observedResultInput)}
                          disabled={isUpdating}
                          className="px-3 py-1 rounded-lg bg-forest text-sand text-[11px] font-semibold hover:bg-forest/90"
                        >
                          Save Outcome
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-3 border-t border-forest/10 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-forest/50 font-mono">
                    Created {new Date(exp.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {exp.status === 'PLANNED' && (
                      <button
                        onClick={() => handleStatusChange(exp.id, ExperimentUpdateStatus.IN_PROGRESS)}
                        disabled={isUpdating}
                        className="px-3 py-1 rounded-lg bg-purple/10 text-purple hover:bg-purple/20 text-[11px] font-semibold transition-colors flex items-center gap-1"
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>Start Test</span>
                      </button>
                    )}

                    {exp.status === 'IN_PROGRESS' && (
                      <>
                        <button
                          onClick={() => {
                            setEditingResultId(exp.id);
                            setObservedResultInput(exp.observedResult || '');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Complete</span>
                        </button>
                        <button
                          onClick={() => handleStatusChange(exp.id, ExperimentUpdateStatus.ABANDONED)}
                          disabled={isUpdating}
                          className="px-2 py-1 rounded-lg text-rose-700 hover:bg-rose-50 text-[11px] font-medium"
                        >
                          Abandon
                        </button>
                      </>
                    )}

                    {(exp.status === 'COMPLETED' || exp.status === 'ABANDONED') && !isEditingResult && !exp.observedResult && (
                      <button
                        onClick={() => {
                          setEditingResultId(exp.id);
                          setObservedResultInput('');
                        }}
                        className="text-[11px] text-purple hover:underline font-semibold"
                      >
                        + Log Outcome
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Experiment Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-forest/15 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-forest/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple/10 flex items-center justify-center text-purple">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-forest">Design Validation Experiment</h3>
                    <p className="text-[11px] text-forest/70">Define clear falsification criteria before testing.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg text-forest/40 hover:text-forest hover:bg-forest/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Target Assumption */}
                {assumptions.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-forest uppercase tracking-wider block mb-1">
                      Target Assumption
                    </label>
                    <select
                      value={formData.assumptionId}
                      onChange={(e) => setFormData({ ...formData, assumptionId: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-forest/20 bg-sand/10 focus:outline-none focus:ring-1 focus:ring-purple text-forest"
                    >
                      {assumptions.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.assumption.slice(0, 80)}... {a.riskScore ? `(Risk: ${a.riskScore})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Experiment Name */}
                <div>
                  <label className="text-[11px] font-bold text-forest uppercase tracking-wider block mb-1">
                    Experiment Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Concierge Prototype with 5 Early Adopters"
                    className="w-full text-xs p-2.5 rounded-xl border border-forest/20 bg-white focus:outline-none focus:ring-1 focus:ring-purple text-forest font-medium"
                  />
                </div>

                {/* Method */}
                <div>
                  <label className="text-[11px] font-bold text-forest uppercase tracking-wider block mb-1">
                    Validation Method
                  </label>
                  <select
                    value={formData.method || 'Landing Page Smoke Test'}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-forest/20 bg-white focus:outline-none focus:ring-1 focus:ring-purple text-forest"
                  >
                    <option value="Landing Page Smoke Test">Landing Page Smoke Test (Waitlist / CTA clicks)</option>
                    <option value="Concierge MVP">Concierge MVP (Manual service delivery to observe friction)</option>
                    <option value="Letter of Intent / Pre-order">Letter of Intent (LOI) / Pre-order deposit</option>
                    <option value="The Mom Test Interviews">Mom Test Problem Interviews (Verbatim past behaviors)</option>
                    <option value="Fake Door Feature Test">Fake Door Feature Test (In-app intent measurement)</option>
                    <option value="Competitive Prototype Teardown">Competitive Prototype Usability Teardown</option>
                  </select>
                </div>

                {/* Hypothesis / Explanation */}
                <div>
                  <label className="text-[11px] font-bold text-forest uppercase tracking-wider block mb-1">
                    Hypothesis / Test Logic
                  </label>
                  <textarea
                    rows={2}
                    value={formData.explanation || ''}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    placeholder="If student founders are genuinely blocked by market sizing, at least 15% will join the beta when viewing our solution mockups."
                    className="w-full text-xs p-2.5 rounded-xl border border-forest/20 bg-white focus:outline-none focus:ring-1 focus:ring-purple text-forest"
                  />
                </div>

                {/* Success Criteria & Evidence Signal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-forest uppercase tracking-wider block mb-1">
                      Success Threshold *
                    </label>
                    <input
                      type="text"
                      value={formData.successCriteria || ''}
                      onChange={(e) => setFormData({ ...formData, successCriteria: e.target.value })}
                      placeholder="e.g. >= 15% conversion"
                      className="w-full text-xs p-2 rounded-xl border border-forest/20 bg-white focus:outline-none focus:ring-1 focus:ring-purple font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-forest uppercase tracking-wider block mb-1">
                      Evidence to Collect
                    </label>
                    <input
                      type="text"
                      value={formData.evidenceToCollect || ''}
                      onChange={(e) => setFormData({ ...formData, evidenceToCollect: e.target.value })}
                      placeholder="e.g. Email submissions / deposits"
                      className="w-full text-xs p-2 rounded-xl border border-forest/20 bg-white focus:outline-none focus:ring-1 focus:ring-purple"
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-forest/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-forest/70 hover:bg-forest/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-forest text-sand text-xs font-semibold hover:bg-forest/90 transition-all shadow-sm"
                  >
                    {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-purple" />}
                    <span>Create Experiment</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
