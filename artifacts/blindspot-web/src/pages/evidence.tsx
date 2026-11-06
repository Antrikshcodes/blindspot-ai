import { type ReactNode } from 'react';
import { useParams, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import {
  useGetFeedbackSummary,
  useAnalyzeFeedback,
  getGetFeedbackSummaryQueryKey,
  getListAssumptionsQueryKey,
  getGetLatestAnalysisQueryKey,
  type Assumption,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ProjectFrame } from '@/components/project-frame';
import { AiLabel, Chip, EmptyState, ErrorPanel, InlineError, KV, RowsSkeleton, SectionHead } from '@/components/kit';
import { Hypotheses } from '@/pages/overview';
import { fmtDate } from '@/lib/api';
import { useLatest } from '@/lib/latest';

export default function EvidencePage() {
  const { id = '' } = useParams<{ id: string }>();
  return <ProjectFrame id={id}>{(p) => <Evidence projectId={p.id} />}</ProjectFrame>;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

function Evidence({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const latest = useLatest(projectId);
  const sq = useGetFeedbackSummary(projectId, { query: { enabled: !!projectId, queryKey: getGetFeedbackSummaryQueryKey(projectId) } });
  const m = useAnalyzeFeedback();
  const summary = sq.data?.data ?? null;
  const assumptions = latest.analysis?.assumptions ?? [];
  const byId = new Map<string, Assumption>(assumptions.map((a) => [a.id, a]));
  const label = (id: unknown) => {
    const a = typeof id === 'string' ? byId.get(id) : undefined;
    return a ? a.description : typeof id === 'string' ? `hypothesis ${id.slice(0, 8)}` : null;
  };

  const run = () =>
    m.mutate(
      { id: projectId, data: {} },
      {
        onSuccess: (res) => {
          qc.setQueryData(getGetFeedbackSummaryQueryKey(projectId), res);
          if (latest.analysis) qc.invalidateQueries({ queryKey: getListAssumptionsQueryKey(latest.analysis.id) });
          qc.invalidateQueries({ queryKey: getGetLatestAnalysisQueryKey(projectId) });
          toast({ title: 'Feedback analyzed', description: 'Suggestions recorded. No hypothesis status was changed.' });
        },
      },
    );

  return (
    <div className="space-y-10">
      <section>
        <SectionHead
          eyebrow="What the notes actually say"
          title="Feedback summary"
          aside={<Button onClick={run} disabled={m.isPending || latest.missing} data-testid="button-analyze-feedback"><FlaskConical className="mr-1.5 h-4 w-4" />{m.isPending ? 'Reading notes...' : summary ? 'Re-analyze notes' : 'Analyze notes'}</Button>}
        />
        {m.error ? <div className="mb-3"><InlineError error={m.error} /></div> : null}
        {latest.missing ? (
          <EmptyState mark="v0" title="No analysis to test against" body={<>Feedback is read against the latest hypotheses. <Link href={`/projects/${projectId}`} className="text-accent underline">Run an analysis</Link>, then record interview notes.</>} />
        ) : sq.isLoading ? (
          <RowsSkeleton rows={4} />
        ) : sq.isError ? (
          <ErrorPanel error={sq.error} onRetry={() => sq.refetch()} title="Could not load the feedback summary" />
        ) : !summary ? (
          <EmptyState mark="--" title="No summary yet" body={<>Record raw notes on the <Link href={`/projects/${projectId}/interviews`} className="text-accent underline">Interviews</Link> tab, then analyze. Quotes must be exact substrings of your notes.</>} />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <AiLabel review={summary.reviewRequired !== false} />
              <span className="font-mono text-muted-foreground">Generated {fmtDate(summary.createdAt)}</span>
              <span className="rounded-sm border border-foreground/15 px-1.5 py-0.5 text-muted-foreground">
                Statuses automatically changed: {summary.statusesAutomaticallyChanged ? 'yes' : 'no'}
              </span>
            </div>
            {summary.result.themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {summary.result.themes.map((t, i) => <span key={i} className="rounded-full border border-foreground/15 bg-card px-2.5 py-1 text-xs">{t}</span>)}
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Contradictions" count={summary.result.contradictions.length} tone="accent">
                {summary.result.contradictions.map((c, i) => {
                  const { quoteA, quoteB, summary: s, description, assumptionId, ...rest } = c as Record<string, unknown>;
                  return (
                    <li key={i} className="space-y-2 rounded border border-accent/30 bg-accent/5 p-3 text-sm">
                      {(str(s) || str(description)) && <p>{str(s) ?? str(description)}</p>}
                      {label(assumptionId) && <p className="text-[11px] text-muted-foreground">On: {label(assumptionId)}</p>}
                      {(str(quoteA) || str(quoteB)) && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {[quoteA, quoteB].map((qq, j) => str(qq) && <blockquote key={j} className="border-l-2 border-accent pl-2 font-display text-sm italic">"{str(qq)}"</blockquote>)}
                        </div>
                      )}
                      {Object.keys(rest).length > 0 && <KV data={rest} />}
                    </li>
                  );
                })}
              </Panel>
              <div className="space-y-4">
                <Panel title="Evidence gaps" count={summary.result.evidenceGaps.length}>
                  {summary.result.evidenceGaps.map((g, i) => <li key={i} className="border-l-2 border-[hsl(40_60%_55%)] pl-2 text-sm">{g}</li>)}
                </Panel>
                <Panel title="Unsupported conclusions" count={summary.result.unsupportedConclusions.length}>
                  {summary.result.unsupportedConclusions.map((g, i) => <li key={i} className="border-l-2 border-destructive/60 pl-2 text-sm">{g}</li>)}
                </Panel>
              </div>
            </div>
            <Panel title="Cited evidence (suggestions)" count={(summary.evidenceRecords ?? summary.result.evidence).length}>
              {summary.evidenceRecords && summary.evidenceRecords.length > 0
                ? summary.evidenceRecords.map((e) => (
                    <li key={e.id} className="rounded border border-foreground/10 bg-card p-3 text-sm">
                      <blockquote className="font-display italic">"{e.quote}"</blockquote>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Chip value={e.sentiment.toUpperCase().includes('SUPPORT') ? 'SUPPORTED' : e.sentiment.toUpperCase().includes('INVALID') ? 'INVALIDATED' : 'UNTESTED'}>{e.sentiment}</Chip>
                        <Chip value="x">{e.origin}</Chip>
                        <span className="text-[11px] text-muted-foreground">On: {label(e.assumptionId)}</span>
                      </div>
                      {e.reasoning && <p className="mt-1 text-xs text-muted-foreground">{e.reasoning}</p>}
                      <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">Feedback reference: {e.feedbackId}</p>
                      <Link href={`/projects/${projectId}/interviews`} className="text-xs text-accent underline">Review original interview notes</Link>
                    </li>
                  ))
                : summary.result.evidence.map((ev, i) => {
                    const { quote, assumptionId, ...rest } = ev as Record<string, unknown>;
                    return (
                      <li key={i} className="rounded border border-foreground/10 bg-card p-3 text-sm">
                        {str(quote) && <blockquote className="font-display italic">"{str(quote)}"</blockquote>}
                        {label(assumptionId) && <p className="mt-1 text-[11px] text-muted-foreground">On: {label(assumptionId)}</p>}
                        <KV data={rest} className="mt-2" />
                      </li>
                    );
                  })}
            </Panel>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 rounded-md border border-foreground/15 bg-secondary/60 p-3 text-xs leading-relaxed">
          <strong>Outcome review is your call.</strong> Move a hypothesis to Testing, then record Supported, Invalidated or Inconclusive by citing evidence linked to it. Supported means the cited records lean that way; it is not proof of a market. Any outcome can be reopened.
        </div>
        {latest.analysis ? (
          <Hypotheses analysisId={latest.analysis.id} projectId={projectId} readOnly={false} />
        ) : latest.failed ? (
          <ErrorPanel error={latest.q.error} onRetry={() => latest.q.refetch()} />
        ) : latest.q.isLoading ? (
          <RowsSkeleton rows={3} />
        ) : null}
      </section>
    </div>
  );
}

function Panel({ title, count, children, tone }: { title: string; count: number; children: ReactNode; tone?: 'accent' }) {
  return (
    <div className="rise rounded-md border border-card-border bg-card/60 p-4">
      <p className={`eyebrow mb-2 ${tone === 'accent' ? 'text-accent' : ''}`}>{title} <span className="font-mono">({count})</span></p>
      {count === 0 ? <p className="text-xs italic text-muted-foreground">None reported.</p> : <ul className="space-y-2">{children}</ul>}
    </div>
  );
}
