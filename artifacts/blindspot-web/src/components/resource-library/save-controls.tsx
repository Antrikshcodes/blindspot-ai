import { useId, useState } from 'react';
import { Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';
import type { Resource, ResourceSaveInputStatus, SavedResource } from '@workspace/api-client-react';
import { useResourceSaving, RESOURCE_STATUSES } from '@/hooks/use-resource-saving';
import { InlineError } from '@/components/kit';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { STATUS_LABEL, fmtDay } from '@/lib/resource-library';

export function ResourceSaveControls({ projectId, resource, knownSaved, compact = false }: {
  projectId: string; resource: Resource; knownSaved: SavedResource | null; compact?: boolean;
}) {
  const rid = resource.id;
  const statusId = useId();
  const { saved, busy, error, save, changeStatus, remove } = useResourceSaving(projectId, rid, knownSaved);
  const [confirming, setConfirming] = useState(false);
  const known = !!saved && (RESOURCE_STATUSES as string[]).includes(saved.status);

  return (
    <div className={cn('min-w-0 space-y-1.5', compact ? 'text-xs' : 'text-sm')} onClick={(e) => e.stopPropagation()}>
      {saved ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#1F3D2B] px-3 font-mono text-[10.5px] uppercase tracking-wider text-[#E8DCC4]" data-testid={`saved-state-${rid}`}>
            <BookmarkCheck className="h-3.5 w-3.5" aria-hidden />Saved{!compact && <span className="normal-case tracking-normal text-[#E8DCC4]/75"> {fmtDay(saved.createdAt)}</span>}
          </span>
          <label className="sr-only" htmlFor={statusId}>Project status for {resource.name}</label>
          <select
            id={statusId}
            value={saved.status}
            disabled={busy}
            onChange={(e) => changeStatus(e.target.value as ResourceSaveInputStatus)}
            className="min-h-9 rounded-full border border-[#1F3D2B]/25 bg-[#FBF7EE] px-2.5 font-mono text-[11px] uppercase tracking-wide text-[#1F3D2B] disabled:opacity-60"
            data-testid={`resource-status-${rid}`}
          >
            {!known && <option value={saved.status} disabled>{saved.status} (unrecognised)</option>}
            {RESOURCE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-[11px] text-[#1F3D2B]/70 underline-offset-4 hover:text-destructive hover:underline disabled:opacity-50"
            data-testid={`remove-resource-${rid}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#1F3D2B]/35 bg-[#FBF7EE] px-3.5 text-[12px] font-medium text-[#1F3D2B] transition-colors hover:bg-[#1F3D2B] hover:text-[#E8DCC4] disabled:opacity-60"
          data-testid={`save-resource-${rid}`}
        >
          <Bookmark className="h-3.5 w-3.5" aria-hidden />{busy ? 'Saving...' : 'Save to project'}
        </button>
      )}
      {busy && <p className="font-mono text-[10px] text-[#1F3D2B]/60" role="status">Waiting for the server...</p>}
      {!confirming && <InlineError error={error} />}

      <AlertDialog open={confirming} onOpenChange={(o) => { if (!busy) setConfirming(o); }}>
        <AlertDialogContent className="bg-[#F6F0E2]" data-testid="remove-resource-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-[#1F3D2B] break-words">Remove from this project's library?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              Only this project's association with <strong className="text-[#1F3D2B]">{resource.name}</strong> is removed. The shared resource record, its search history and any other project's saves remain untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <InlineError error={error} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} data-testid="cancel-remove-resource">Keep it</AlertDialogCancel>
            <button
              type="button"
              disabled={busy}
              onClick={() => remove(() => setConfirming(false))}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              data-testid="confirm-remove-resource"
            >
              {busy ? 'Removing...' : error ? 'Retry removal' : 'Remove association'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
