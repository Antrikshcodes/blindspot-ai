import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'wouter';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Plus, Search, UserRound } from 'lucide-react';
import {
  useListInterviews,
  useGetFeedbackSummary,
  getListInterviewsQueryKey,
  getGetFeedbackSummaryQueryKey,
  type Interview,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ProjectFrame } from '@/components/project-frame';
import { EmptyState, ErrorPanel, Pager, RowsSkeleton } from '@/components/kit';
import { PAGE_SIZE, fmtDate, fmtDay } from '@/lib/api';
import { useLatest } from '@/lib/latest';
import { readSourceContext, type SourceContext } from '@/lib/source-link';
import { useAliasDraft, useDiscoveryCache, useDrafts, useInterviewTotal, useNewestNote } from '@/hooks/use-discovery';
import { CreateInterviewDialog, type ReportContext } from '@/components/discovery/create-interview-dialog';
import { InterviewDetail } from '@/components/discovery/interview-detail';
import { FeedbackSummaryPanel } from '@/components/discovery/feedback-summary';
import { useFade } from '@/components/discovery/motion';

export default function InterviewsPage() {
  const { id = '' } = useParams<{ id: string }>();
  return <MotionConfig reducedMotion="user"><ProjectFrame id={id}>{(p) => <Discovery projectId={p.id} />}</ProjectFrame></MotionConfig>;
}

type Tab = 'interviews' | 'insights';

