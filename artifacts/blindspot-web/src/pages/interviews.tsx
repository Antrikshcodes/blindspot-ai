import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, UserRound } from 'lucide-react';
import {
  useCreateInterview,
  useListInterviews,
  useListFeedback,
  useAddFeedback,
  getListInterviewsQueryKey,
  getListFeedbackQueryKey,
  getListAssumptionsQueryKey,
  type Assumption,
  type Interview,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ProjectFrame } from '@/components/project-frame';
import { AiLabel, Counter, EmptyState, ErrorPanel, InlineError, Pager, RowsSkeleton, SectionHead } from '@/components/kit';
import { PAGE_SIZE, fmtDate } from '@/lib/api';
import { useLatest } from '@/lib/latest';

export default function InterviewsPage() {
  const { id = '' } = useParams<{ id: string }>();
  return <ProjectFrame id={id}>{(p) => <Interviews projectId={p.id} />}</ProjectFrame>;
}

function Interviews({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const params = { page, limit: PAGE_SIZE };
  const q = useListInterviews(projectId, params, { query: { enabled: !!projectId, queryKey: getListInterviewsQueryKey(projectId, params) } });
  const latest = useLatest(projectId);
  const assumptions = latest.analysis?.assumptions ?? [];
  const items = q.data?.data.items ?? [];

  return (
    <div className="space-y-6">
      <SectionHead
        eyebrow="Customer discovery"
        title="Interviews"
        aside={<Button onClick={() => setCreating(true)} disabled={latest.missing} data-testid="button-new-interview"><Plus className="mr-1.5 h-4 w-4" />New interview</Button>}
      />
      {latest.missing && (
        <EmptyState mark="v0" title="Analyze before interviewing" body={<>Questions are mapped to hypotheses from the latest analysis. <Link href={`/projects/${projectId}`} className="text-accent underline">Run an analysis first.</Link></>} />
      )}
      {latest.failed && <ErrorPanel error={latest.q.error} onRetry={() => latest.q.refetch()} title="Could not load hypotheses for mapping" />}
      {q.isLoading ? (
        <RowsSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load interviews" />
      ) : items.length === 0 ? (
        !latest.missing && <EmptyState mark="Q" title="No interviews yet" body="Create a session for each conversation. You will get non-leading questions about past behaviour, mapped to the riskiest hypotheses." action={<Button onClick={() => setCreating(true)}>Create interview</Button>} />
      ) : (
        <ul className="space-y-3">
          {items.map((iv, i) => <InterviewCard key={iv.id} iv={iv} assumptions={assumptions} defaultOpen={i === 0 && page === 1} />)}
        </ul>
      )}
      <Pager page={page} setPage={setPage} count={items.length} limit={PAGE_SIZE} label="Interviews pagination" />
      <CreateInterviewDialog projectId={projectId} open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function CreateInterviewDialog({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [alias, setAlias] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useCreateInterview();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = alias.trim();
    if (!v || v.length > 150) return;
    m.mutate(
      { id: projectId, data: { participant: v } },
      {
        onSuccess: (res) => {
          qc.invalidateQueries({ queryKey: getListInterviewsQueryKey(projectId) });
          toast({ title: 'Interview created', description: `${res.data.questions.length} mapped questions ready.` });
          setAlias('');
          onOpenChange(false);
        },
      },
    );
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) m.reset(); onOpenChange(o); }}>
      <DialogContent className="bg-card">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <p className="eyebrow">New session</p>
            <DialogTitle className="font-display text-2xl">Who are you talking to?</DialogTitle>
            <DialogDescription>Use an alias such as "Clinic ops lead, Leeds". Avoid names, emails or sensitive personal details; this workspace is not private yet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <div className="flex justify-between"><Label htmlFor="alias">Participant alias</Label><Counter value={alias.length} max={150} /></div>
            <Input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={150} required className="bg-background" data-testid="input-participant" />
          </div>
          <InlineError error={m.error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!alias.trim() || m.isPending} data-testid="button-create-interview">{m.isPending ? 'Generating questions...' : 'Create interview'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InterviewCard({ iv, assumptions, defaultOpen }: { iv: Interview; assumptions: Assumption[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const byId = new Map(assumptions.map((a) => [a.id, a]));
  return (
    <li className="rise rounded-md border border-card-border bg-card" data-testid={`card-interview-${iv.id}`}>
      <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(!open)} aria-expanded={open} data-testid={`button-toggle-interview-${iv.id}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary"><UserRound className="h-4 w-4" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg">{iv.participant}</span>
          <span className="font-mono text-[10.5px] text-muted-foreground">{fmtDate(iv.createdAt)} / {iv.questions.length} questions</span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="grid gap-6 border-t border-foreground/10 p-4 lg:grid-cols-2">
          <section aria-label="Mapped questions">
            <div className="mb-2 flex items-center justify-between"><p className="eyebrow">Question script</p><AiLabel /></div>
            <ol className="space-y-3">
              {iv.questions.map((qn, i) => {
                const a = byId.get(qn.assumptionId);
                return (
                  <li key={i} className="border-l-2 border-accent/50 pl-3 text-sm">
                    <p className="font-medium leading-snug">{qn.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground"><span className="eyebrow">Listen for </span>{qn.listenFor}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Tests: {a ? a.description : <span className="font-mono">hypothesis {qn.assumptionId.slice(0, 8)} (from an earlier analysis)</span>}</p>
                  </li>
                );
              })}
            </ol>
          </section>
          <NotesPanel interviewId={iv.id} assumptions={assumptions} />
        </div>
      )}
    </li>
  );
}

function NotesPanel({ interviewId, assumptions }: { interviewId: string; assumptions: Assumption[] }) {
  const [page, setPage] = useState(1);
  const [notes, setNotes] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [flash, setFlash] = useState(0);
  const params = { page, limit: PAGE_SIZE };
  const q = useListFeedback(interviewId, params, { query: { enabled: !!interviewId, queryKey: getListFeedbackQueryKey(interviewId, params) } });
  const m = useAddFeedback();
  const qc = useQueryClient();
  const len = notes.trim().length;
  const valid = len >= 10 && notes.length <= 30000 && links.length <= 30;
  const items = q.data?.data.items ?? [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    m.mutate(
      { id: interviewId, data: links.length ? { notes, assumptionIds: links } : { notes } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListFeedbackQueryKey(interviewId) });
          for (const analysisId of new Set(assumptions.map((a) => a.analysisId))) {
            qc.invalidateQueries({ queryKey: getListAssumptionsQueryKey(analysisId) });
          }
          setPage(1);
          setNotes('');
          setLinks([]);
          setFlash((n) => n + 1);
        },
      },
    );
  };

  return (
    <section aria-label="Raw notes" className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor={`notes-${interviewId}`} className="eyebrow">Raw notes, stored unchanged</Label>
          <Counter value={notes.length} max={30000} min={10} />
        </div>
        <Textarea id={`notes-${interviewId}`} value={notes} disabled={m.isPending} onChange={(e) => setNotes(e.target.value)} className="min-h-36 bg-background font-mono text-[13px]" placeholder="What did they actually do last time? Write their words, not your interpretation." data-testid="input-notes" />
        {assumptions.length > 0 && (
          <fieldset className="rounded border border-foreground/10 p-2">
            <legend className="px-1 text-[11px] text-muted-foreground">Associate with hypotheses (neutral link, not a supporting judgment) {links.length}/30</legend>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {assumptions.map((a) => {
                const on = links.includes(a.id);
                return (
                  <label key={a.id} className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-xs hover:bg-secondary">
                    <Checkbox checked={on} disabled={m.isPending || (!on && links.length >= 30)} onCheckedChange={(c) => setLinks(c ? [...links, a.id] : links.filter((x) => x !== a.id))} className="mt-0.5" data-testid={`checkbox-link-${a.id}`} />
                    <span>{a.description}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <InlineError error={m.error} />
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={!valid || m.isPending} data-testid="button-save-notes">{m.isPending ? 'Saving...' : 'Save notes'}</Button>
          {flash > 0 && <span key={flash} className="saved-flash text-xs text-[hsl(158_40%_28%)]" role="status">Saved to the record</span>}
          {len > 0 && len < 10 && <span className="text-xs text-muted-foreground">Needs at least 10 characters.</span>}
        </div>
      </form>
      <div>
        <p className="eyebrow mb-2">Saved notes</p>
        {q.isLoading ? (
          <RowsSkeleton rows={2} />
        ) : q.isError ? (
          <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load notes" />
        ) : items.length === 0 ? (
          <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">No notes recorded for this conversation yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((f) => (
              <li key={f.id} className="rounded border border-foreground/10 bg-background p-3" data-testid={`note-${f.id}`}>
                <p className="mb-1 font-mono text-[10px] text-muted-foreground">{fmtDate(f.createdAt)} / {f.notes.length.toLocaleString()} chars</p>
                <p className="mb-1 break-all font-mono text-[10px] text-muted-foreground">Feedback reference: {f.id}</p>
                <p className="max-h-60 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed">{f.notes}</p>
              </li>
            ))}
          </ul>
        )}
        <Pager page={page} setPage={setPage} count={items.length} limit={PAGE_SIZE} label="Notes pagination" />
      </div>
    </section>
  );
}
