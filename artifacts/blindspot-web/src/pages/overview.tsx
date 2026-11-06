import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Play } from 'lucide-react';
import {
  useAnalyzeProject,
  useGetAnalysis,
  useListAssumptions,
  getGetAnalysisQueryKey,
  getGetLatestAnalysisQueryKey,
  getListAssumptionsQueryKey,
  listAnalysisHistory,
  getListAnalysisHistoryQueryKey,
  type Analysis,
  type Project,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ProjectFrame } from '@/components/project-frame';
import { ProjectFormDialog } from '@/components/project-form';
import { DeleteProjectDialog } from '@/components/delete-project';
import { HypothesisRow } from '@/components/hypothesis';
import { AiLabel, Counter, EmptyState, ErrorPanel, InlineError, KV, Pager, RowsSkeleton, SectionHead } from '@/components/kit';
import { PAGE_SIZE, fmtDate } from '@/lib/api';
import { useLatest } from '@/lib/latest';

export default function OverviewPage() {
  const { id = '' } = useParams<{ id: string }>();
  return <ProjectFrame id={id}>{(p) => <Overview project={p} />}</ProjectFrame>;
}

function Overview({ project }: { project: Project }) {
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const [run, setRun] = useState(false);
  const [, navigate] = useLocation();
  const brief: [string, string][] = [
    ['Problem', project.problemStatement],
    ['Audience', project.targetAudience],
    ['Product', project.productDescription],
    ['Proposed solution', project.proposedSolution],
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 lg:order-2">
        <section className="rise rounded-md border border-card-border bg-card p-4" aria-label="Project brief">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">The claim</p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEdit(true)} data-testid="button-edit-project"><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDel(true)} data-testid="button-delete-project"><Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Delete project</span></Button>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            {brief.map(([k, v]) => (
              <div key={k}><dt className="eyebrow">{k}</dt><dd className="mt-0.5 whitespace-pre-wrap leading-snug">{v}</dd></div>
            ))}
            <div>
              <dt className="eyebrow">Existing alternatives</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {project.existingAlternatives.length === 0 ? <span className="text-xs italic text-muted-foreground">None listed. Doing nothing is still an alternative.</span> : project.existingAlternatives.map((a, i) => <span key={i} className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs">{a}</span>)}
              </dd>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">Created {fmtDate(project.createdAt)} / updated {fmtDate(project.updatedAt)}</p>
          </dl>
        </section>
      </div>
      <div className="min-w-0 lg:order-1">
        <AnalysisSection key={project.id} project={project} onRun={() => setRun(true)} />
      </div>
      <ProjectFormDialog open={edit} onOpenChange={setEdit} project={project} />
      <DeleteProjectDialog project={project} open={del} onOpenChange={setDel} onDeleted={() => navigate('/')} />
      <RunAnalysisDialog projectId={project.id} open={run} onOpenChange={setRun} />
    </div>
  );
}

