import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ResourceListItem } from '@workspace/api-client-react';
import { ResourceSaveControls } from '@/components/resource-library/save-controls';
import { AiTag, ExternalLinkSafe } from '@/components/resource-search/detail';
import { CATEGORY_META, fmtWhen } from '@/lib/resource-search';
import { backendScore, readRanking } from '@/lib/resource-ranking';
import { RecommendationReason } from './reason';

export function RecommendationCard({ projectId, item, position, onOpen }: {
  projectId: string; item: ResourceListItem; position: number; onOpen: () => void;
}) {
  const { resource: r, recommendation: rec } = item;
  const [why, setWhy] = useState(false);
  const ranking = rec ? readRanking(rec.ranking) : null;
  const rank = rec ? backendScore(rec.rankScore) : null;
  const rel = rec ? backendScore(rec.relevanceScore) : null;
  const panelId = `why-panel-${r.id}`;
  return (
    <article className="lift flex h-full flex-col rounded-lg border border-[#1F3D2B]/12 bg-[#FBF7EE] p-4" data-testid={`recommendation-card-${r.id}`}>
      <div className="flex items-start gap-3">
        <span className="pt-1 font-mono text-xs text-[#1F3D2B]/40" aria-label={`Server position ${position}`}>{String(position).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">
            <span>{CATEGORY_META[r.category]?.label ?? r.category}</span><span>/</span><span className="break-all">{r.provider}</span>
          </p>
          <button type="button" onClick={onOpen} className="min-h-8 break-words text-left font-display text-lg leading-tight text-[#1F3D2B] hover:underline" data-testid={`recommendation-open-${r.id}`}>{r.name}</button>
          <p className="mt-1 line-clamp-3 break-words text-xs text-[#1F3D2B]/70">{r.description || 'No description reported by source.'}</p>
        </div>
        {rec && ranking?.documentedRank && rank !== null && (
          <div className="shrink-0 rounded-md bg-[#1F3D2B] px-2.5 py-1.5 text-center text-[#E8DCC4]" data-testid={`recommendation-rank-${r.id}`} title="Server rank at search time">
            <p className="font-mono text-[9px] uppercase tracking-wider opacity-70">Rank</p>
            <p className="font-mono text-base tabular-nums leading-none">{rank}</p>
          </div>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-0.5 font-mono text-[10px] text-[#1F3D2B]/60 sm:grid-cols-3">
        <div className="min-w-0 break-words"><dt className="inline">License </dt><dd className="inline">{r.license ?? 'Unknown'}</dd></div>
        <div className="min-w-0 break-words"><dt className="inline">Lang </dt><dd className="inline">{r.language ?? 'Unknown'}</dd></div>
        <div className="min-w-0 break-words"><dt className="inline">Snapshot updated </dt><dd className="inline">{r.sourceUpdatedAt ? fmtWhen(r.sourceUpdatedAt).split(',')[0] : 'Unknown'}</dd></div>
      </dl>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-[#1F3D2B]/65" aria-label="Source-reported signals, not ranking inputs">
        {(['stars', 'forks', 'downloads', 'likes'] as const).map((key) => {
          const value = r.qualitySignals[key];
          return typeof value === 'number' && Number.isFinite(value) ? <span key={key}>{value.toLocaleString()} {key}</span> : null;
        })}
        {typeof r.qualitySignals.documentation === 'boolean' && <span>Documentation reported: {r.qualitySignals.documentation ? 'yes' : 'no'}</span>}
        {typeof r.qualitySignals.archived === 'boolean' && <span>Source archived flag: {r.qualitySignals.archived ? 'yes' : 'no'}</span>}
      </div>
      {rec ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#1F3D2B]/70">
          <span>Relevance <span className="font-mono tabular-nums text-[#1F3D2B]">{rel ?? 'Unknown'}</span></span>
          {!ranking?.documentedRank && <span className="italic">Rank meaning not documented for this row</span>}
          {rec.explanation && <span className="ml-auto"><AiTag /></span>}
        </div>
      ) : <p className="mt-2 text-[11px] italic text-[#1F3D2B]/55">No ranking snapshot for this item.</p>}
      {rec && (
        <div className="mt-3">
          <button type="button" aria-expanded={why} aria-controls={panelId} onClick={() => setWhy((v) => !v)} className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-[#1F3D2B] underline-offset-4 hover:underline" data-testid={`recommendation-why-${r.id}`}>
            Why this resource?<ChevronDown className={`h-3.5 w-3.5 transition-transform ${why ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {why && <div id={panelId} className="rise mt-2 border-t border-[#1F3D2B]/10 pt-3"><RecommendationReason rec={rec} rid={r.id} /></div>}
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
        <ExternalLinkSafe url={r.url} testId={`link-recommendation-external-${r.id}`} />
        <ResourceSaveControls projectId={projectId} resource={r} knownSaved={item.saved} compact />
      </div>
    </article>
  );
}
