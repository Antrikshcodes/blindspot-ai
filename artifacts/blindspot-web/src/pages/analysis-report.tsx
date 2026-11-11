import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, Copy, Search, Target, UserRoundPlus } from 'lucide-react';
import {
  getGetAnalysisBlindspotsQueryKey,
  getGetAnalysisInterviewQuestionsQueryKey,
  getGetAnalysisQueryKey,
  getGetAnalysisSummaryQueryKey,
  getGetLatestAnalysisQueryKey,
  getListAnalysisHistoryQueryKey,
  getListAssumptionsQueryKey,
  useGetAnalysis,
  useGetAnalysisBlindspots,
  useGetAnalysisInterviewQuestions,
  useGetAnalysisSummary,
  useGetLatestAnalysis,
  useListAnalysisHistory,
  useListAssumptions,
  type AnalysisFinding,
} from '@workspace/api-client-react';
import { ProjectFrame } from '@/components/project-frame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HypothesisRow } from '@/components/hypothesis';
import { AiLabel, Chip, EmptyState, ErrorPanel, RowsSkeleton, SectionHead } from '@/components/kit';
import { fmtDate } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const HISTORY_PAGE_SIZE = 20;
const assumptionParams = { page: 1, limit: 100 };
const riskTone = (levels: string[]) => {
  if (levels.includes('CRITICAL')) return 'bg-accent/20 border-accent/55';
  if (levels.includes('HIGH')) return 'bg-[hsl(42_58%_83%)] border-[hsl(42_45%_63%)]';
  if (levels.includes('MEDIUM')) return 'bg-[hsl(158_24%_88%)] border-[hsl(158_20%_70%)]';
  if (levels.includes('LOW')) return 'bg-secondary/50 border-card-border';
  return 'bg-background border-card-border';
};

export default function AnalysisReportPage() {
  const { id = '', analysisId = '' } = useParams<{ id: string; analysisId: string }>();
  return <ProjectFrame id={id}>{(project) => <Report projectId={id} analysisId={analysisId} projectName={project.name} />}</ProjectFrame>;
}

