import type { ProviderStatus } from '@workspace/api-client-react';
import { cn } from '@/lib/utils';

const tone = (s: string) => {
  const u = s.toUpperCase();
  if (u === 'OK' || u === 'SUCCESS' || u === 'COMPLETED') return 'border-[#1F3D2B]/40 text-[#1F3D2B]';
  if (u === 'DISABLED' || u === 'SKIPPED' || u === 'NOT_CONFIGURED') return 'border-[#1F3D2B]/15 text-[#1F3D2B]/55';
  return 'border-destructive/50 text-destructive';
};

/** Status as reported by the server. Counts are pre-ranking retrieval counts. */
export function ProviderStrip({ statuses, idPrefix = 'provider' }: { statuses: ProviderStatus[]; idPrefix?: string }) {
  if (statuses.length === 0) return <p className="text-xs italic text-[#1F3D2B]/60">No provider statuses reported.</p>;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Provider statuses">
      {statuses.map((p) => (
        <li key={p.provider} className="min-w-0 max-w-full rounded-md border border-[#1F3D2B]/12 bg-[#FBF7EE] px-2.5 py-1.5 text-xs" data-testid={`${idPrefix}-${p.provider}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{p.provider}</span>
            <span className={cn('rounded-sm border px-1.5 font-mono text-[10px] uppercase', tone(p.status))}>{p.status}</span>
            <span className="font-mono text-[10px] text-[#1F3D2B]/60">{p.count} retrieved{p.queries !== undefined ? ` / ${p.queries} queries` : ''}</span>
          </div>
          {p.error && <p className="mt-0.5 break-words text-[11px] text-destructive">{p.error}</p>}
        </li>
      ))}
    </ul>
  );
}
