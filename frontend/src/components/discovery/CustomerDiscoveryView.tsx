import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Compass,
  MessageSquare,
  Sparkles,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  FileText,
  UserCheck,
  Send,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  useListInterviews,
  useCreateInterview,
  useAddFeedback,
  useGetFeedbackSummary,
  useAnalyzeFeedback,
  type Interview,
} from '@workspace/api-client-react';

interface CustomerDiscoveryViewProps {
  projectId: string;
}

export const CustomerDiscoveryView: React.FC<CustomerDiscoveryViewProps> = ({ projectId }) => {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [participantInput, setParticipantInput] = useState('');
  const [activeInterview, setActiveInterview] = useState<Interview | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Queries
  const {
    data: interviewsData,
    isLoading: isInterviewsLoading,
    error: interviewsError,
    refetch: refetchInterviews,
  } = useListInterviews(projectId, { page: 1, limit: 30 });

  const {
    data: summaryData,
    refetch: refetchSummary,
  } = useGetFeedbackSummary(projectId);

  // Mutations
  const { mutateAsync: createInterviewMutation, isPending: isCreatingInterview } = useCreateInterview();
  const { mutateAsync: addFeedbackMutation, isPending: isAddingFeedback } = useAddFeedback();
  const { mutateAsync: analyzeFeedbackMutation, isPending: isAnalyzingFeedback } = useAnalyzeFeedback();

  const interviews: Interview[] = interviewsData?.data?.items || [];
  const summary = summaryData?.data;

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantInput.trim()) return;

    try {
      const res = await createInterviewMutation({
        id: projectId,
        data: { participant: participantInput.trim() },
      });
      setParticipantInput('');
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/interviews`] });
      if (res?.data) {
        setActiveInterview(res.data);
      }
    } catch (err) {
      console.error('Failed to create interview:', err);
    }
  };

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInterview || !feedbackNotes.trim()) return;

    setFeedbackSuccess(null);
    setFeedbackError(null);

    try {
      await addFeedbackMutation({
        id: activeInterview.id,
        data: { notes: feedbackNotes.trim() },
      });
      setFeedbackNotes('');
      setFeedbackSuccess('Customer feedback logged and evidence quotes extracted.');
      queryClient.invalidateQueries({ queryKey: [`/api/interviews/${activeInterview.id}/feedback`] });
      // Trigger background synthesis
      void analyzeFeedbackMutation({ id: projectId, data: {} }).then(() => {
        refetchSummary();
      });
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to record feedback.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-forest/15">
        <div>
          <h2 className="text-2xl font-bold text-forest tracking-tight flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-purple" />
            <span>Customer Discovery & Feedback Engine</span>
          </h2>
          <p className="text-xs text-forest/70 mt-1 max-w-xl">
            Execute non-leading customer interviews using Mom Test probes, log verbatim transcripts, and detect contradiction signals across assumptions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetchInterviews()}
            className="p-2 rounded-xl border border-forest/20 hover:bg-forest/5 text-forest/70 hover:text-forest transition-colors"
            title="Refresh interviews"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-forest text-sand text-xs font-semibold hover:bg-forest/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-purple" />
            <span>New Interview Session</span>
          </button>
        </div>
      </div>

      {/* Synthesis & Contradiction Summary Banner (If exists) */}
      {summary?.result && (
        <div className="p-5 rounded-2xl bg-sand/40 border border-forest/15 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple" />
              <span>Synthesis Insights & Contradictions</span>
            </span>
            <button
              type="button"
              onClick={() => {
                void analyzeFeedbackMutation({ id: projectId, data: {} }).then(() => refetchSummary());
              }}
              disabled={isAnalyzingFeedback}
              className="text-[11px] font-semibold text-purple hover:underline flex items-center gap-1"
            >
              {isAnalyzingFeedback ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span>Re-synthesize</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Themes */}
            {summary.result.themes && summary.result.themes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-forest/70 uppercase">Observed Themes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {summary.result.themes.map((theme: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-forest/5 border border-forest/15 text-forest text-xs font-medium">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contradictions */}
            {summary.result.contradictions && summary.result.contradictions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-rose-800 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Contradictions Detected:</span>
                </span>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                  <p className="font-semibold">Conflicting customer evidence detected!</p>
                  <p className="text-[11px] text-rose-800/80">
                    Interview quotes indicate customers report conflicting behaviors regarding your core assumption.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Interviews Sessions List & Active Interview Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interview Sessions List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center justify-between">
            <span>Interview Sessions ({interviews.length})</span>
            {isInterviewsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-forest/60" />}
          </h3>

          {interviewsError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs">
              Failed to load interview sessions.
            </div>
          )}

          {!isInterviewsLoading && interviews.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-sand/20 border border-dashed border-forest/20 space-y-2">
              <MessageSquare className="w-8 h-8 text-forest/40 mx-auto" />
              <p className="text-xs font-bold text-forest">No Interviews Logged</p>
              <p className="text-[11px] text-forest/60 leading-relaxed">
                Click "New Interview Session" to generate customized questions and log feedback notes.
              </p>
            </div>
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {interviews.map((item) => {
              const isSelected = activeInterview?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveInterview(item)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-forest text-sand shadow-sm border-forest'
                      : 'bg-white/80 border-forest/15 hover:bg-white hover:border-forest/30 text-forest'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                      <UserCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-purple' : 'text-forest/70'}`} />
                      <span>{item.participant}</span>
                    </div>
                    <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-sand/70 font-mono' : 'text-forest/50 font-mono'}`}>
                      {new Date(item.createdAt).toLocaleDateString()} • {item.questions?.length || 0} questions
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 -rotate-90 transition-transform ${isSelected ? 'text-purple' : 'text-forest/40'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Active Session Detail & Feedback Note Composer */}
        <div className="lg:col-span-2 space-y-6">
          {activeInterview ? (
            <div className="space-y-6">
              {/* Active Session Questions Card */}
              <div className="p-5 rounded-3xl bg-sand/30 border border-forest/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-purple font-bold">
                      Session Questions
                    </span>
                    <h3 className="text-base font-bold text-forest">
                      Interview with {activeInterview.participant}
                    </h3>
                  </div>
                  <span className="text-xs text-forest/60 font-mono">
                    {new Date(activeInterview.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Question List */}
                <div className="space-y-2.5">
                  {activeInterview.questions && activeInterview.questions.length > 0 ? (
                    activeInterview.questions.map((q, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-white border border-forest/10 space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-forest/10 text-forest text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-forest leading-relaxed">
                              {q.question}
                            </p>
                            {q.listenFor && (
                              <p className="text-[11px] text-forest/65 italic mt-1">
                                Listen for: {q.listenFor}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-forest/60 italic">No specific questions generated for this session.</p>
                  )}
                </div>
              </div>

              {/* Feedback Notes Composer Form */}
              <form onSubmit={handleAddFeedback} className="p-5 rounded-3xl bg-white/80 border border-forest/15 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple" />
                    <span>Log Qualitative Interview Notes</span>
                  </h4>
                  <span className="text-[10px] text-forest/60">Verbatim notes preserve authentic evidence</span>
                </div>

                {feedbackSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{feedbackSuccess}</span>
                  </div>
                )}

                {feedbackError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{feedbackError}</span>
                  </div>
                )}

                <textarea
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  rows={4}
                  placeholder="Paste verbatim notes, customer quotes, or observational feedback..."
                  className="w-full p-3.5 rounded-2xl bg-sand/20 border border-forest/15 text-xs text-forest focus:outline-none focus:ring-2 focus:ring-purple/40 resize-y"
                  required
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-forest/60">
                    Min 10 characters • Quotes are automatically evaluated for evidence
                  </span>
                  <button
                    type="submit"
                    disabled={isAddingFeedback || feedbackNotes.trim().length < 10}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest text-sand text-xs font-semibold hover:bg-forest/90 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    {isAddingFeedback ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Record & Extract Evidence</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-sand/20 border border-forest/15 space-y-3">
              <Compass className="w-10 h-10 text-forest/40 mx-auto" />
              <h4 className="text-sm font-bold text-forest">Select an Interview Session</h4>
              <p className="text-xs text-forest/70 max-w-sm mx-auto leading-relaxed">
                Choose a session from the left column to view its generated questions, or start a new interview session to validate assumptions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Interview Session */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="fixed inset-0 bg-forest/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-sand-light rounded-3xl border border-forest/20 shadow-2xl p-6 space-y-4 z-10"
            >
              <div className="flex items-center justify-between border-b border-forest/10 pb-3">
                <h3 className="text-base font-bold text-forest flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple" />
                  <span>New Interview Session</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-lg text-forest/60 hover:text-forest"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateInterview} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-forest mb-1.5">
                    Participant Identifier or Persona
                  </label>
                  <input
                    type="text"
                    value={participantInput}
                    onChange={(e) => setParticipantInput(e.target.value)}
                    placeholder="e.g. University Dorm Resident, Logistics Manager"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:ring-2 focus:ring-purple/40"
                    required
                    maxLength={150}
                  />
                  <p className="text-[11px] text-forest/60 mt-1">
                    Custom questions will be tailored to probe your active assumptions.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium border border-forest/20 text-forest hover:bg-forest/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingInterview || !participantInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest text-sand text-xs font-semibold hover:bg-forest/90 disabled:opacity-40 shadow-sm"
                  >
                    {isCreatingInterview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Generate Session</span>
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
