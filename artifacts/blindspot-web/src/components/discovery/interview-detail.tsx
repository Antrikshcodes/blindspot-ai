import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { type Assumption, type Feedback, type Interview } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { AiLabel } from '@/components/kit';
import { fmtDate } from '@/lib/api';
import type { NoteDraft } from '@/hooks/use-discovery';
import { FeedbackComposer } from './feedback-composer';
import { FeedbackTimeline } from './feedback-timeline';
import { useFade } from './motion';

export function InterviewDetail({
  interview,
  assumptions,
  draft,
  setDraft,
  onSaved,
  onBack,
  summaryAt,
  initialFeedbackPage = 1,
  highlightedFeedbackId,
}: {
  interview: Interview;
  assumptions: Assumption[];
  draft: NoteDraft;
  setDraft: (d: NoteDraft) => void;
  onSaved: (f: Feedback) => void;
  onBack: () => void;
  summaryAt?: string | null;
  initialFeedbackPage?: number;
  highlightedFeedbackId?: string;
}) {
  const [page, setPage] = useState(initialFeedbackPage);
  useEffect(() => setPage(initialFeedbackPage), [initialFeedbackPage]);
  const fade = useFade();
  const byId = new Map(assumptions.map((a) => [a.id, a]));

  return (
    <motion.article {...fade} className="min-w-0 rounded-lg border border-[#1F3D2B]/15 bg-[#F6F1E6]" data-testid={`card-interview-${interview.id}`} aria-label={`Interview with ${interview.participant}`}>
      <header className="rounded-t-lg border-b border-[#1F3D2B]/15 bg-[#1F3D2B] px-5 py-4 text-[#E8DCC4]">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-1 h-7 px-2 text-xs text-[#E8DCC4] hover:bg-[#E8DCC4]/10 hover:text-[#E8DCC4] lg:hidden" data-testid="button-back-to-list">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden /> All interviews
        </Button>
        <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-[#E8DCC4]/70">Interview</p>
        <h2 className="break-words font-display text-2xl leading-tight" data-testid="text-interview-participant">{interview.participant}</h2>
        <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10.5px] text-[#E8DCC4]/75">
          <span>Created {fmtDate(interview.createdAt)}</span>
          <span>{interview.questions.length} questions</span>
          <span>{interview.sourceAnalysisVersion == null ? 'Source analysis version not recorded' : `Source analysis v${interview.sourceAnalysisVersion}`}</span>
        </p>
      </header>
      <div className="grid gap-6 p-4 md:p-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-label="Mapped questions" className="min-w-0">
          <div className="mb-2 flex items-center justify-between"><p className="eyebrow text-[#1F3D2B]">Question script</p><AiLabel /></div>
          {interview.questions.length === 0 ? (
            <p className="text-xs italic text-[#1F3D2B]/65">No questions were stored with this session.</p>
          ) : (
            <ol className="space-y-3">
              {interview.questions.map((qn, i) => {
                const a = byId.get(qn.assumptionId);
                return (
                  <li key={i} className="border-l-2 border-[#1F3D2B]/40 pl-3 text-sm">
                    <p className="break-words font-medium leading-snug text-[#1A2A20]">{qn.question}</p>
                    <p className="mt-1 break-words text-xs text-[#1F3D2B]/70"><span className="eyebrow">Listen for </span>{qn.listenFor}</p>
                    <p className="mt-1 break-words text-[11px] text-[#1F3D2B]/60">Tests: {a ? a.description : <span className="font-mono">hypothesis {qn.assumptionId.slice(0, 8)} (from an earlier analysis)</span>}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <div className="min-w-0 space-y-5">
          <FeedbackComposer
            interviewId={interview.id}
            assumptions={assumptions}
            draft={draft}
            setDraft={setDraft}
            onSaved={(f) => {
              setPage(1);
              onSaved(f);
            }}
          />
          <FeedbackTimeline interview={interview} page={page} setPage={setPage} summaryAt={summaryAt} highlightedFeedbackId={highlightedFeedbackId} />
        </div>
      </div>
    </motion.article>
  );
}
