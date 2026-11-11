import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, FlaskConical } from 'lucide-react';
import {
  useGetFeedbackSummary,
  useAnalyzeFeedback,
  getGetFeedbackSummaryQueryKey,
  getListAssumptionsQueryKey,
  getGetLatestAnalysisQueryKey,
  type Assumption,
  type EvidenceSentiment,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AiLabel, EmptyState, ErrorPanel, InlineError, RowsSkeleton, SectionHead } from '@/components/kit';
import { fmtDate } from '@/lib/api';
import { useFade } from './motion';

type Ev = { feedbackId: string | null; assumptionId: string | null; quote: string | null; sentiment: EvidenceSentiment | null; reasoning: string | null };
type Contra = { feedbackAId: string | null; feedbackBId: string | null; quoteA: string | null; quoteB: string | null; explanation: string | null };

const s = (v: unknown) => (typeof v === 'string' && v ? v : null);
const sent = (v: unknown): EvidenceSentiment | null => (v === 'SUPPORTING' || v === 'INVALIDATING' || v === 'NEUTRAL' ? v : null);

const SENT_STYLE: Record<EvidenceSentiment, string> = {
  SUPPORTING: 'border-[#1F3D2B]/30 bg-[#1F3D2B]/8 text-[#1F3D2B]',
  INVALIDATING: 'border-destructive/40 bg-destructive/5 text-destructive',
  NEUTRAL: 'border-[#1F3D2B]/20 bg-[#E8DCC4]/50 text-[#1F3D2B]/80',
};
const SENT_LABEL: Record<EvidenceSentiment, string> = { SUPPORTING: 'Leans supporting', INVALIDATING: 'Leans challenging', NEUTRAL: 'Neutral' };

