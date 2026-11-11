import { useState } from 'react';
import { Link } from 'wouter';
import {
  useListInterviews, useListFeedback,
  getListInterviewsQueryKey, getListFeedbackQueryKey,
  type Interview,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState, ErrorPanel, Pager, RowsSkeleton } from '@/components/kit';
import { PAGE_SIZE, fmtDate } from '@/lib/api';

/** The API gives a feedback ID, not its interview. Resolve it only from real,
 * user-requested pages; never silently scan every interview in the project. */
export function SourceBrowser({ projectId, feedbackId, onClose }: {
  projectId: string; feedbackId: string; onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Interview | null>(null);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const interviewParams = { page, limit: PAGE_SIZE };
  const feedbackParams = { page: feedbackPage, limit: PAGE_SIZE };
  const interviews = useListInterviews(projectId, interviewParams, {
    query: { enabled: !!projectId, queryKey: getListInterviewsQueryKey(projectId, interviewParams) },
  });
  const feedback = useListFeedback(selected?.id ?? '', feedbackParams, {
    query: { enabled: !!selected, queryKey: getListFeedbackQueryKey(selected?.id ?? '', feedbackParams) },
  });
  const sessions = interviews.data?.data.items ?? [];
  const notes = feedback.data?.data.items ?? [];
  const match = notes.find((note) => note.id === feedbackId);
  const target = selected && match
    ? `/projects/${projectId}/interviews?${new URLSearchParams({
      interviewId: selected.id, interviewPage: String(page),
      feedbackId: match.id, feedbackPage: String(feedbackPage),
    })}` : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto bg-card" data-testid="source-browser">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Locate the original feedback</DialogTitle>
          <DialogDescription>
            The evidence provides a feedback reference, but the API has no direct
            source lookup. Choose an interview and browse its note pages to find
            the exact reference. Nothing is inferred from a similar quote.
          </DialogDescription>
        </DialogHeader>
        <p className="break-all rounded border bg-secondary/40 p-2 font-mono text-xs">
          Feedback reference: {feedbackId}
        </p>
        <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section aria-label="Choose a source interview" className="min-w-0 space-y-3">
            <h3 className="eyebrow">Interviews / page {page}</h3>
            {interviews.isLoading ? <RowsSkeleton rows={3} /> : interviews.isError ? (
              <ErrorPanel error={interviews.error} onRetry={() => interviews.refetch()} title="Could not load source interviews" />
            ) : sessions.length === 0 ? (
              <EmptyState mark="—" title="No sessions on this page" body="Try the previous page or refresh the project’s interviews." />
            ) : (
              <ul className="space-y-2">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <Button
                      variant={selected?.id === session.id ? 'secondary' : 'outline'}
                      className="h-auto w-full justify-start whitespace-normal break-words text-left"
                      onClick={() => { setSelected(session); setFeedbackPage(1); }}
                      aria-pressed={selected?.id === session.id}
                      data-testid={`source-interview-${session.id}`}
                    >
                      {session.participant}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Pager page={page} setPage={(next) => { setPage(next); setSelected(null); setFeedbackPage(1); }} count={sessions.length} limit={PAGE_SIZE} label="Source interviews pagination" />
          </section>
          <section aria-label="Original feedback lookup" className="min-w-0 space-y-3">
            <h3 className="eyebrow">Original note / page {feedbackPage}</h3>
            {!selected ? <p className="text-sm text-muted-foreground">Select a conversation to load its notes.</p> : feedback.isLoading ? (
              <RowsSkeleton rows={3} />
            ) : feedback.isError ? (
              <ErrorPanel error={feedback.error} onRetry={() => feedback.refetch()} title="Could not load source notes" />
            ) : match ? (
              <article className="space-y-3 rounded border border-accent/40 bg-accent/5 p-3" data-testid="source-feedback-match">
                <p className="text-sm font-medium">Exact feedback reference found</p>
                <p className="text-xs text-muted-foreground">With {selected.participant} · {fmtDate(match.createdAt)}</p>
                <blockquote className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-sm">{match.notes}</blockquote>
                {target && <Button asChild size="sm"><Link href={target} onClick={onClose} data-testid="link-open-source-interview">Open this interview and note</Link></Button>}
              </article>
            ) : (
              <div className="space-y-3">
                <p role="status" className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                  The requested feedback reference is not on this page. Browse another note page or choose a different interview.
                </p>
                {notes.length > 0 && <ul className="space-y-2">
                  {notes.map((note) => <li key={note.id} className="rounded border p-2 text-xs">
                    <p className="break-all font-mono text-muted-foreground">{note.id}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words">{note.notes.slice(0, 180)}{note.notes.length > 180 ? '…' : ''}</p>
                  </li>)}
                </ul>}
              </div>
            )}
            {selected && <Pager page={feedbackPage} setPage={setFeedbackPage} count={notes.length} limit={PAGE_SIZE} label="Source notes pagination" />}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