export function Report({ projectId, analysisId, projectName }: { projectId: string; analysisId: string; projectName: string }) {
  const { toast } = useToast();
  const analysisQ = useGetAnalysis(analysisId, { query: { enabled: !!analysisId, queryKey: getGetAnalysisQueryKey(analysisId), retry: false } });
  const latestQ = useGetLatestAnalysis(projectId, { query: { enabled: !!projectId, queryKey: getGetLatestAnalysisQueryKey(projectId), retry: false } });
  const summaryQ = useGetAnalysisSummary(analysisId, { query: { enabled: !!analysisId, queryKey: getGetAnalysisSummaryQueryKey(analysisId), retry: false } });
  const blindspotsQ = useGetAnalysisBlindspots(analysisId, { query: { enabled: !!analysisId, queryKey: getGetAnalysisBlindspotsQueryKey(analysisId), retry: false } });
  const questionsQ = useGetAnalysisInterviewQuestions(analysisId, { query: { enabled: !!analysisId, queryKey: getGetAnalysisInterviewQuestionsQueryKey(analysisId), retry: false } });
  const assumptionsQ = useListAssumptions(analysisId, assumptionParams, { query: { enabled: !!analysisId, queryKey: getListAssumptionsQueryKey(analysisId, assumptionParams), retry: false } });
  const [historyPage, setHistoryPage] = useState(1);
  const historyParams = { page: historyPage, limit: HISTORY_PAGE_SIZE };
  const historyQ = useListAnalysisHistory(projectId, historyParams, { query: { enabled: !!projectId, queryKey: getListAnalysisHistoryQueryKey(projectId, historyParams), retry: false } });
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState('risk');
  const [search, setSearch] = useState('');
  const [cell, setCell] = useState<{ impact: number; uncertainty: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const analysis = analysisQ.data?.data;
  const assumptions = assumptionsQ.data?.data.items ?? [];
  const categories = useMemo(() => [...new Set(assumptions.map((a) => a.category))].sort(), [assumptions]);
  const filtered = useMemo(() => assumptions
    .filter((a) => category === 'ALL' || a.category === category)
    .filter((a) => status === 'ALL' || a.status === status)
    .filter((a) => !search || a.description.toLowerCase().includes(search.toLowerCase()))
    .filter((a) => !cell || (a.impact === cell.impact && a.uncertainty === cell.uncertainty))
    .sort((a, b) => sort === 'risk' ? b.riskScore - a.riskScore : a.description.localeCompare(b.description)), [assumptions, category, status, search, cell, sort]);
  const history = historyQ.data?.data.items ?? [];
  const latest = latestQ.data?.data;
  const historyItems = [...new Map([...(latest ? [latest] : []), ...history].map((item) => [item.id, item])).values()]
    .sort((a, b) => b.version - a.version);
  const summaryEnvelope = summaryQ.data?.data;
  const summary = summaryEnvelope?.summary;
  const summaryAssessments: Array<[string, AnalysisFinding | undefined]> = [
    ['Problem assessment', summary?.problemAssessment],
    ['Audience assessment', summary?.audienceAssessment],
    ['Solution assessment', summary?.solutionAssessment],
  ];
  const visibleSummaryAssessments = summaryAssessments.filter(
    (assessment): assessment is [string, AnalysisFinding] => Boolean(assessment[1]),
  );
  const blindspotEnvelope = blindspotsQ.data?.data;
  const questionEnvelope = questionsQ.data?.data;
  const selectedAssumption = assumptions.find((assumption) => assumption.id === selected)
    ?? (cell ? assumptions.find((assumption) => assumption.impact === cell.impact && assumption.uncertainty === cell.uncertainty) : undefined);

  useEffect(() => {
    setHistoryPage(1);
    setCategory('ALL');
    setStatus('ALL');
    setSearch('');
    setCell(null);
    setSelected(null);
  }, [analysisId]);

  useEffect(() => {
    if (selected) document.getElementById(`assumption-${selected}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selected]);

  if (analysisQ.isLoading) return <div className="mx-auto max-w-6xl px-4 py-8"><RowsSkeleton rows={7} /></div>;
  if (analysisQ.isError) return <div className="mx-auto max-w-6xl space-y-4 px-4 py-8"><ErrorPanel error={analysisQ.error} onRetry={() => analysisQ.refetch()} title="Could not load this report" /><Button asChild variant="outline"><Link href={`/projects/${projectId}`}>Back to project</Link></Button></div>;
  if (!analysis) return <EmptyState mark="404" title="Report not found" body="This analysis snapshot may have been removed or does not belong to this project." action={<Button asChild variant="outline"><Link href={`/projects/${projectId}`}>Back to project</Link></Button>} />;

  const copy = async (text: string, message: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: message }); }
    catch { window.prompt('Copy this text', text); }
  };
  const questions = questionEnvelope?.available ? questionEnvelope.items : [];

  return (
    <article className="mx-auto max-w-6xl px-4 pb-16 pt-5 md:px-8">
      <Link href={`/projects/${projectId}`} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> {projectName}</Link>
      <header className="rise mb-7 flex flex-col gap-4 border-b border-foreground/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div><p className="eyebrow">Phase 02 / Analysis report</p><h1 className="font-display text-4xl leading-tight md:text-5xl">Pressure-test the premise</h1><p className="mt-2 text-sm text-muted-foreground">A record of what is assumed, what is missing, and what evidence could change the call.</p></div>
        <div className="rounded-md border border-card-border bg-card px-4 py-3"><p className="eyebrow">Snapshot</p><p className="font-display text-2xl">v{analysis.version}</p><p className="font-mono text-[10px] text-muted-foreground">{fmtDate(analysis.createdAt)}</p></div>
      </header>

      <nav className="mb-8 flex flex-wrap gap-2 border-b border-foreground/10 pb-4" aria-label="Report sections">
        {['Overview', 'Risk matrix', 'Assumptions', 'Blindspots', 'Interview questions', 'History'].map((label, i) => <a key={label} className="rounded-full border border-foreground/15 bg-card px-3 py-1.5 text-xs hover:border-accent/60" href={`#${['overview', 'matrix', 'assumptions', 'blindspots', 'questions', 'history'][i]}`} data-testid={`link-report-${['overview', 'matrix', 'assumptions', 'blindspots', 'questions', 'history'][i]}`}>{label}</a>)}
      </nav>

      <section id="overview" className="mb-12 scroll-mt-8">
        <SectionHead eyebrow={`Analysis v${analysis.version} / ${analysis.model}`} title="What the brief supports" aside={<AiLabel review={false} />} />
        {summaryQ.isLoading ? <RowsSkeleton rows={3} /> : summaryQ.isError ? <ErrorPanel error={summaryQ.error} onRetry={() => summaryQ.refetch()} title="Could not load the analysis summary" /> : summaryEnvelope && !summaryEnvelope.available ? <EmptyState mark="ENGINE" title="Summary unavailable for this snapshot" body={summaryEnvelope.reason || 'This report was created with an engine that did not produce a structured summary. Other report sections remain available.'} /> : (
          <div className="space-y-4">
            {summary?.overallSummary && <p className="max-w-4xl border-l-2 border-accent pl-4 font-display text-2xl leading-snug">{summary.overallSummary}</p>}
            {summary?.disclaimer && <p className="rounded border border-accent/25 bg-accent/5 p-3 text-xs text-muted-foreground">{summary.disclaimer}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['Problem clarity', summary?.problemClarity ?? analysis.result.problemClarity],
                ['Audience clarity', summary?.audienceClarity ?? analysis.result.audienceClarity],
                ['Strengths', summary?.strengths],
                ['Missing information', summary?.missingInformation],
                ['Product risks', summary?.productRisks],
                ['Market & demand uncertainty', summary?.marketAndDemandUncertainties],
                ['Technical feasibility', summary?.technicalFeasibilityConcerns],
                ['Competitive uncertainty', summary?.competitiveUncertainties],
                ['Next steps', summary?.nextSteps ?? analysis.result.nextSteps],
              ].filter(([, value]) => value && (Array.isArray(value) ? value.length : true)).map(([heading, value]) => <div key={String(heading)} className="rounded-md border border-card-border bg-card p-4"><p className="eyebrow mb-2">{heading}</p>{Array.isArray(value) ? <ul className="space-y-1.5 text-sm">{value.map((line, i) => <li key={i} className="flex gap-2"><span className="font-mono text-[10px] text-accent">{String(i + 1).padStart(2, '0')}</span><span>{line}</span></li>)}</ul> : <p className="text-sm leading-relaxed">{String(value)}</p>}</div>)}
            </div>
            {visibleSummaryAssessments.length > 0 && <div className="grid gap-3 md:grid-cols-3">
              {visibleSummaryAssessments.map(([label, finding]) => <article key={label} className="rounded-md border border-card-border bg-card p-4">
                <p className="eyebrow mb-2">{label}</p>
                <p className="text-sm leading-relaxed">{finding.statement || 'No assessment statement was returned.'}</p>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">Grounding: {finding.grounding}</p>
                {finding.sourceQuote && <blockquote className="mt-2 border-l-2 border-foreground/20 pl-3 text-xs italic text-muted-foreground">{finding.sourceQuote}</blockquote>}
              </article>)}
            </div>}
            {summary?.validationDimensions && <div className="rounded-md border border-card-border bg-card p-4">
              <p className="eyebrow mb-3">Assessment dimensions</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(summary.validationDimensions).map(([key, dimension]) => <article key={key} className="rounded border border-foreground/10 p-3">
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1')}</p><Chip value={dimension.support}>{dimension.score === null ? dimension.support : `${dimension.score} / 100`}</Chip></div>
                  <p className="mt-2 text-xs leading-relaxed">{dimension.rationale}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground"><span className="font-semibold">Evidence needed:</span> {dimension.evidenceNeeded}</p>
                </article>)}
              </div>
            </div>}
            {summary?.evidenceBackedValidation && <div className="rounded-md border border-foreground/15 bg-secondary/55 p-4"><p className="eyebrow mb-1">Evidence boundary</p><p className="text-sm">{summary.evidenceBackedValidation.explanation}</p><p className="mt-2 font-mono text-xs text-muted-foreground">{summary.evidenceBackedValidation.verifiedEvidenceCount} verified evidence records · {summary.evidenceBackedValidation.assessed ? 'assessed' : 'not assessed'}</p></div>}
            {assumptions.length > 0 && <div className="rounded-md border border-card-border bg-card p-4">
              <p className="eyebrow mb-3">Highest-risk assumptions</p>
              <ol className="space-y-2">{[...assumptions].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3).map((assumption) => <li key={assumption.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Chip value={assumption.riskLevel}>{assumption.riskLevel} · {assumption.riskScore}</Chip>
                <span className="min-w-0 flex-1">{assumption.description}</span>
                <a className="text-xs text-accent underline-offset-2 hover:underline" href={`#assumption-${assumption.id}`}>Review</a>
              </li>)}</ol>
            </div>}
          </div>
        )}
      </section>

      <section id="matrix" className="mb-12 scroll-mt-8">
        <SectionHead eyebrow="Impact × uncertainty / server-computed risk" title="Risk matrix" aside={<span className="text-xs text-muted-foreground">Select a cell to inspect its assumptions</span>} />
        <div className="rounded-md border border-card-border bg-card p-3 md:p-5">
          <div className="mb-3 flex items-center gap-2 text-[10px] text-muted-foreground"><span className="eyebrow">Impact ↑</span><span className="ml-auto eyebrow">Uncertainty →</span></div>
          <div className="grid grid-cols-[2rem_repeat(5,minmax(0,1fr))] gap-1.5">
            <span />
            {[1, 2, 3, 4, 5].map((n) => <span key={n} className="pb-1 text-center font-mono text-[10px] text-muted-foreground">{n}</span>)}
            {[5, 4, 3, 2, 1].map((impact) => <Fragment key={impact}>
              <span className="flex items-center justify-center font-mono text-[10px] text-muted-foreground">{impact}</span>
              {[1, 2, 3, 4, 5].map((uncertainty) => {
                const matches = assumptions.filter((a) => a.impact === impact && a.uncertainty === uncertainty);
                const active = cell?.impact === impact && cell.uncertainty === uncertainty;
                return <button key={uncertainty} type="button" onClick={() => { setCell(active ? null : { impact, uncertainty }); setSelected(active ? null : (matches[0]?.id ?? null)); document.getElementById('assumptions')?.scrollIntoView({ behavior: 'smooth' }); }} aria-pressed={active} aria-label={`Impact ${impact}, uncertainty ${uncertainty}; ${matches.length} assumptions`} className={`min-h-[4.4rem] rounded border p-1.5 text-left transition-colors hover:border-accent ${riskTone(matches.map((assumption) => assumption.riskLevel))} ${active ? 'ring-2 ring-accent ring-offset-1' : ''}`} data-testid={`matrix-cell-${impact}-${uncertainty}`}>
                  <span className="flex items-start justify-between font-mono text-[10px]"><span>{matches[0]?.riskScore ?? '—'}</span><span>{matches.length}</span></span>
                  {matches.slice(0, 2).map((a) => <span key={a.id} title={`${a.description} · score ${a.riskScore} · ${a.riskLevel}`} className="mt-1 block truncate text-[9px] leading-tight">{a.description}</span>)}
                </button>;
              })}
            </Fragment>)}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px]" aria-label="Risk level legend">
            <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border bg-secondary/50" aria-hidden />LOW · 1–6</li>
            <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border bg-[hsl(158_24%_88%)]" aria-hidden />MEDIUM · 7–12</li>
            <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border bg-[hsl(42_58%_83%)]" aria-hidden />HIGH · 13–19</li>
            <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-accent/55 bg-accent/20" aria-hidden />CRITICAL · 20–25</li>
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">Cell tint uses returned risk levels; counts and scores come from saved assumptions. Empty cells are unscored.</p>
        </div>
        {selectedAssumption && <article className="mt-3 rounded-md border border-accent/35 bg-card p-4" aria-live="polite" data-testid="selected-assumption-details">
          <div className="flex flex-wrap items-center gap-2"><p className="eyebrow">Selected assumption</p><Chip value={selectedAssumption.status} /><Chip value={selectedAssumption.riskLevel}>{selectedAssumption.riskLevel} · {selectedAssumption.riskScore}</Chip><Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setSelected(null); setCell(null); }}>Clear selection</Button></div>
          <p className="mt-2 font-display text-lg leading-snug">{selectedAssumption.description}</p>
          <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3"><p><span className="eyebrow block mb-1">Impact × uncertainty</span>{selectedAssumption.impact} × {selectedAssumption.uncertainty}</p><p><span className="eyebrow block mb-1">Why it matters</span>{selectedAssumption.explanation}</p><p><span className="eyebrow block mb-1">Evidence required</span>{selectedAssumption.evidenceRequired}</p><p><span className="eyebrow block mb-1">Validation method</span>{selectedAssumption.validationMethod}</p></div>
        </article>}
      </section>

      <section id="assumptions" className="mb-12 scroll-mt-8">
        <SectionHead eyebrow="Evidence before confidence" title="Assumptions" aside={<p className="max-w-sm text-right text-[11px] text-muted-foreground">AI hypotheses are not verification. Outcomes require linked evidence that matches the judgment.</p>} />
        <div className="mb-4 flex flex-col gap-2 rounded-md border border-card-border bg-card p-3 md:flex-row md:flex-wrap md:items-center">
          <label className="relative min-w-48 flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assumptions" className="pl-8" aria-label="Search assumptions" data-testid="input-assumption-search" /></label>
          <select aria-label="Filter category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded border border-input bg-background px-2 text-xs" data-testid="select-assumption-category"><option value="ALL">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          <select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded border border-input bg-background px-2 text-xs" data-testid="select-assumption-status"><option value="ALL">All statuses</option>{['UNTESTED', 'TESTING', 'SUPPORTED', 'INVALIDATED', 'INCONCLUSIVE'].map((s) => <option key={s}>{s}</option>)}</select>
          <select aria-label="Sort assumptions" value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded border border-input bg-background px-2 text-xs" data-testid="select-assumption-sort"><option value="risk">Highest server risk first</option><option value="description">Description A–Z</option></select>
          {cell && <Button size="sm" variant="ghost" onClick={() => setCell(null)}>Clear matrix selection</Button>}
        </div>
        {assumptionsQ.isLoading ? <RowsSkeleton rows={5} /> : assumptionsQ.isError ? <ErrorPanel error={assumptionsQ.error} onRetry={() => assumptionsQ.refetch()} title="Could not load assumptions" /> : filtered.length === 0 ? <EmptyState mark="0" title="No assumptions match" body="Adjust the filters or choose another matrix cell. Nothing is added to this report unless it was returned by the analysis." /> : (
          <ol className="space-y-2">{filtered.map((a, i) => <HypothesisRow key={a.id} a={a} rank={i + 1} projectId={projectId} readOnly={!latestQ.data?.data || latestQ.data.data.id !== analysisId} selected={selected === a.id} onSelect={() => setSelected(selected === a.id ? null : a.id)} />)}</ol>
        )}
      </section>

      <section id="blindspots" className="mb-12 scroll-mt-8">
        <SectionHead eyebrow="AI hypotheses / require human review" title="Blindspots" aside={<AiLabel review={false} />} />
        {blindspotsQ.isLoading ? <RowsSkeleton rows={3} /> : blindspotsQ.isError ? <ErrorPanel error={blindspotsQ.error} onRetry={() => blindspotsQ.refetch()} title="Could not load blindspots" /> : !blindspotEnvelope?.available ? <EmptyState mark="ENGINE" title="Blindspots unavailable" body={blindspotEnvelope?.reason || 'This snapshot predates the blindspot analysis engine. No findings are inferred here.'} /> : blindspotEnvelope.items.length === 0 ? <EmptyState mark="0" title="No blindspots returned" body="The analysis returned no blindspot hypotheses for this snapshot." /> : (
          <div className="space-y-3">{blindspotEnvelope.items.map((b) => <article key={b.id} className="rounded-md border border-card-border bg-card p-4" data-testid={`card-blindspot-${b.id}`}>
            <div className="flex flex-wrap items-center gap-2"><Chip value={b.severity}>{b.severity} severity</Chip><Chip value="UNTESTED">AI-generated · not verified</Chip><p className="font-display text-xl">{b.title}</p></div>
            <p className="mt-2 text-sm leading-relaxed">{b.explanation}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><p className="eyebrow mb-1">Why it may be overlooked</p><p>{b.whyOverlooked}</p></div><div><p className="eyebrow mb-1">Suggested action</p><p>{b.suggestedAction}</p></div><div><p className="eyebrow mb-1">Evidence required</p><p>{b.evidenceRequired}</p></div><div><p className="eyebrow mb-1">Grounding</p><p>{b.grounding}</p></div></div>
            {b.sourceQuote && <blockquote className="mt-3 border-l-2 border-foreground/20 pl-3 font-display italic text-muted-foreground">“{b.sourceQuote}”</blockquote>}
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => { setCell(null); setSelected(b.relatedAssumptionId); setCategory('ALL'); setStatus('ALL'); setSearch(''); }} data-testid={`button-related-assumption-${b.id}`}><Target className="mr-1.5 h-3.5 w-3.5" />Related assumption</Button>
          </article>)}</div>
        )}
      </section>

      <section id="questions" className="mb-12 scroll-mt-8">
        <SectionHead eyebrow="Use verbatim / do not lead the participant" title="Interview questions" aside={questions.length > 0 ? <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void copy(questions.map((q) => q.question).join('\n\n'), 'Questions copied')} data-testid="button-copy-all-questions"><Copy className="mr-1.5 h-3.5 w-3.5" />Copy all</Button>
          <Button size="sm" asChild data-testid="button-start-interview-from-report">
            <Link href={`/projects/${projectId}/interviews?create=1&reportAnalysisId=${encodeURIComponent(analysisId)}&reportVersion=${analysis.version}`}>
              <UserRoundPlus className="mr-1.5 h-3.5 w-3.5" />Start an interview
            </Link>
          </Button>
        </div> : undefined} />
        {questions.length > 0 && <p className="mb-3 text-xs text-muted-foreground">
          {latest?.id && latest.id !== analysisId
            ? 'This is an older report. Interview sessions use the project’s latest analysis; questions from this snapshot are not sent to session creation.'
            : 'Interview sessions use the project’s latest analysis. Report questions are not submitted as a custom script.'}
        </p>}
        {questionsQ.isLoading ? <RowsSkeleton rows={3} /> : questionsQ.isError ? <ErrorPanel error={questionsQ.error} onRetry={() => questionsQ.refetch()} title="Could not load interview questions" /> : !questionEnvelope?.available ? <EmptyState mark="ENGINE" title="Questions unavailable" body={questionEnvelope?.reason || 'This snapshot does not contain the interview-question engine output.'} /> : questions.length === 0 ? <EmptyState mark="0" title="No interview questions returned" body="This analysis did not return questions. No prompts have been invented." /> : <ol className="space-y-2">{questions.map((q, i) => <li key={q.id} className="rounded-md border border-card-border bg-card p-4">
          <div className="flex items-start gap-3"><span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><p className="font-display text-lg leading-snug">{q.question}</p><p className="mt-2 text-xs text-muted-foreground">{q.purpose}</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><p><span className="eyebrow block mb-1">Evidence to listen for</span>{q.evidenceToLookFor}</p><p><span className="eyebrow block mb-1">Follow-up</span>{q.followUpQuestion}</p></div></div><Button size="sm" variant="ghost" aria-label={`Copy question ${i + 1}`} onClick={() => void copy(q.question, 'Question copied')}><Copy className="h-4 w-4" /></Button></div>
        </li>)}</ol>}
      </section>

      <section id="history" className="scroll-mt-8">
        <SectionHead eyebrow="Immutable snapshots" title="Version history" aside={<span className="text-xs text-muted-foreground">Older versions are read-only</span>} />
        {historyQ.isLoading ? <RowsSkeleton rows={3} /> : historyQ.isError ? <ErrorPanel error={historyQ.error} onRetry={() => historyQ.refetch()} title="Could not load version history" /> : historyItems.length === 0 ? <EmptyState mark="0" title="No version history available" body="History will appear here when the service returns saved analysis versions." /> : <div className="divide-y divide-foreground/10 rounded-md border border-card-border bg-card">{historyItems.map((h) => <Link key={h.id} href={`/projects/${projectId}/analysis/${h.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60" data-testid={`link-analysis-version-${h.version}`}>
          <span className="font-display text-2xl">v{h.version}</span><span className="min-w-0 flex-1"><span className="block font-mono text-xs">{fmtDate(h.createdAt)}</span><span className="block text-[11px] text-muted-foreground">{h.model}</span></span>{h.id === latest?.id ? <Chip value="OK">Latest</Chip> : <span className="text-xs text-muted-foreground">Open snapshot</span>}
        </Link>)}</div>}
        {!historyQ.isLoading && !historyQ.isError && <div className="mt-3 flex items-center justify-end gap-2">
          {historyPage > 1 && <Button size="sm" variant="outline" onClick={() => setHistoryPage((page) => page - 1)} disabled={historyQ.isFetching}>Newer versions</Button>}
          <span className="font-mono text-[10px] text-muted-foreground">Page {historyPage}</span>
          {history.length === HISTORY_PAGE_SIZE && <Button size="sm" variant="outline" onClick={() => setHistoryPage((page) => page + 1)} disabled={historyQ.isFetching}>Load older versions</Button>}
        </div>}
      </section>
      {latestQ.data?.data && latestQ.data.data.id !== analysisId && <p className="mt-6 text-xs text-muted-foreground">This is a preserved historical snapshot. Review controls are disabled.</p>}
      <p className="mt-8 border-t border-foreground/10 pt-3 text-[11px] text-muted-foreground">Analysis is a decision aid, not market proof. Statuses reflect human review of cited evidence. A hypothesis is never verified by AI output alone.</p>
    </article>
  );
}
