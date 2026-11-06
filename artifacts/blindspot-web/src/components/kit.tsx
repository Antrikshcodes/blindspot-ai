import { type ReactNode } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, RotateCw, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { explainError, humanize, readError, safeHttps, type ApiErr } from '@/lib/api';

export function ErrorPanel({ error, onRetry, title = 'Request failed' }: { error: unknown; onRetry?: () => void; title?: string }) {
  const e: ApiErr = readError(error);
  const hint = explainError(e);
  return (
    <div role="alert" className="rise rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm" data-testid="error-panel">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-destructive">{title}</p>
          <p className="text-foreground/90">{e.message}</p>
          {hint && <p className="text-muted-foreground">{hint}</p>}
          <p className="font-mono text-[11px] text-muted-foreground">
            {e.status !== undefined && <>HTTP {e.status} </>}
            {e.code && <>/ {e.code} </>}
            {e.requestId && <>/ request {e.requestId}</>}
          </p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} data-testid="button-retry">
            <RotateCw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
        )}
      </div>
    </div>
  );
}

export function InlineError({ error }: { error: unknown }) {
  if (!error) return null;
  const e = readError(error);
  const hint = explainError(e);
  return (
    <p role="alert" className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      {e.code ? <span className="font-mono">{e.code}: </span> : null}
      {e.message}
      {hint ? <span className="block text-muted-foreground">{hint}</span> : null}
      {e.requestId ? <span className="block font-mono text-[10px] text-muted-foreground">request {e.requestId}</span> : null}
    </p>
  );
}

export function RowsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full bg-muted" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

