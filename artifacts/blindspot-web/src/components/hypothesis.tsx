import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Quote } from 'lucide-react';
import {
  useUpdateAssumption,
  getListAssumptionsQueryKey,
  getGetLatestAnalysisQueryKey,
  getGetAnalysisQueryKey,
  type Assumption,
  type AssumptionStatus,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Chip, InlineError } from '@/components/kit';
import { fmtDay } from '@/lib/api';

type Outcome = Extract<AssumptionStatus, 'SUPPORTED' | 'INVALIDATED' | 'INCONCLUSIVE'>;
const OUTCOMES: { v: Outcome; label: string; rule: string }[] = [
  { v: 'SUPPORTED', label: 'Supported', rule: 'Needs at least one supporting record. Supported means the cited evidence leans this way, not that the market is validated.' },
  { v: 'INVALIDATED', label: 'Invalidated', rule: 'Needs at least one invalidating record.' },
  { v: 'INCONCLUSIVE', label: 'Inconclusive', rule: 'Cite the evidence that left the question open.' },
];

function useAssumptionMutation(a: Assumption, projectId: string) {
  const qc = useQueryClient();
  const m = useUpdateAssumption({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAssumptionsQueryKey(a.analysisId) });
        qc.invalidateQueries({ queryKey: getGetAnalysisQueryKey(a.analysisId) });
        qc.invalidateQueries({ queryKey: getGetLatestAnalysisQueryKey(projectId) });
      },
    },
  });
  return m;
}

function sentimentTone(s: string) {
  const u = s.toUpperCase();
  if (u.includes('SUPPORT')) return 'SUPPORTED';
  if (u.includes('INVALID') || u.includes('CONTRA') || u.includes('NEG')) return 'INVALIDATED';
  return 'UNTESTED';
}

