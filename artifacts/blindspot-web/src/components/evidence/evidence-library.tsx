import { motion } from 'framer-motion';
import { Search, RotateCcw } from 'lucide-react';
import type { Assumption, Evidence, EvidenceSentiment } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { fmtDay } from '@/lib/api';
import { DEFAULT_FILTERS, isFiltered, isModelSuggestion, originLabel, SENTIMENT_LABEL, type EvidenceFilters } from '@/lib/evidence';
import { useStagger } from '@/components/discovery/motion';

export const SENT_STYLE: Record<EvidenceSentiment, string> = {
  SUPPORTING: 'border-[#1F3D2B]/30 bg-[#1F3D2B]/8 text-[#1F3D2B]',
  INVALIDATING: 'border-destructive/40 bg-destructive/5 text-destructive',
  NEUTRAL: 'border-[#1F3D2B]/20 bg-[#E8DCC4]/50 text-[#1F3D2B]/80',
};

export function SentimentTag({ s }: { s: EvidenceSentiment }) {
  return <span className={`rounded-sm border px-1.5 py-0.5 text-[10.5px] ${SENT_STYLE[s]}`}>{SENTIMENT_LABEL[s]}</span>;
}
export function OriginTag({ origin }: { origin: string }) {
  return isModelSuggestion(origin)
    ? <span className="rounded-sm border border-[#8B5CF6]/40 bg-[#8B5CF6]/5 px-1.5 py-0.5 text-[10.5px] text-[#5B33C9]">{originLabel(origin)}</span>
    : <span className="rounded-sm border border-[#1F3D2B]/20 px-1.5 py-0.5 text-[10.5px] text-[#1F3D2B]/80">{originLabel(origin)}</span>;
}

const sel = 'h-9 min-w-0 rounded-md border border-[#1F3D2B]/20 bg-[#FBF8F1] px-2 text-sm text-[#1F3D2B] focus:outline-none focus:ring-2 focus:ring-[#1F3D2B]/30';

export function EvidenceFiltersBar({ f, setF, origins, assumptions }: { f: EvidenceFilters; setF: (f: EvidenceFilters) => void; origins: string[]; assumptions: Assumption[] }) {
  return (
    <div className="grid gap-2 rounded-md border border-[#1F3D2B]/15 bg-[#E8DCC4]/35 p-3 sm:grid-cols-2">
      <label className="relative sm:col-span-2">
        <span className="sr-only">Search loaded evidence</span>
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[#1F3D2B]/50" aria-hidden />
        <input type="search" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} placeholder="Quote, reasoning, reference" className={`${sel} w-full pl-8`} data-testid="evidence-search" />
      </label>
      <label><span className="sr-only">Sentiment</span>
        <select value={f.sentiment} onChange={(e) => setF({ ...f, sentiment: e.target.value as EvidenceFilters['sentiment'] })} className={`${sel} w-full`} data-testid="evidence-sentiment-filter">
          <option value="ALL">All sentiment</option><option value="SUPPORTING">Leans supporting</option><option value="INVALIDATING">Leans challenging</option><option value="NEUTRAL">Neutral</option>
        </select>
      </label>
      <label><span className="sr-only">Origin</span>
        <select value={f.origin} onChange={(e) => setF({ ...f, origin: e.target.value })} className={`${sel} w-full`} data-testid="evidence-origin-filter">
          <option value="ALL">All origins</option>
          {origins.map((o) => <option key={o} value={o}>{originLabel(o)}</option>)}
        </select>
      </label>
      <label><span className="sr-only">Hypothesis</span>
        <select value={f.assumptionId} onChange={(e) => setF({ ...f, assumptionId: e.target.value })} className={`${sel} w-full`} data-testid="evidence-assumption-filter">
          <option value="ALL">All loaded hypotheses</option>
          {assumptions.map((a) => <option key={a.id} value={a.id}>{a.description.length > 60 ? `${a.description.slice(0, 60)}...` : a.description}</option>)}
        </select>
      </label>
      <label><span className="sr-only">Sort by creation date</span>
        <select value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value as EvidenceFilters['sort'] })} className={`${sel} w-full`} data-testid="evidence-sort">
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
        </select>
      </label>
      <Button variant="ghost" size="sm" className="h-9 text-[#1F3D2B]" disabled={!isFiltered(f)} onClick={() => setF(DEFAULT_FILTERS)} data-testid="evidence-reset-filters">
        <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden />Reset
      </Button>
    </div>
  );
}

export function EvidenceList({ records, selectedId, onSelect, label }: { records: Evidence[]; selectedId: string | null; onSelect: (id: string) => void; label: (id: string) => string }) {
  const stagger = useStagger();
  return (
    <ul className="space-y-2" aria-label="Evidence records">
      {records.map((e, i) => {
        const on = e.id === selectedId;
        return (
          <motion.li key={e.id} {...stagger(i)}>
            <button
              type="button"
              onClick={() => onSelect(e.id)}
              aria-pressed={on}
              className={`w-full rounded-md border p-3 text-left transition-colors ${on ? 'border-[#1F3D2B] bg-[#1F3D2B]/[0.04] ring-1 ring-[#1F3D2B]' : 'border-[#1F3D2B]/15 bg-[#FFFDF8] hover:border-[#1F3D2B]/40'}`}
              data-testid={`evidence-card-${e.id}`}
            >
              <blockquote className="line-clamp-3 whitespace-pre-wrap break-words font-display text-[15px] italic leading-snug text-[#1F3D2B]">"{e.quote}"</blockquote>
              <p className="mt-1.5 line-clamp-1 break-words text-xs text-[#1F3D2B]/65">{label(e.assumptionId)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <SentimentTag s={e.sentiment} />
                <OriginTag origin={e.origin} />
                <span className="ml-auto font-mono text-[10px] text-[#1F3D2B]/55">{fmtDay(e.createdAt)}</span>
              </div>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