export function EmptyState({ title, body, action, mark = 'N/A' }: { title: string; body: ReactNode; action?: ReactNode; mark?: string }) {
  return (
    <div className="rise hatch relative overflow-hidden rounded-md border border-dashed border-foreground/20 px-6 py-10 text-center">
      <div className="mx-auto mb-3 inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-foreground/25 bg-card px-2 font-mono text-[10px] tracking-widest text-muted-foreground">
        {mark}
      </div>
      <h3 className="font-display text-xl">{title}</h3>
      <div className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{body}</div>
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Pager({ page, setPage, count, limit, label }: { page: number; setPage: (p: number) => void; count: number; limit: number; label?: string }) {
  if (page === 1 && count < limit) return null;
  return (
    <nav className="mt-4 flex items-center justify-between gap-2 text-xs" aria-label={label ?? 'Pagination'}>
      <span className="font-mono text-muted-foreground">Page {page}</span>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="button-page-prev">
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </Button>
        <Button size="sm" variant="outline" disabled={count < limit} onClick={() => setPage(page + 1)} data-testid="button-page-next">
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}

const STATUS_STYLES: Record<string, string> = {
  UNTESTED: 'bg-muted text-muted-foreground border-foreground/15',
  TESTING: 'bg-[hsl(40_80%_88%)] text-[hsl(32_70%_28%)] border-[hsl(40_60%_60%)]',
  SUPPORTED: 'bg-[hsl(158_30%_88%)] text-[hsl(158_40%_22%)] border-[hsl(158_25%_55%)]',
  INVALIDATED: 'bg-[hsl(8_70%_92%)] text-[hsl(4_60%_36%)] border-[hsl(8_55%_62%)]',
  INCONCLUSIVE: 'bg-[hsl(262_20%_90%)] text-[hsl(262_22%_32%)] border-[hsl(262_15%_62%)]',
  PLANNED: 'bg-muted text-muted-foreground border-foreground/15',
  IN_PROGRESS: 'bg-[hsl(40_80%_88%)] text-[hsl(32_70%_28%)] border-[hsl(40_60%_60%)]',
  COMPLETED: 'bg-[hsl(208_30%_88%)] text-[hsl(208_40%_22%)] border-[hsl(208_25%_55%)]',
  ABANDONED: 'bg-[hsl(8_20%_90%)] text-[hsl(8_20%_35%)] border-[hsl(8_15%_65%)] line-through',
  CONSIDERING: 'bg-muted text-muted-foreground border-foreground/15',
  TRYING: 'bg-[hsl(40_80%_88%)] text-[hsl(32_70%_28%)] border-[hsl(40_60%_60%)]',
  INTEGRATED: 'bg-[hsl(158_30%_88%)] text-[hsl(158_40%_22%)] border-[hsl(158_25%_55%)]',
  HIGH: 'bg-accent text-accent-foreground border-accent',
  CRITICAL: 'bg-destructive text-destructive-foreground border-destructive',
  MEDIUM: 'bg-[hsl(40_80%_88%)] text-[hsl(32_70%_28%)] border-[hsl(40_60%_60%)]',
  LOW: 'bg-muted text-muted-foreground border-foreground/15',
  OK: 'bg-[hsl(158_30%_88%)] text-[hsl(158_40%_22%)] border-[hsl(158_25%_55%)]',
  FAILED: 'bg-[hsl(8_70%_92%)] text-[hsl(4_60%_36%)] border-[hsl(8_55%_62%)]',
  DISABLED: 'bg-muted text-muted-foreground border-foreground/15',
  UNAVAILABLE: 'bg-[hsl(8_70%_92%)] text-[hsl(4_60%_36%)] border-[hsl(8_55%_62%)]',
};

export function Chip({ value, className, children }: { value: string; className?: string; children?: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
        STATUS_STYLES[value] ?? 'bg-secondary text-secondary-foreground border-foreground/15',
        className,
      )}
    >
      {children ?? value.replace(/_/g, ' ')}
    </span>
  );
}

export function AiLabel({ review = true }: { review?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-dashed border-accent/60 bg-accent/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
      <Sparkles className="h-3 w-3" aria-hidden /> AI-generated{review ? ' / review required' : ''}
    </span>
  );
}

export function SectionHead({ eyebrow, title, aside }: { eyebrow: string; title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-foreground/10 pb-2">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="font-display text-2xl leading-tight">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export function SafeLink({ url, children }: { url: string; children?: ReactNode }) {
  const safe = safeHttps(url);
  if (!safe) return <span className="font-mono text-xs text-muted-foreground">Link withheld (not HTTPS)</span>;
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline-offset-4 hover:underline" data-testid="link-source">
      {children ?? new URL(safe).host} <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}

function isPlainObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function ValueView({ value, depth = 0 }: { value: unknown; depth?: number }): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="italic text-muted-foreground">Unknown</span>;
  if (typeof value === 'boolean') return <span className="font-mono">{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'number') return <span className="font-mono tabular-nums">{Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)}</span>;
  if (typeof value === 'string') {
    if (/^https:\/\//.test(value)) return <SafeLink url={value} />;
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return <span className="font-mono">{new Date(value).toLocaleString()}</span>;
    return <span>{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="italic text-muted-foreground">None</span>;
    if (value.every((v) => typeof v !== 'object' || v === null))
      return (
        <span className="flex flex-wrap gap-1">
          {value.map((v, i) => (
            <span key={i} className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px]">
              {v === null ? 'Unknown' : String(v)}
            </span>
          ))}
        </span>
      );
    return (
      <div className="space-y-1.5">
        {value.map((v, i) => (
          <div key={i} className="rounded border border-foreground/10 p-2">
            <ValueView value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  if (isPlainObj(value)) return <KV data={value} depth={depth + 1} />;
  return <span>{String(value)}</span>;
}

export function KV({ data, depth = 0, className }: { data: Record<string, unknown>; depth?: number; className?: string }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <p className="text-xs italic text-muted-foreground">No fields reported.</p>;
  return (
    <dl className={cn('grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 gap-y-1.5 text-xs', depth > 0 && 'pl-1', className)}>
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{humanize(k)}</dt>
          <dd className="min-w-0 break-words">
            <ValueView value={v} depth={depth} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Counter({ value, max, min }: { value: number; max: number; min?: number }) {
  const bad = value > max || (min !== undefined && value > 0 && value < min);
  return (
    <span className={cn('font-mono text-[10px] tabular-nums', bad ? 'text-destructive' : 'text-muted-foreground')}>
      {value.toLocaleString()} / {max.toLocaleString()}
      {min !== undefined ? ` (min ${min})` : ''}
    </span>
  );
}