export function OutcomeDialog({ a, projectId, open, onOpenChange }: { a: Assumption; projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [outcome, setOutcome] = useState<Outcome>('SUPPORTED');
  const [sel, setSel] = useState<string[]>([]);
  const m = useAssumptionMutation(a, projectId);
  const { toast } = useToast();
  const records = (a.evidenceRecords ?? []).filter((e) => e.assumptionId === a.id);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { m.reset(); setSel([]); } onOpenChange(o); }}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto bg-card">
        <DialogHeader>
          <p className="eyebrow">Human review</p>
          <DialogTitle className="font-display text-2xl">Record an outcome</DialogTitle>
          <DialogDescription>{a.description}</DialogDescription>
        </DialogHeader>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Your judgment</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {OUTCOMES.map((o) => (
              <label key={o.v} className={`cursor-pointer rounded border p-2.5 text-sm transition-colors ${outcome === o.v ? 'border-accent bg-accent/5' : 'border-foreground/15 hover:border-foreground/30'}`}>
                <input type="radio" name="outcome" value={o.v} checked={outcome === o.v} onChange={() => setOutcome(o.v)} className="sr-only" data-testid={`radio-outcome-${o.v}`} />
                <Chip value={o.v}>{o.label}</Chip>
                <span className="mt-1.5 block text-[11px] leading-snug text-muted-foreground">{o.rule}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Cite evidence linked to this hypothesis ({sel.length} selected)</legend>
          {records.length === 0 ? (
            <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">No evidence records are linked to this hypothesis yet. Add interview notes, then run feedback analysis on the Evidence tab.</p>
          ) : (
            records.map((e) => {
              const on = sel.includes(e.id);
              return (
                <label key={e.id} className={`flex cursor-pointer gap-3 rounded border p-2.5 text-xs transition-colors ${on ? 'border-accent bg-accent/5' : 'border-foreground/10'}`}>
                  <Checkbox checked={on} onCheckedChange={(c) => setSel(c ? [...sel, e.id] : sel.filter((x) => x !== e.id))} aria-label={`Cite evidence ${e.id}`} data-testid={`checkbox-evidence-${e.id}`} />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block font-display text-sm italic">"{e.quote}"</span>
                    <span className="flex flex-wrap gap-1.5">
                      <Chip value={sentimentTone(e.sentiment)}>{e.sentiment}</Chip>
                      <Chip value="x">{e.origin}</Chip>
                      <span className="font-mono text-[10px] text-muted-foreground">{fmtDay(e.createdAt)}</span>
                    </span>
                    {e.reasoning && <span className="block text-muted-foreground">{e.reasoning}</span>}
                  </span>
                </label>
              );
            })
          )}
        </fieldset>
        <InlineError error={m.error} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={sel.length === 0 || m.isPending}
            data-testid="button-submit-outcome"
            onClick={() =>
              m.mutate(
                { id: a.id, data: { status: outcome, evidenceIds: sel } },
                {
                  onSuccess: () => {
                    toast({ title: `Marked ${outcome.toLowerCase()}`, description: `${sel.length} citation(s) recorded. You can reopen it any time.` });
                    setSel([]);
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            {m.isPending ? 'Recording...' : 'Record reviewed outcome'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HypothesisRow({ a, rank, projectId, readOnly }: { a: Assumption; rank: number; projectId: string; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [dlg, setDlg] = useState(false);
  const m = useAssumptionMutation(a, projectId);
  const { toast } = useToast();
  const toTesting = (msg: string) =>
    m.mutate({ id: a.id, data: { status: 'TESTING' } }, { onSuccess: () => toast({ title: msg }) });
  const evid = a.evidenceRecords?.length ?? 0;
  const isOutcome = a.status === 'SUPPORTED' || a.status === 'INVALIDATED' || a.status === 'INCONCLUSIVE';

  return (
    <li className="rise group rounded-md border border-card-border bg-card transition-colors hover:border-foreground/25" style={{ animationDelay: `${Math.min(rank, 12) * 35}ms` }} data-testid={`row-hypothesis-${a.id}`}>
      <div className="flex gap-3 p-3 md:p-4">
        <div className="flex w-10 shrink-0 flex-col items-center">
          <span className="font-mono text-[10px] text-muted-foreground">#{rank}</span>
          <span className={`font-display text-2xl tabular-nums ${['HIGH', 'CRITICAL'].includes(a.riskLevel) ? 'text-accent' : ''}`} title="Risk score = impact x uncertainty">{a.riskScore}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Chip value={a.status} />
            <Chip value={a.riskLevel}>{a.riskLevel} risk</Chip>
            <Chip value="x">{a.category}</Chip>
            <span className="font-mono text-[10px] text-muted-foreground">impact {a.impact} x uncertainty {a.uncertainty}</span>
          </div>
          <p className="text-[15px] leading-snug">{a.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid={`button-expand-${a.id}`}>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /> Why it matters
            </button>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground"><Quote className="h-3 w-3" />{evid} evidence</span>
            {!readOnly && (
              <span className="ml-auto flex gap-1.5">
                {a.status === 'UNTESTED' && (
                  <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => toTesting('Hypothesis is now under test')} data-testid={`button-start-testing-${a.id}`}>Begin testing</Button>
                )}
                {a.status === 'TESTING' && (
                  <Button size="sm" disabled={m.isPending} onClick={() => setDlg(true)} data-testid={`button-record-outcome-${a.id}`}>Record outcome</Button>
                )}
                {isOutcome && (
                  <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => toTesting('Reopened to testing')} data-testid={`button-reopen-${a.id}`}>Reopen</Button>
                )}
              </span>
            )}
          </div>
          {m.error ? <div className="mt-2"><InlineError error={m.error} /></div> : null}
          {open && (
            <div className="rise mt-3 grid gap-3 border-t border-foreground/10 pt-3 text-sm md:grid-cols-3">
              <div><p className="eyebrow mb-1">Explanation</p><p className="text-foreground/85">{a.explanation}</p></div>
              <div><p className="eyebrow mb-1">Evidence required</p><p className="text-foreground/85">{a.evidenceRequired}</p></div>
              <div><p className="eyebrow mb-1">Validation method</p><p className="text-foreground/85">{a.validationMethod}</p></div>
              {evid > 0 && (
                <div className="md:col-span-3">
                  <p className="eyebrow mb-1">Linked evidence</p>
                  <ul className="space-y-1">
                    {a.evidenceRecords!.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-baseline gap-2 text-xs">
                        <Chip value={sentimentTone(e.sentiment)}>{e.sentiment}</Chip>
                        <span className="font-display italic">"{e.quote}"</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{e.origin}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {dlg && <OutcomeDialog a={a} projectId={projectId} open={dlg} onOpenChange={setDlg} />}
    </li>
  );
}
