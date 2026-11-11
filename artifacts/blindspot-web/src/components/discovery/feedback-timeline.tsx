import { useState } from 'react';
import { motion } from 'framer-motion';
import { useListFeedback, getListFeedbackQueryKey, type Feedback, type Interview } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { ErrorPanel, Pager, RowsSkeleton } from '@/components/kit';
import { PAGE_SIZE, fmtDate } from '@/lib/api';
import { useStagger } from './motion';

const LONG = 700;

export function FeedbackTimeline({ interview, page, setPage, summaryAt }: { interview: Interview; page: number; setPage: (p: number) => void; summaryAt?: string | null }) {
  const params = { page, limit: PAGE_SIZE };
  const q = useListFeedback(interview.id, params, { query: { enabled: !!interview.id, queryKey: getListFeedbackQueryKey(interview.id, params) } });
  const items = q.data?.data.items ?? [];
  const stagger = useStagger();
  const exact = page === 1 && items.length < PAGE_SIZE;

  return (
    <section aria-label="Notes timeline" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow text-[#1F3D2B]">Recorded notes</p>
        {q.isSuccess && (
          <span className="font-mono text-[10.5px] text-[#1F3D2B]/65" data-testid="text-feedback-count">
            {exact ? `${items.length} ${items.length === 1 ? 'entry' : 'entries'}` : `${items.length} on page ${page}`}
          </span>
        )}
      </div>
      {q.isLoading ? (
        <RowsSkeleton rows={2} />
      ) : q.isError ? (
        <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load notes" />
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#1F3D2B]/25 bg-[#E8DCC4]/25 p-4 text-sm text-[#1F3D2B]/75">
          {page > 1 ? 'No more entries on this page.' : 'Nothing recorded for this conversation yet. Notes you save appear here, newest first as returned by the server.'}
        </div>
      ) : (
        <ol className="relative space-y-3 border-l border-[#1F3D2B]/20 pl-5">
          {items.map((f, i) => (
            <motion.li key={f.id} {...stagger(i)} className="relative">
              <span aria-hidden className="absolute -left-[25px] top-4 h-2.5 w-2.5 rounded-full border-2 border-[#F6F1E6] bg-[#1F3D2B]" />
              <Entry f={f} interview={interview} afterSummary={!!summaryAt && new Date(f.createdAt) > new Date(summaryAt)} />
            </motion.li>
          ))}
        </ol>
      )}
      <Pager page={page} setPage={setPage} count={items.length} limit={PAGE_SIZE} label="Notes pagination" />
    </section>
  );
}

function Entry({ f, interview, afterSummary }: { f: Feedback; interview: Interview; afterSummary: boolean }) {
  const long = f.notes.length > LONG;
  const [open, setOpen] = useState(!long);
  return (
    <article className="rounded-md border border-[#1F3D2B]/15 bg-[#FFFDF8] p-3.5 shadow-[0_1px_0_#1F3D2B14]" data-testid={`note-${f.id}`}>
      <header className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-[#1F3D2B]/70">
        <time dateTime={f.createdAt}>{fmtDate(f.createdAt)}</time>
        <span>{f.notes.length.toLocaleString()} chars</span>
        <span className="truncate">with {interview.participant}</span>
        {afterSummary && <span className="rounded-sm bg-[#8B5CF6]/10 px-1.5 text-[#6D3FE0]">Not in current summary</span>}
      </header>
      <div id={`note-body-${f.id}`} className={`relative ${open ? '' : 'max-h-40 overflow-hidden'}`}>
        <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-[#1A2A20]">{f.notes}</p>
        {!open && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#FFFDF8] to-transparent" />}
      </div>
      {long && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-7 px-2 text-xs text-[#1F3D2B]"
          aria-expanded={open}
          aria-controls={`note-body-${f.id}`}
          onClick={() => setOpen(!open)}
          data-testid={`button-expand-note-${f.id}`}
        >
          {open ? 'Collapse entry' : 'Show full entry'}
        </Button>
      )}
      <p className="mt-1 break-all font-mono text-[10px] text-[#1F3D2B]/50">Feedback reference: {f.id}</p>
    </article>
  );
}
