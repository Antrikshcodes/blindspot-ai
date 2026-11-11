import { useRef, type FormEvent } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { useAddFeedback, type Assumption, type Feedback } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Counter, InlineError } from '@/components/kit';
import type { NoteDraft } from '@/hooks/use-discovery';

const MIN = 10;
const MAX = 30000;
const MAX_LINKS = 30;

export function FeedbackComposer({
  interviewId,
  assumptions,
  draft,
  setDraft,
  onSaved,
}: {
  interviewId: string;
  assumptions: Assumption[];
  draft: NoteDraft;
  setDraft: (d: NoteDraft) => void;
  onSaved: (f: Feedback) => void;
}) {
  const inFlight = useRef(false);
  const mutationKey = ['discovery', 'add-feedback', interviewId];
  const pending = useIsMutating({ mutationKey }) > 0;
  const m = useAddFeedback({ mutation: {
    mutationKey,
    onSuccess: (res) => {
      setDraft({ notes: '', links: [] });
      onSaved(res.data);
    },
    onSettled: () => { inFlight.current = false; },
  } });
  const len = draft.notes.trim().length;
  const problem = len === 0 ? null : len < MIN ? `Needs at least ${MIN} characters.` : len > MAX ? `Over the ${MAX.toLocaleString()} character limit.` : null;
  const valid = len >= MIN && len <= MAX && draft.links.length <= MAX_LINKS;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || inFlight.current || pending) return;
    inFlight.current = true;
    const links = draft.links;
    m.mutate({ id: interviewId, data: links.length ? { notes: draft.notes, assumptionIds: links } : { notes: draft.notes } });
  };

  const toggle = (id: string, on: boolean) =>
    setDraft({ ...draft, links: on ? [...draft.links, id] : draft.links.filter((x) => x !== id) });

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-[#1F3D2B]/15 bg-[#FBF8F1] p-4" aria-label="Record notes">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label htmlFor={`notes-${interviewId}`} className="eyebrow text-[#1F3D2B]">
          Raw notes, stored unchanged <span aria-hidden className="text-[#8B5CF6]">*</span>
        </Label>
        <Counter value={len} max={MAX} min={MIN} />
      </div>
      <Textarea
        id={`notes-${interviewId}`}
        value={draft.notes}
        disabled={pending}
        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        aria-invalid={!!problem}
        aria-describedby={`notes-hint-${interviewId}`}
        className="min-h-40 resize-y border-[#1F3D2B]/20 bg-[#FFFDF8] font-mono text-[13px] leading-relaxed"
        placeholder="What did they actually do last time? Write their words, not your interpretation."
        data-testid="input-notes"
      />
      <p id={`notes-hint-${interviewId}`} className="text-[11px] text-[#1F3D2B]/65">
        One free-text field. Mark quotes and your own observations however you like; the backend stores the text as written (outer whitespace trimmed).
      </p>
      {assumptions.length > 0 && (
        <fieldset className="rounded border border-[#1F3D2B]/15 p-2" disabled={pending}>
          <legend className="px-1 text-[11px] text-[#1F3D2B]/75">
            Associate with hypotheses ({draft.links.length}/{MAX_LINKS}). Creates a neutral, unverified link, not support.
          </legend>
          <div className="max-h-44 space-y-0.5 overflow-y-auto">
            {assumptions.map((a) => {
              const on = draft.links.includes(a.id);
              return (
                <label key={a.id} className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-xs hover:bg-[#E8DCC4]/50">
                  <Checkbox
                    checked={on}
                    disabled={pending || (!on && draft.links.length >= MAX_LINKS)}
                    onCheckedChange={(c) => toggle(a.id, !!c)}
                    className="mt-0.5"
                    data-testid={`checkbox-link-${a.id}`}
                  />
                  <span className="min-w-0 break-words">{a.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      <InlineError error={m.error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={!valid || pending} className="bg-[#1F3D2B] text-[#F6F1E6] hover:bg-[#1F3D2B]/90" data-testid="button-save-notes">
          {pending ? 'Saving...' : 'Save notes'}
        </Button>
        {problem && <span className="text-xs text-destructive" role="status">{problem}</span>}
      </div>
    </form>
  );
}
