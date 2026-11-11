import { useState, type FormEvent } from 'react';
import { Sparkles, PenLine, AlertTriangle } from 'lucide-react';
import type { Assumption, Experiment, ExperimentInput } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InlineError } from '@/components/kit';
import { useToast } from '@/hooks/use-toast';
import { useCreateExp, useExperimentDrafts } from '@/hooks/use-experiments';
import { MANUAL_FIELDS, isUuid, manualProblems } from '@/lib/experiments';
import { field, forestBtn, violetBtn, wrap } from './ui';

export function CreateExperimentDialog({ projectId, assumptions, open, onOpenChange, onCreated }: {
  projectId: string; assumptions: Assumption[]; open: boolean; onOpenChange: (o: boolean) => void; onCreated: (e: Experiment) => void;
}) {
  const { create, setCreate } = useExperimentDrafts(projectId);
  const { m, busy, tryLock } = useCreateExp(projectId);
  const { toast } = useToast();
  const [touched, setTouched] = useState(false);
  const { mode, assumptionId, fields } = create;
  const problems = mode === 'manual' ? manualProblems(fields) : [];
  const aidOk = isUuid(assumptionId) && assumptions.some((a) => a.id === assumptionId);
  const ok = aidOk && problems.length === 0;
  const sorted = [...assumptions].sort((a, b) => b.riskScore - a.riskScore);
  const chosen = assumptions.find((a) => a.id === assumptionId);

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    setTouched(true);
    if (!ok || busy || !tryLock()) return;
    const data: ExperimentInput = mode === 'ai'
      ? { assumptionId }
      : { assumptionId, name: fields.name.trim(), explanation: fields.explanation.trim(), method: fields.method.trim(), evidenceToCollect: fields.evidenceToCollect.trim(), successCriteria: fields.successCriteria.trim() };
    m.mutate({ id: projectId, data }, {
      onSuccess: (res) => {
        setTouched(false);
        toast({ title: mode === 'ai' ? 'AI suggestion saved as Planned' : 'Experiment saved', description: res.data.name });
        onCreated(res.data);
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) m.reset(); if (!busy || o) onOpenChange(o); }}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto border-[#1F3D2B]/20 bg-[#F6F1E6]">
        <form onSubmit={submit} className="min-w-0 space-y-5">
          <DialogHeader>
            <p className="eyebrow">New experiment</p>
            <DialogTitle className="font-display text-2xl text-[#1F3D2B]">Design a test that could fail</DialogTitle>
            <DialogDescription>Cancel keeps your draft for this session; nothing is saved until you submit.</DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label="Creation mode" className="grid grid-cols-2 gap-1 rounded-lg bg-[#E8DCC4]/70 p-1 text-sm">
            {(['ai', 'manual'] as const).map((k) => (
              <button type="button" role="radio" aria-checked={mode === k} key={k} disabled={busy} onClick={() => setCreate({ mode: k })} data-testid={`mode-${k}`}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 py-2 transition-colors ${mode === k ? 'bg-[#1F3D2B] text-[#E8DCC4] shadow-sm' : 'text-[#1F3D2B]/70 hover:text-[#1F3D2B]'}`}>
                {k === 'ai' ? <Sparkles className="h-4 w-4" aria-hidden /> : <PenLine className="h-4 w-4" aria-hidden />}
                {k === 'ai' ? 'AI suggestion' : 'Write manually'}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-assumption" className="text-[#1F3D2B]">Assumption to test</Label>
            <select id="exp-assumption" value={assumptionId} disabled={busy} onChange={(e) => setCreate({ assumptionId: e.target.value })} className={field} data-testid="select-assumption">
              <option value="">Choose an assumption from the latest analysis</option>
              {sorted.map((a) => <option key={a.id} value={a.id}>[risk {a.riskScore}] {(a.title || a.description).slice(0, 110)}</option>)}
            </select>
            {chosen && <p className={`rounded-md bg-[#FBF8F1] p-2 text-xs text-[#1F3D2B]/80 ${wrap}`}>{chosen.description}</p>}
            {touched && !aidOk && <p className="text-xs text-destructive">Choose an assumption.</p>}
          </div>
          {mode === 'ai' ? (
            <div className="flex gap-2.5 rounded-lg border border-[#8B5CF6]/35 bg-[#8B5CF6]/[0.06] p-3 text-xs text-[#1F3D2B]" data-testid="ai-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8B5CF6]" aria-hidden />
              <p>This immediately <strong>saves a Planned experiment</strong> written by AI. There is no preview step. It is a suggestion, not a validated method: review the saved protocol before you start it. The record will not be marked as AI-written afterwards.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {MANUAL_FIELDS.map((d) => {
                const v = fields[d.key];
                const C = d.area ? Textarea : Input;
                const bad = touched && (!v.trim() || v.trim().length > d.max);
                return (
                  <div key={d.key} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2"><Label htmlFor={`exp-${d.key}`} className="text-[#1F3D2B]">{d.label}</Label><span className="font-mono text-[10px] text-muted-foreground">{v.trim().length}/{d.max}</span></div>
                    <C id={`exp-${d.key}`} value={v} disabled={busy} aria-invalid={bad} onChange={(e: { target: { value: string } }) => setCreate({ fields: { ...fields, [d.key]: e.target.value } })}
                      className={`${field} ${d.area ? 'min-h-20' : ''}`} data-testid={`input-${d.key}`} />
                    <p className={`text-[11px] ${bad ? 'text-destructive' : 'text-muted-foreground'}`}>{bad ? (v.trim() ? `Max ${d.max} characters.` : 'Required.') : d.hint}</p>
                  </div>
                );
              })}
            </div>
          )}
          <InlineError error={m.error} />
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || (touched && !ok)} className={mode === 'ai' ? violetBtn : forestBtn} data-testid="button-create-experiment">
              {busy ? (mode === 'ai' ? 'Generating and saving...' : 'Saving...') : mode === 'ai' ? 'Generate and save AI suggestion' : 'Save experiment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