function Discovery({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('interviews');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [reportContext, setReportContext] = useState<ReportContext | null>(null);
  const [selected, setSelected] = useState<Interview | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [sourceContext, setSourceContext] = useState<SourceContext | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSource = useMemo(() => readSourceContext(searchParams), [searchParams]);
  const [alias, setAlias] = useAliasDraft(projectId);
  const drafts = useDrafts(projectId);
  const { newestNoteAt, markNote } = useNewestNote(projectId);
  const cache = useDiscoveryCache(projectId);
  const fade = useFade();

  const params = { page, limit: PAGE_SIZE };
  const q = useListInterviews(projectId, params, { query: { enabled: !!projectId, queryKey: getListInterviewsQueryKey(projectId, params) } });
  const total = useInterviewTotal(projectId);
  const sq = useGetFeedbackSummary(projectId, { query: { enabled: !!projectId, queryKey: getGetFeedbackSummaryQueryKey(projectId) } });
  const latest = useLatest(projectId);
  const assumptions = latest.analysis?.assumptions ?? [];
  const items = q.data?.data.items ?? [];
  const needle = filter.trim().toLowerCase();
  const shown = needle ? items.filter((iv) => iv.participant.toLowerCase().includes(needle)) : items;
  const summaryAt = sq.data?.data?.createdAt ?? null;
  const active = selected ?? (items[0] && page === 1 ? items[0] : null);

  useEffect(() => {
    if (requestedSource) setPage(requestedSource.interviewPage);
  }, [requestedSource]);

  useEffect(() => {
    if (!requestedSource || !q.isSuccess || page !== requestedSource.interviewPage) return;
    const interview = q.data.data.items.find((item) => item.id === requestedSource.interviewId);
    if (interview) {
      setSelected(interview);
      setSourceContext(requestedSource);
      setMobileDetail(true);
      setTab('interviews');
    } else {
      toast({ title: 'Source interview not on this page', description: 'The referenced session was not returned. Browse the project’s interviews to locate the feedback reference.', variant: 'destructive' });
    }
    const next = new URLSearchParams(searchParams);
    for (const key of ['interviewId', 'feedbackId', 'interviewPage', 'feedbackPage']) next.delete(key);
    setSearchParams(next, { replace: true });
  }, [requestedSource, q.isSuccess, q.data, page, searchParams, setSearchParams, toast]);

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    const analysisId = searchParams.get('reportAnalysisId');
    const version = Number(searchParams.get('reportVersion'));
    if (analysisId && Number.isInteger(version) && version > 0) setReportContext({ analysisId, version });
    setCreating(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const dirtyCount = drafts.dirtyCount;
  useEffect(() => {
    if (dirtyCount === 0 && !alias.trim()) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirtyCount, alias]);

  const open = (iv: Interview) => {
    setSourceContext(null);
    setSelected(iv);
    setMobileDetail(true);
  };

  const newestInterview = total.data?.items.reduce<string | null>((m, iv) => (!m || iv.createdAt > m ? iv.createdAt : m), null);

  return (
    <div className="space-y-6">
      <section className="rise overflow-hidden rounded-lg border border-[#1F3D2B]/20 bg-[#1F3D2B] text-[#E8DCC4]" aria-label="Discovery overview">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl">
            <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-[#E8DCC4]/70">Customer discovery</p>
            <h2 className="mt-1 font-display text-3xl leading-tight">Customer words, kept apart from model guesses.</h2>
            <p className="mt-2 text-sm text-[#E8DCC4]/75">Run a session, write down what was actually said, then let the model propose links you still have to confirm.</p>
          </div>
          <Button onClick={() => setCreating(true)} disabled={latest.missing} className="shrink-0 bg-[#8B5CF6] text-white hover:bg-[#7C4DEB]" data-testid="button-new-interview">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />New interview
          </Button>
        </div>
        <dl className="grid grid-cols-2 border-t border-[#E8DCC4]/15 md:grid-cols-4">
          <Stat label="Interviews in project" testid="stat-interview-total">
            {total.isLoading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-[#E8DCC4]/15" aria-label="Loading" /> : total.isError ? (
              <button className="text-sm underline" onClick={() => total.refetch()} data-testid="button-retry-total">Unavailable, retry</button>
            ) : (
              <>{total.data!.total}{!total.data!.complete && '+'}</>
            )}
          </Stat>
          <Stat label="Latest session">{total.isSuccess ? (newestInterview ? fmtDay(newestInterview) : 'None yet') : '--'}</Stat>
          <Stat label="Unsaved note drafts" testid="stat-drafts">{dirtyCount}</Stat>
          <Stat label="Feedback summary">{sq.isLoading ? '--' : sq.isError ? 'Unavailable' : summaryAt ? fmtDay(summaryAt) : 'Not run'}</Stat>
        </dl>
      </section>

      <div role="tablist" aria-label="Discovery views" className="flex gap-1 rounded-md border border-[#1F3D2B]/15 bg-[#E8DCC4]/40 p-1 sm:w-fit">
        {(['interviews', 'insights'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            id={`tab-${t}`}
            onClick={() => setTab(t)}
            className={`relative flex-1 rounded px-4 py-2 text-sm transition-colors sm:flex-none ${tab === t ? 'text-[#F6F1E6]' : 'text-[#1F3D2B]/75 hover:text-[#1F3D2B]'}`}
            data-testid={`tab-discovery-${t}`}
          >
            {tab === t && <motion.span layoutId="disc-tab" className="absolute inset-0 rounded bg-[#1F3D2B]" transition={{ duration: 0.25 }} />}
            <span className="relative">{t === 'interviews' ? 'Interviews & notes' : 'Insights'}</span>
          </button>
        ))}
      </div>

      {latest.failed && <ErrorPanel error={latest.q.error} onRetry={() => latest.q.refetch()} title="Could not load hypotheses for mapping" />}

      <AnimatePresence mode="wait" initial={false}>
        {tab === 'interviews' ? (
          <motion.div key="iv" {...fade} id="panel-interviews" role="tabpanel" aria-labelledby="tab-interviews">
            {latest.missing && (
              <div className="mb-4">
                <EmptyState mark="v0" title="Analyze before interviewing" body={<>Questions are mapped to hypotheses from the latest analysis. <Link href={`/projects/${projectId}`} className="text-[#1F3D2B] underline">Run an analysis first.</Link></>} />
              </div>
            )}
            {q.isLoading ? (
              <RowsSkeleton rows={4} />
            ) : q.isError ? (
              <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load interviews" />
            ) : items.length === 0 && page === 1 ? (
              !latest.missing && (
                <EmptyState
                  mark="Q"
                  title="No conversations recorded yet"
                  body="Create a session for each person you speak with. You get non-leading questions about past behaviour, mapped to the riskiest hypotheses, and a place to keep their exact words."
                  action={<Button onClick={() => setCreating(true)} className="bg-[#1F3D2B] text-[#F6F1E6] hover:bg-[#1F3D2B]/90" data-testid="button-empty-create">Create first interview</Button>}
                />
              )
            ) : (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
                <aside className={`min-w-0 space-y-3 ${mobileDetail && active ? 'hidden lg:block' : ''}`} aria-label="Interview list">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[#1F3D2B]/50" aria-hidden />
                    <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter this page by alias" aria-label="Filter interviews on this page by participant alias" className="border-[#1F3D2B]/20 bg-[#FBF8F1] pl-8" data-testid="input-filter-interviews" />
                  </div>
                  {shown.length === 0 ? (
                    <p className="rounded border border-dashed border-[#1F3D2B]/25 p-3 text-xs text-[#1F3D2B]/70">No alias on this page matches "{filter}".</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {shown.map((iv) => {
                        const on = active?.id === iv.id;
                        return (
                          <li key={iv.id}>
                            <button
                              onClick={() => open(iv)}
                              aria-current={on ? 'true' : undefined}
                              className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${on ? 'border-[#1F3D2B] bg-[#1F3D2B] text-[#E8DCC4]' : 'border-[#1F3D2B]/15 bg-[#FBF8F1] hover:border-[#1F3D2B]/40'}`}
                              data-testid={`button-toggle-interview-${iv.id}`}
                            >
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${on ? 'bg-[#E8DCC4]/15' : 'bg-[#E8DCC4]'}`}><UserRound className="h-4 w-4" aria-hidden /></span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{iv.participant}</span>
                                <span className={`block font-mono text-[10px] ${on ? 'text-[#E8DCC4]/70' : 'text-[#1F3D2B]/60'}`}>
                                  {fmtDate(iv.createdAt)} / {iv.questions.length} q / {iv.sourceAnalysisVersion == null ? 'version not recorded' : `v${iv.sourceAnalysisVersion}`}
                                </span>
                              </span>
                              {drafts.dirty(iv.id) && <span className="h-2 w-2 shrink-0 rounded-full bg-[#8B5CF6]" title="Unsaved draft" aria-label="Unsaved draft" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <Pager page={page} setPage={(p) => { setPage(p); setFilter(''); }} count={items.length} limit={PAGE_SIZE} label="Interviews pagination" />
                </aside>
                <div className={`min-w-0 ${!mobileDetail ? 'hidden lg:block' : ''}`}>
                  <AnimatePresence mode="wait" initial={false}>
                    {active ? (
                      <InterviewDetail
                        key={active.id}
                        interview={active}
                        assumptions={assumptions}
                        draft={drafts.get(active.id)}
                        setDraft={(d) => drafts.set(active.id, d)}
                        summaryAt={summaryAt}
                        initialFeedbackPage={sourceContext?.interviewId === active.id ? sourceContext.feedbackPage : 1}
                        highlightedFeedbackId={sourceContext?.interviewId === active.id ? sourceContext.feedbackId : undefined}
                        onBack={() => setMobileDetail(false)}
                        onSaved={(f) => {
                          cache.afterFeedbackAdded(f.interviewId, assumptions.map((a) => a.analysisId));
                          markNote(f.createdAt);
                          toast({ title: 'Notes saved', description: summaryAt ? 'Stored unchanged. The existing summary does not include them until you re-analyze.' : 'Stored unchanged.' });
                        }}
                      />
                    ) : (
                      <p className="rounded-md border border-dashed border-[#1F3D2B]/25 p-6 text-sm text-[#1F3D2B]/70">Select an interview to read its script and notes.</p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="in" {...fade} id="panel-insights" role="tabpanel" aria-labelledby="tab-insights">
            <FeedbackSummaryPanel projectId={projectId} assumptions={assumptions} latestMissing={latest.missing} latestAnalysisId={latest.analysis?.id} newestNoteAt={newestNoteAt} onCollectFeedback={() => setTab('interviews')} />
          </motion.div>
        )}
      </AnimatePresence>

      <CreateInterviewDialog
        projectId={projectId}
        open={creating}
        onOpenChange={(o) => {
          if (!o) setReportContext(null);
          setCreating(o);
        }}
        reportContext={reportContext}
        latestAnalysisId={latest.analysis?.id}
        latestAnalysisVersion={latest.analysis?.version}
        alias={alias}
        setAlias={setAlias}
        onCreated={(iv) => {
          setPage(1);
          setFilter('');
          setTab('interviews');
          setSelected(iv);
          setMobileDetail(true);
          cache.afterInterviewCreated();
          toast({ title: 'Interview created', description: `${iv.questions.length} mapped questions ready for ${iv.participant}.` });
        }}
      />
    </div>
  );
}

function Stat({ label, children, testid }: { label: string; children: ReactNode; testid?: string }) {
  return (
    <div className="border-[#E8DCC4]/15 p-4 [&:not(:last-child)]:border-r max-md:[&:nth-child(2)]:border-r-0 max-md:[&:nth-child(-n+2)]:border-b">
      <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-[#E8DCC4]/60">{label}</dt>
      <dd className="mt-1 font-display text-2xl" data-testid={testid}>{children}</dd>
    </div>
  );
}