export function FeedbackSummaryPanel({
  projectId,
  assumptions,
  latestMissing,
  latestAnalysisId,
  newestNoteAt,
  onCollectFeedback,
}: {
  projectId: string;
  assumptions: Assumption[];
  latestMissing: boolean;
  latestAnalysisId?: string;
  newestNoteAt?: string | null;
  onCollectFeedback?: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const sq = useGetFeedbackSummary(projectId, { query: { enabled: !!projectId, queryKey: getGetFeedbackSummaryQueryKey(projectId) } });
  const inFlight = useRef(false);
  const mutationKey = ['discovery', 'analyze-feedback', projectId];
  const pending = useIsMutating({ mutationKey }) > 0;
  const m = useAnalyzeFeedback({ mutation: {
    mutationKey,
    onSuccess: (res) => {
      qc.setQueryData(getGetFeedbackSummaryQueryKey(projectId), res);
      if (latestAnalysisId) qc.invalidateQueries({ queryKey: getListAssumptionsQueryKey(latestAnalysisId) });
      qc.invalidateQueries({ queryKey: getGetLatestAnalysisQueryKey(projectId) });
      toast({ title: 'Feedback analyzed', description: 'Suggestions recorded for review. No hypothesis status was changed.' });
    },
    onSettled: () => { inFlight.current = false; },
  } });
  const fade = useFade();
  const summary = sq.data?.data ?? null;
  const byId = new Map(assumptions.map((a) => [a.id, a]));
  const label = (id: string | null) => (id ? byId.get(id)?.description ?? `Hypothesis ${id.slice(0, 8)} (not in latest analysis)` : 'No hypothesis referenced');
  const stale = !!summary && !!newestNoteAt && new Date(newestNoteAt) > new Date(summary.createdAt);

  const run = () => {
    if (inFlight.current || pending) return;
    inFlight.current = true;
    m.mutate({ id: projectId, data: {} });
  };

  const evidence: Ev[] = summary
    ? summary.result.evidence.map((e) => ({ feedbackId: s(e.feedbackId), assumptionId: s(e.assumptionId), quote: s(e.quote), sentiment: sent(e.sentiment), reasoning: s(e.reasoning) }))
    : [];
  const contradictions: Contra[] = summary
    ? summary.result.contradictions.map((c) => ({ feedbackAId: s(c.feedbackAId), feedbackBId: s(c.feedbackBId), quoteA: s(c.quoteA), quoteB: s(c.quoteB), explanation: s(c.explanation) }))
    : [];

  const groups = new Map<string, Ev[]>();
  for (const e of evidence) {
    const k = e.assumptionId ?? '';
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }

  return (
    <section className="space-y-5" aria-label="Feedback summary">
      <SectionHead
        eyebrow="What the notes actually say"
        title="Feedback summary"
        aside={
          <Button onClick={run} disabled={pending || latestMissing} className="bg-[#8B5CF6] text-white hover:bg-[#7C4DEB]" data-testid="button-analyze-feedback">
            <FlaskConical className="mr-1.5 h-4 w-4" aria-hidden />
            {pending ? 'Reading notes...' : summary ? 'Re-analyze customer feedback' : 'Analyze Customer Feedback'}
          </Button>
        }
      />
      {pending && (
        <p role="status" className="rounded border border-[#1F3D2B]/15 bg-[#E8DCC4]/40 px-3 py-2 text-xs text-[#1F3D2B]/80">
          Request sent. The model is reading the recorded notes. No progress is reported by the server.
        </p>
      )}
      {m.error ? <InlineError error={m.error} /> : null}
      {stale && (
        <p role="status" className="rounded border border-[#8B5CF6]/30 bg-[#8B5CF6]/5 px-3 py-2 text-xs text-[#1F3D2B]" data-testid="status-summary-stale">
          Notes were added at {fmtDate(newestNoteAt)}, after this summary was generated. Re-analyze to include them.
        </p>
      )}
      {latestMissing ? (
        <EmptyState mark="v0" title="No analysis to test against" body={<>Feedback is read against the latest hypotheses. <Link href={`/projects/${projectId}`} className="text-[#1F3D2B] underline">Run an analysis</Link>, then record interview notes.</>} />
      ) : sq.isLoading ? (
        <RowsSkeleton rows={4} />
      ) : sq.isError ? (
        <ErrorPanel error={sq.error} onRetry={() => sq.refetch()} title="Could not load the feedback summary" />
      ) : !summary ? (
        <EmptyState
          mark="--"
          title="No summary yet"
          body={<>Create interviews and record raw notes on {onCollectFeedback
            ? <button type="button" onClick={onCollectFeedback} className="text-[#1F3D2B] underline">Customer Discovery</button>
            : <Link href={`/projects/${projectId}/interviews`} className="text-[#1F3D2B] underline">Customer Discovery</Link>}, then analyze. Quotes must be exact substrings of your notes.</>}
        />
      ) : (
        <motion.div {...fade} className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <AiLabel review />
            <span className="font-mono text-[#1F3D2B]/70" data-testid="text-summary-created">Generated {fmtDate(summary.createdAt)}</span>
            <span className="rounded-sm border border-[#1F3D2B]/20 px-1.5 py-0.5 text-[#1F3D2B]/75">Human review required. Statuses are never changed automatically.</span>
          </div>
          {summary.result.themes.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Themes</p>
              <ul className="flex flex-wrap gap-1.5">
                {summary.result.themes.map((t, i) => (
                  <li key={i} className="rounded-full border border-[#1F3D2B]/20 bg-[#E8DCC4]/50 px-2.5 py-1 text-xs text-[#1F3D2B]">{t}</li>
                ))}
              </ul>
            </div>
          )}
          <Fold title="Hypothesis relationships" count={groups.size} defaultOpen hint="AI-suggested quote links. Unverified until you cite them in an outcome review.">
            {Array.from(groups.entries()).map(([aid, list]) => {
              const notes = new Set(list.map((e) => e.feedbackId).filter(Boolean)).size;
              const tally = (k: EvidenceSentiment) => list.filter((e) => e.sentiment === k).length;
              return (
                <li key={aid || 'none'} className="rounded-md border border-[#1F3D2B]/15 bg-[#FFFDF8] p-3">
                  <p className="text-sm font-medium text-[#1F3D2B] break-words">{label(aid || null)}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10.5px] text-[#1F3D2B]/65">
                    <span>{list.length} quote{list.length === 1 ? '' : 's'}</span>
                    <span>from {notes} note entr{notes === 1 ? 'y' : 'ies'}</span>
                    <span>{tally('SUPPORTING')} supporting / {tally('INVALIDATING')} challenging / {tally('NEUTRAL')} neutral</span>
                  </p>
                  <ul className="mt-2 space-y-2">
                    {list.map((e, i) => (
                      <li key={i} className="border-l-2 border-[#1F3D2B]/25 pl-2.5">
                        {e.quote && <blockquote className="whitespace-pre-wrap break-words font-display text-sm italic">"{e.quote}"</blockquote>}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {e.sentiment && <span className={`rounded-sm border px-1.5 py-0.5 text-[10.5px] ${SENT_STYLE[e.sentiment]}`}>{SENT_LABEL[e.sentiment]}</span>}
                          <span className="text-[10.5px] text-[#1F3D2B]/60">Unverified suggestion</span>
                        </div>
                        {e.reasoning && <p className="mt-1 text-xs text-[#1F3D2B]/70">{e.reasoning}</p>}
                        {e.feedbackId && <p className="mt-0.5 break-all font-mono text-[10px] text-[#1F3D2B]/50">Feedback reference: {e.feedbackId}</p>}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </Fold>
          <div className="grid gap-4 lg:grid-cols-2">
            <Fold title="Contradictions" count={contradictions.length} defaultOpen>
              {contradictions.map((c, i) => (
                <li key={i} className="space-y-2 rounded border border-[#8B5CF6]/25 bg-[#8B5CF6]/5 p-3 text-sm">
                  {c.explanation && <p className="break-words">{c.explanation}</p>}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      [c.quoteA, c.feedbackAId],
                      [c.quoteB, c.feedbackBId],
                    ].map(([qq, fid], j) =>
                      qq ? (
                        <div key={j}>
                          <blockquote className="break-words border-l-2 border-[#8B5CF6]/60 pl-2 font-display text-sm italic">"{qq}"</blockquote>
                          {fid && <p className="mt-0.5 break-all pl-2 font-mono text-[10px] text-[#1F3D2B]/50">{fid}</p>}
                        </div>
                      ) : null,
                    )}
                  </div>
                </li>
              ))}
            </Fold>
            <div className="space-y-4">
              <Fold title="Evidence gaps" count={summary.result.evidenceGaps.length} defaultOpen>
                {summary.result.evidenceGaps.map((g, i) => <li key={i} className="break-words border-l-2 border-[#C9A962] pl-2 text-sm">{g}</li>)}
              </Fold>
              <Fold title="Unsupported conclusions" count={summary.result.unsupportedConclusions.length} defaultOpen>
                {summary.result.unsupportedConclusions.map((g, i) => <li key={i} className="break-words border-l-2 border-destructive/60 pl-2 text-sm">{g}</li>)}
              </Fold>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}

function Fold({ title, count, children, defaultOpen, hint }: { title: string; count: number; children: ReactNode; defaultOpen?: boolean; hint?: string }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const fade = useFade(4);
  const id = `fold-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="rounded-md border border-[#1F3D2B]/15 bg-[#FBF8F1]/80 p-4">
      <button type="button" className="flex w-full items-center justify-between gap-2 text-left" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} data-testid={`button-toggle-${id}`}>
        <span className="eyebrow text-[#1F3D2B]">{title} <span className="font-mono">({count})</span></span>
        <ChevronDown className={`h-4 w-4 text-[#1F3D2B]/60 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {hint && <p className="mt-1 text-[11px] text-[#1F3D2B]/60">{hint}</p>}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} {...fade} className="mt-3">
            {count === 0 ? <p className="text-xs italic text-[#1F3D2B]/60">None reported.</p> : <ul className="space-y-2">{children}</ul>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
