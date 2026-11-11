import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, Play, CheckCircle2, XCircle, Save, Lock } from 'lucide-react';
import type { Assumption, Experiment, ExperimentUpdate } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Chip, InlineError } from '@/components/kit';
import { useToast } from '@/hooks/use-toast';
import { useExperimentDrafts, useUpdateExp } from '@/hooks/use-experiments';
import { fmtDate } from '@/lib/api';
import { OBS_MAX, STATUS_LABEL, canMove, hasSavedResult, isActive, obsValid } from '@/lib/experiments';
import { field, forestBtn, violetBtn, wrap } from './ui';

export function ExperimentDetail({ projectId, e, assumption, latestFailed, onUpdated }: { projectId: string; e: Experiment; assumption?: Assumption; latestFailed: boolean; onUpdated?: (record: Experiment) => void }) {
  const { getObs, setObs } = useExperimentDrafts(projectId);
  const { m, busy, tryLock } = useUpdateExp(projectId, e.id);
  const { toast } = useToast();
  const [abandoning, setAbandoning] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const draft = getObs(e.id);
  const value = draft ?? e.observedResult ?? '';
  const dirty = draft !== undefined && draft !== (e.observedResult ?? '');
  const active = isActive(e.status);

  const send = (data: ExperimentUpdate, label: string, after?: () => void) => {
    if (busy || !tryLock()) return;
    setLastAction(label);
    m.mutate({ id: e.id, data }, {
      onSuccess: (res) => {
        onUpdated?.(res.data);
        toast({ title: label, description: `${res.data.name}: ${STATUS_LABEL[res.data.status] ?? res.data.status}` });
        after?.();
      },
    });
  };
  const canComplete = e.status === 'IN_PROGRESS' && (obsValid(value) || (!dirty && hasSavedResult(e)));
  const complete = () => {
    if (!canComplete) return;
    // include observation only when the founder entered one; otherwise rely on the saved result
    if (obsValid(value) && (dirty || !hasSavedResult(e))) send({ status: 'COMPLETED', observedResult: value.trim() }, 'Experiment completed');
    else send({ status: 'COMPLETED' }, 'Experiment completed');
  };

  return (
    <article className="min-w-0 rounded-xl border border-[#1F3D2B]/15 bg-[#FBF8F1] shadow-[0_18px_40px_-28px_rgba(31,61,43,.55)]" data-testid="experiment-detail" aria-label={`Experiment ${e.name}`}>
      <header className="rounded-t-xl bg-[#1F3D2B] p-5 text-[#E8DCC4]">
        <div className="flex flex-wrap items-center gap-2"><Chip value={e.status}>{STATUS_LABEL[e.status] ?? e.status}</Chip><span className="font-mono text-[10px] text-[#E8DCC4]/60">updated {fmtDate(e.updatedAt)}</span></div>
        <h2 className={`mt-2 font-display text-2xl leading-tight ${wrap}`} data-testid="text-experiment-name">{e.name}</h2>
        <p className="mt-1 font-mono text-[10px] text-[#E8DCC4]/60">created {fmtDate(e.createdAt)}</p>
      </header>
      <div className="space-y-5 p-5">
        <section aria-label="Related assumption" className="rounded-lg border border-[#1F3D2B]/15 bg-[#E8DCC4]/40 p-3 text-sm">
          <p className="eyebrow">Tests assumption</p>
          {assumption ? (
            <>
              <p className={`mt-1 text-[#1F3D2B] ${wrap}`}>{assumption.title || assumption.description}</p>
              {assumption.title && <p className={`mt-1 text-xs text-muted-foreground ${wrap}`}>{assumption.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2"><Chip value={assumption.status} /><span className="font-mono text-[10px] text-muted-foreground">risk {assumption.riskScore}</span></div>
            </>
          ) : (
            <p className={`mt-1 text-xs text-muted-foreground ${wrap}`} data-testid="text-assumption-unavailable">
              {latestFailed ? 'Latest analysis could not be loaded, so assumption context is unavailable.' : 'Not in the latest analysis; context unavailable.'} Reference: <span className="font-mono text-[#1F3D2B]">{e.assumptionId}</span>
            </p>
          )}
          <Link href={`/projects/${projectId}/evidence?assumptionId=${encodeURIComponent(e.assumptionId)}`} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-[#1F3D2B] underline decoration-[#8B5CF6]/60 underline-offset-4" data-testid="link-experiment-assumption">
            Open evidence for this assumption <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <p className="mt-1 text-[11px] text-muted-foreground">Experiment status never changes assumption status. Judge outcomes on the Evidence tab.</p>
        </section>

        <dl className="grid gap-4 text-sm">
          {([['Why it tests the assumption', e.explanation], ['Method', e.method], ['Evidence to collect', e.evidenceToCollect], ['Success criteria', e.successCriteria]] as const).map(([k, v]) => (
            <div key={k} className="min-w-0 border-l-2 border-[#1F3D2B]/25 pl-3"><dt className="eyebrow">{k}</dt><dd className={`mt-1 whitespace-pre-wrap text-[#1F3D2B] ${wrap}`}>{v}</dd></div>
          ))}
        </dl>

        <section aria-label="Observed result" className="space-y-2">
          <p className="eyebrow">Observed result</p>
          {active ? (
            <>
              {hasSavedResult(e) && !dirty && <p className="text-[11px] text-muted-foreground">Saved observation loaded below exactly as stored.</p>}
              <Label htmlFor={`obs-${e.id}`} className="sr-only">Observed result</Label>
              <Textarea id={`obs-${e.id}`} value={value} disabled={busy} onChange={(ev) => setObs(e.id, ev.target.value)} className={`${field} min-h-28`}
                placeholder="What did customers actually do or say? e.g. 3 of 11 contacted clinics replied; none agreed to a paid pilot." data-testid="input-observed-result" />
              {dirty && hasSavedResult(e) && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Saving replaces the stored observation. This API provides no revision history.</p>
                  <details><summary className="cursor-pointer underline">View currently saved observation</summary><p className={`mt-1 whitespace-pre-wrap ${wrap}`}>{e.observedResult}</p></details>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono">{value.trim().length}/{OBS_MAX}{dirty ? ' / unsaved draft' : ''}</span>
                <div className="flex flex-wrap gap-1.5">
                  {dirty && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setObs(e.id, undefined)} data-testid="button-discard-observation">Discard draft</Button>}
                  <Button size="sm" variant="outline" disabled={busy || !dirty || !obsValid(value)} onClick={() => send({ status: e.status as ExperimentUpdate['status'], observedResult: value.trim() }, 'Observation saved')} data-testid="button-save-observation">
                    <Save className="mr-1 h-3.5 w-3.5" aria-hidden />Save observation
                  </Button>
                </div>
              </div>
            </>
          ) : e.observedResult ? (
            <p className={`whitespace-pre-wrap rounded-lg bg-[#E8DCC4]/50 p-3 text-sm text-[#1F3D2B] ${wrap}`} data-testid="text-observed-result">{e.observedResult}</p>
          ) : (
            <p className="text-xs text-muted-foreground">No observation was recorded.</p>
          )}
        </section>

        {active ? (
          <div className="flex flex-wrap gap-2 border-t border-[#1F3D2B]/10 pt-4">
            {canMove(e.status, 'IN_PROGRESS') && <Button disabled={busy} className={forestBtn} onClick={() => send({ status: 'IN_PROGRESS' }, 'Experiment started')} data-testid={`button-start-${e.id}`}><Play className="mr-1.5 h-4 w-4" aria-hidden />Start</Button>}
            {canMove(e.status, 'COMPLETED') && <Button disabled={busy || !canComplete} className={violetBtn} onClick={complete} data-testid={`button-complete-${e.id}`}><CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />Complete</Button>}
            {canMove(e.status, 'ABANDONED') && <Button variant="ghost" disabled={busy} onClick={() => setAbandoning(true)} data-testid={`button-abandon-${e.id}`}><XCircle className="mr-1.5 h-4 w-4" aria-hidden />Abandon</Button>}
            {e.status === 'IN_PROGRESS' && !canComplete && <p className="w-full text-[11px] text-muted-foreground">Completion needs an observed result. Completion records what happened; it is not proof.</p>}
            {e.status === 'IN_PROGRESS' && <p className="w-full text-[11px] text-muted-foreground">Completed records are read-only here. Review the observation before completing.</p>}
            {e.status === 'PLANNED' && <p className="w-full text-[11px] text-muted-foreground">Start it before recording completion. Observations can be saved at any active stage.</p>}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 border-t border-[#1F3D2B]/10 pt-4 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" aria-hidden />{STATUS_LABEL[e.status] ?? e.status} is final. The original outcome is read-only.</p>
        )}
        {m.error && !abandoning ? <div><p className="mb-1 text-[11px] text-muted-foreground">{lastAction} failed; your draft is kept.</p><InlineError error={m.error} /></div> : null}
      </div>

      <Dialog open={abandoning} onOpenChange={(o) => { if (!busy) setAbandoning(o); }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md border-[#1F3D2B]/20 bg-[#F6F1E6]">
          <DialogHeader>
            <p className="eyebrow">Abandon experiment</p>
            <DialogTitle className={`font-display text-xl text-[#1F3D2B] ${wrap}`}>Stop "{e.name}"?</DialogTitle>
            <DialogDescription>Abandoned is final and cannot be reopened. Any saved observation is kept; unsaved draft text is not sent.</DialogDescription>
          </DialogHeader>
          {m.error && <InlineError error={m.error} />}
          <DialogFooter className="gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setAbandoning(false)}>Keep it</Button>
            <Button disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => send({ status: 'ABANDONED' }, 'Experiment abandoned', () => setAbandoning(false))} data-testid="button-confirm-abandon">{busy ? 'Saving...' : 'Abandon'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