function RunAnalysisDialog({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [ctx, setCtx] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useAnalyzeProject();
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) m.reset(); onOpenChange(o); }}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <p className="eyebrow">New version</p>
          <DialogTitle className="font-display text-2xl">Interrogate the idea</DialogTitle>
          <DialogDescription>Creates a new analysis version from the current brief. Earlier versions and their reviewed statuses stay intact. New hypotheses always start UNTESTED.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <div className="flex justify-between"><Label htmlFor="market-context">Market context (optional)</Label><Counter value={ctx.length} max={4000} /></div>
          <Textarea id="market-context" value={ctx} onChange={(e) => setCtx(e.target.value)} className="min-h-28 bg-background" placeholder="Anything the model should know: pricing you have seen, regulation, a competitor that just launched." data-testid="input-market-context" />
        </div>
        <InlineError error={m.error} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={m.isPending || ctx.length > 4000}
            data-testid="button-run-analysis"
            onClick={() =>
              m.mutate(
                { id: projectId, data: ctx.trim() ? { marketContext: ctx.trim() } : {} },
                {
                  onSuccess: (res) => {
                    qc.setQueryData(getGetLatestAnalysisQueryKey(projectId), res);
                    qc.invalidateQueries({ queryKey: getGetLatestAnalysisQueryKey(projectId) });
                    qc.invalidateQueries({ queryKey: getListAnalysisHistoryQueryKey(projectId) });
                    toast({ title: 'Analysis complete', description: `${res.data.assumptions.length} hypotheses ranked by risk.` });
                    setCtx('');
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            {m.isPending ? 'Analyzing, this can take a minute...' : 'Run analysis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnalysisSection({ project, onRun }: { project: Project; onRun: () => void }) {
  const { q, analysis: latest, missing, failed } = useLatest(project.id);
  const [viewId, setViewId] = useState<string>('');
  const historyQuery = useInfiniteQuery({
    queryKey: getListAnalysisHistoryQueryKey(project.id),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => listAnalysisHistory(project.id, { page: pageParam, limit: PAGE_SIZE }, { signal }),
    getNextPageParam: (last, pages) => last.data.items.length === PAGE_SIZE ? pages.length + 1 : undefined,
    staleTime: 0,
    retry: false,
  });
  const history = [...new Map(historyQuery.data?.pages.flatMap(p => p.data.items).map(h => [h.id, h]) ?? []).values()];

  const selectedId = viewId || latest?.id || '';
  const viewingOld = !!viewId && viewId !== latest?.id;
  const older = useGetAnalysis(viewId, { query: { enabled: viewingOld, queryKey: getGetAnalysisQueryKey(viewId), retry: false } });
  const analysis: Analysis | undefined = viewingOld ? older.data?.data : latest;

  if (q.isLoading) return <RowsSkeleton rows={6} />;
  if (failed) return <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load the latest analysis" />;
  if (missing)
    return (
      <EmptyState
        mark="v0"
        title="No analysis yet"
        body="Run the first analysis to surface the assumptions this idea quietly depends on, ranked by impact times uncertainty."
        action={<Button onClick={onRun} data-testid="button-first-analysis"><Play className="mr-1.5 h-4 w-4" />Run first analysis</Button>}
      />
    );

  // Use persisted version numbers, never the position in a browser-local list.
  const options = [...new Map([...(latest ? [latest] : []), ...history, ...(analysis ? [analysis] : [])].map(h => [h.id, h])).values()]
    .sort((a, b) => b.version - a.version);
  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-center gap-2 rounded-md border border-foreground/10 bg-secondary/50 px-3 py-2 text-xs">
        <span className="eyebrow">Version</span>
        <label className="sr-only" htmlFor="version-select">Analysis version</label>
        <select id="version-select" value={selectedId} onChange={(e) => setViewId(e.target.value === latest?.id ? '' : e.target.value)} className="rounded border border-input bg-card px-2 py-1 font-mono text-xs" data-testid="select-analysis-version">
          {options.map((h) => {
            return <option key={h.id} value={h.id}>v{h.version} / {fmtDate(h.createdAt)}{h.id === latest?.id ? ' (latest)' : ''}</option>;
          })}
        </select>
        {viewingOld && <span className="rounded-sm bg-accent/10 px-1.5 py-0.5 text-accent">Viewing an earlier version, read-only</span>}
        {historyQuery.isLoading && <span role="status">Loading version history...</span>}
        {historyQuery.hasNextPage && <Button size="sm" variant="ghost" disabled={historyQuery.isFetchingNextPage} onClick={() => historyQuery.fetchNextPage()} data-testid="button-load-older-versions">{historyQuery.isFetchingNextPage ? 'Loading...' : 'Load older versions'}</Button>}
        <Button size="sm" className="ml-auto" onClick={onRun} data-testid="button-new-analysis"><Play className="mr-1 h-3.5 w-3.5" />New version</Button>
      </div>
      {historyQuery.isError && <ErrorPanel error={historyQuery.error} onRetry={() => historyQuery.isFetchNextPageError ? historyQuery.fetchNextPage() : historyQuery.refetch()} title="Could not load version history" />}

      {viewingOld && older.isLoading ? (
        <RowsSkeleton rows={4} />
      ) : viewingOld && older.isError ? (
        <ErrorPanel error={older.error} onRetry={() => older.refetch()} title="Could not load that version" />
      ) : analysis ? (
        <>
          <section className="rise">
            <SectionHead eyebrow={`Analysis v${analysis.version} / ${analysis.model}`} title="Where the brief is thin" aside={<AiLabel />} />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-card-border bg-card p-4"><p className="eyebrow mb-1">Problem clarity</p><p className="text-sm leading-relaxed">{analysis.result.problemClarity}</p></div>
              <div className="rounded-md border border-card-border bg-card p-4"><p className="eyebrow mb-1">Audience clarity</p><p className="text-sm leading-relaxed">{analysis.result.audienceClarity}</p></div>
            </div>
            {analysis.result.nextSteps.length > 0 && (
              <ol className="mt-3 space-y-1.5 rounded-md border border-card-border bg-card p-4 text-sm">
                <li className="eyebrow mb-1 list-none">Suggested next steps</li>
                {analysis.result.nextSteps.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span><span>{s}</span></li>
                ))}
              </ol>
            )}
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Inputs this version used</summary>
              <div className="mt-2 rounded border border-foreground/10 bg-card p-3">
                <p className="mb-2 font-mono text-[10px] text-muted-foreground">Generated {fmtDate(analysis.createdAt)}</p>
                <KV data={{ marketContext: analysis.marketContext, ...analysis.projectSnapshot }} />
              </div>
            </details>
          </section>
          <Hypotheses analysisId={analysis.id} projectId={project.id} readOnly={viewingOld} />
        </>
      ) : null}
    </div>
  );
}

export function Hypotheses({ analysisId, projectId, readOnly }: { analysisId: string; projectId: string; readOnly: boolean }) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [analysisId]);
  const params = { page, limit: PAGE_SIZE };
  const q = useListAssumptions(analysisId, params, { query: { enabled: !!analysisId, queryKey: getListAssumptionsQueryKey(analysisId, params) } });
  const items = q.data?.data.items ?? [];
  return (
    <section>
      <SectionHead eyebrow="Ranked by impact x uncertainty" title="Hypotheses to break first" aside={<p className="max-w-xs text-right text-[11px] text-muted-foreground">Risk score is computed by the server, not the model. Statuses change only by your review.</p>} />
      {q.isLoading ? (
        <RowsSkeleton rows={5} />
      ) : q.isError ? (
        <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load hypotheses" />
      ) : items.length === 0 ? (
        <EmptyState mark="0" title="No hypotheses on this page" body="This analysis returned none here." />
      ) : (
        <ol className="space-y-2">
          {items.map((a, i) => <HypothesisRow key={a.id} a={a} rank={(page - 1) * PAGE_SIZE + i + 1} projectId={projectId} readOnly={readOnly} />)}
        </ol>
      )}
      <Pager page={page} setPage={setPage} count={items.length} limit={PAGE_SIZE} label="Hypotheses pagination" />
    </section>
  );
}
