import { useState, type FormEvent } from 'react';
import { useParams, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import {
  useListExperiments,
  useCreateExperiment,
  useUpdateExperiment,
  getListExperimentsQueryKey,
  type Experiment,
  type ExperimentInput,
  type ExperimentUpdateStatus,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ProjectFrame } from '@/components/project-frame';
import { Chip, EmptyState, ErrorPanel, InlineError, Pager, RowsSkeleton, SectionHead } from '@/components/kit';
import { PAGE_SIZE, fmtDate } from '@/lib/api';
import { useLatest } from '@/lib/latest';

export default function ExperimentsPage() {
  const { id = '' } = useParams<{ id: string }>();
  return <ProjectFrame id={id}>{(p) => <Experiments projectId={p.id} />}</ProjectFrame>;
}

const COLUMNS: ExperimentUpdateStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'];

function Experiments({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const params = { page, limit: PAGE_SIZE };
  const q = useListExperiments(projectId, params, { query: { enabled: !!projectId, queryKey: getListExperimentsQueryKey(projectId, params) } });
  const latest = useLatest(projectId);
  const items = q.data?.data.items ?? [];
  const desc = new Map((latest.analysis?.assumptions ?? []).map((a) => [a.id, a.description]));

  return (
    <div className="space-y-6">
      <SectionHead eyebrow="Falsification" title="Experiments" aside={<Button onClick={() => setCreating(true)} disabled={!latest.analysis} data-testid="button-new-experiment"><Plus className="mr-1.5 h-4 w-4" />New experiment</Button>} />
      <p className="-mt-2 text-xs text-muted-foreground">Completing an experiment records what you observed. It never changes a hypothesis status; review outcomes on the Evidence tab.</p>
      <p className="text-xs text-muted-foreground">AI-drafted protocols are suggestions requiring human review, not proven validation methods. Review every protocol before use; the API does not store whether a protocol was written manually or drafted by AI.</p>
      {latest.missing && <EmptyState mark="v0" title="Nothing to test yet" body={<>Experiments target a specific hypothesis. <Link href={`/projects/${projectId}`} className="text-accent underline">Run an analysis first.</Link></>} />}
      {q.isLoading ? (
        <RowsSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load experiments" />
      ) : items.length === 0 ? (
        !latest.missing && <EmptyState mark="EXP" title="No experiments planned" body="Pick the riskiest hypothesis and design the cheapest test that could prove it wrong." action={<Button onClick={() => setCreating(true)} disabled={!latest.analysis}>Design an experiment</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const list = items.filter((e) => e.status === col);
            return (
              <section key={col} aria-label={col} className="min-w-0">
                <div className="mb-2 flex items-center justify-between border-b border-foreground/10 pb-1"><Chip value={col} /><span className="font-mono text-xs text-muted-foreground">{list.length}</span></div>
                <ul className="space-y-2">
                  {list.map((e) => <ExperimentCard key={e.id} e={e} projectId={projectId} hypothesis={desc.get(e.assumptionId)} />)}
                  {list.length === 0 && <li className="rounded border border-dashed border-foreground/15 p-3 text-center text-[11px] text-muted-foreground">Empty</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <Pager page={page} setPage={setPage} count={items.length} limit={PAGE_SIZE} label="Experiments pagination" />
      {latest.analysis && <CreateExperimentDialog projectId={projectId} assumptions={latest.analysis.assumptions.map((a) => ({ id: a.id, d: a.description, s: a.riskScore }))} open={creating} onOpenChange={setCreating} />}
    </div>
  );
}

function ExperimentCard({ e, projectId, hypothesis }: { e: Experiment; projectId: string; hypothesis?: string }) {
  const [completing, setCompleting] = useState(false);
  const [result, setResult] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useUpdateExperiment();
  const set = (status: ExperimentUpdateStatus, observedResult?: string) =>
    m.mutate(
      { id: e.id, data: observedResult ? { status, observedResult } : { status } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListExperimentsQueryKey(projectId) });
          toast({ title: `Experiment ${status.replace('_', ' ').toLowerCase()}` });
          setCompleting(false);
        },
      },
    );
  const active = e.status === 'PLANNED' || e.status === 'IN_PROGRESS';
  return (
    <li className="lift rise rounded-md border border-card-border bg-card p-3 text-sm" data-testid={`card-experiment-${e.id}`}>
      <h3 className="font-display text-base leading-tight">{e.name}</h3>
      {hypothesis && <p className="mt-1 text-[11px] text-muted-foreground">Tests: {hypothesis}</p>}
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Protocol</summary>
        <dl className="mt-2 space-y-1.5">
          {([['Why', e.explanation], ['Method', e.method], ['Collect', e.evidenceToCollect], ['Success criteria', e.successCriteria]] as const).map(([k, v]) => (
            <div key={k}><dt className="eyebrow">{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </details>
      {e.observedResult && <div className="mt-2 rounded bg-secondary p-2 text-xs"><p className="eyebrow">Observed</p><p className="whitespace-pre-wrap">{e.observedResult}</p></div>}
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">Updated {fmtDate(e.updatedAt)}</p>
      {active && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {e.status === 'PLANNED' && <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => set('IN_PROGRESS')} data-testid={`button-start-${e.id}`}>Start</Button>}
          {e.status === 'IN_PROGRESS' && <Button size="sm" disabled={m.isPending} onClick={() => setCompleting(true)} data-testid={`button-complete-${e.id}`}>Complete</Button>}
          <Button size="sm" variant="ghost" disabled={m.isPending} onClick={() => set('ABANDONED')} data-testid={`button-abandon-${e.id}`}>Abandon</Button>
        </div>
      )}
      {m.error && !completing ? <div className="mt-2"><InlineError error={m.error} /></div> : null}
      <Dialog open={completing} onOpenChange={setCompleting}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <p className="eyebrow">Close out</p>
            <DialogTitle className="font-display text-2xl">What actually happened?</DialogTitle>
            <DialogDescription>Record the observation against the success criteria: "{e.successCriteria}". This does not change any hypothesis status.</DialogDescription>
          </DialogHeader>
          <Label htmlFor={`obs-${e.id}`} className="sr-only">Observed result</Label>
          <Textarea id={`obs-${e.id}`} value={result} maxLength={4000} onChange={(ev) => setResult(ev.target.value)} className="min-h-28 bg-background" placeholder="e.g. 2 of 9 contacted clinics replied; none agreed to a paid pilot." data-testid="input-observed-result" />
          <InlineError error={m.error} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleting(false)}>Cancel</Button>
            <Button disabled={!result.trim() || m.isPending} onClick={() => set('COMPLETED', result.trim())} data-testid="button-confirm-complete">{m.isPending ? 'Saving...' : 'Mark completed'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

const MANUAL = [
  ['name', 'Experiment name', false],
  ['explanation', 'Why this tests the hypothesis', true],
  ['method', 'Procedure', true],
  ['evidenceToCollect', 'Evidence to collect', true],
  ['successCriteria', 'Success criteria (measurable threshold)', true],
] as const;

function CreateExperimentDialog({ projectId, assumptions, open, onOpenChange }: { projectId: string; assumptions: { id: string; d: string; s: number }[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [aid, setAid] = useState('');
  const [f, setF] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useCreateExperiment();
  const manualOk = MANUAL.every(([k]) => (f[k] ?? '').trim());
  const ok = !!aid && (mode === 'ai' || manualOk);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    const data: ExperimentInput = mode === 'ai' ? { assumptionId: aid } : { assumptionId: aid, ...Object.fromEntries(MANUAL.map(([k]) => [k, f[k].trim()])) };
    m.mutate(
      { id: projectId, data },
      {
        onSuccess: (res) => {
          qc.invalidateQueries({ queryKey: getListExperimentsQueryKey(projectId) });
          toast({ title: 'Experiment planned', description: res.data.name });
          setF({});
          onOpenChange(false);
        },
      },
    );
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) m.reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[92dvh] max-w-xl overflow-y-auto bg-card">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <p className="eyebrow">New experiment</p>
            <DialogTitle className="font-display text-2xl">Design a test that could fail</DialogTitle>
            <DialogDescription>Ask the AI to draft a protocol, or write it yourself.</DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label="Creation mode" className="grid grid-cols-2 gap-1 rounded-md bg-secondary p-1 text-sm">
            {(['ai', 'manual'] as const).map((k) => (
              <button type="button" role="radio" aria-checked={mode === k} key={k} onClick={() => setMode(k)} className={`rounded px-2 py-1.5 transition-colors ${mode === k ? 'bg-card shadow-sm' : 'text-muted-foreground'}`} data-testid={`mode-${k}`}>
                {k === 'ai' ? 'AI-suggested (review required)' : 'Manual'}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="exp-assumption">Hypothesis</Label>
            <select id="exp-assumption" value={aid} onChange={(e) => setAid(e.target.value)} required className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm" data-testid="select-assumption">
              <option value="">Choose a hypothesis</option>
              {[...assumptions].sort((a, b) => b.s - a.s).map((a) => <option key={a.id} value={a.id}>[{a.s}] {a.d.slice(0, 110)}</option>)}
            </select>
          </div>
          {mode === 'manual' &&
            MANUAL.map(([k, label, area]) => {
              const C = area ? Textarea : Input;
              return (
                <div key={k} className="space-y-1">
                  <Label htmlFor={`exp-${k}`}>{label}</Label>
                  <C id={`exp-${k}`} value={f[k] ?? ''} maxLength={k === 'name' ? 200 : 2000} onChange={(e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })} required className="bg-background" data-testid={`input-${k}`} />
                </div>
              );
            })}
          <InlineError error={m.error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!ok || m.isPending} data-testid="button-create-experiment">{m.isPending ? (mode === 'ai' ? 'Drafting...' : 'Saving...') : mode === 'ai' ? 'Draft with AI' : 'Create experiment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
