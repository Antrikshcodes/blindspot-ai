import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearch } from 'wouter';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Bookmark, BookmarkX } from 'lucide-react';
import {
  useSearchResources,
  useListResources,
  useGetResource,
  useSaveResource,
  useRemoveSavedResource,
  getListResourcesQueryKey,
  getGetResourceQueryKey,
  ResourceCategory,
  type Recommendation,
  type Resource,
  type ResourceSearch,
  type ResourceSaveInputStatus,
  type SavedResource,
  type ListResourcesParams,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { ProjectFrame } from '@/components/project-frame';
import { ResourceWorkspace } from '@/components/resource-search/workspace';
import { AiLabel, Chip, EmptyState, ErrorPanel, InlineError, KV, Pager, RowsSkeleton, SafeLink, SectionHead } from '@/components/kit';
import { PAGE_SIZE, fmtDate, fmtDay, humanize } from '@/lib/api';

export default function ResourcesPage() {
  const { id = '' } = useParams<{ id: string }>();
  const saved = new URLSearchParams(useSearch()).get('collection') === 'saved';
  return <ProjectFrame id={id}>{(p) => saved ? (
    <div className="space-y-4">
      <Link href={`/projects/${p.id}/resources`} className="text-sm underline">Back to Resource Intelligence</Link>
      <Resources projectId={p.id} initialTab="saved" />
    </div>
  ) : (
    <>
      <ResourceWorkspace key={p.id} projectId={p.id} />
      <Link href={`/projects/${p.id}/resources?collection=saved`} className="mt-6 inline-block text-xs text-muted-foreground underline">Open existing saved collection</Link>
    </>
  )}</ProjectFrame>;
}

type Item = { resource: Resource; recommendation?: Recommendation; saved?: SavedResource | null };
const CATS = Object.values(ResourceCategory);
const SAVE_STATUSES: ResourceSaveInputStatus[] = ['CONSIDERING', 'TRYING', 'INTEGRATED'];

function Resources({ projectId, initialTab = 'latest' }: { projectId: string; initialTab?: 'latest' | 'saved' }) {
  const [last, setLast] = useState<ResourceSearch | null>(null);
  const [tab, setTab] = useState<'latest' | 'saved'>(initialTab);
  const [detail, setDetail] = useState<Item | null>(null);
  return (
    <div className="space-y-8">
      {initialTab !== 'saved' && <SearchPanel projectId={projectId} onResult={(r) => { setLast(r); setTab('latest'); }} />}
      {last && <SearchMeta s={last} onOpen={setDetail} projectId={projectId} />}
      <section>
        <SectionHead
          eyebrow="Persisted"
          title="Collection"
          aside={
            <div role="tablist" className="flex rounded-md bg-secondary p-0.5 text-sm">
              {(['latest', 'saved'] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded px-3 py-1 transition-colors ${tab === t ? 'bg-card shadow-sm' : 'text-muted-foreground'}`} data-testid={`tab-resources-${t}`}>
                  {t === 'latest' ? 'Latest search' : 'Saved, all searches'}
                </button>
              ))}
            </div>
          }
        />
        <ListView key={tab} projectId={projectId} saved={tab === 'saved'} onOpen={setDetail} />
      </section>
      <DetailSheet item={detail} projectId={projectId} onClose={() => setDetail(null)} />
    </div>
  );
}

function SearchPanel({ projectId, onResult }: { projectId: string; onResult: (r: ResourceSearch) => void }) {
  const [mode, setMode] = useState<'auto' | 'query'>('query');
  const [query, setQuery] = useState('');
  const [langs, setLangs] = useState('');
  const [cats, setCats] = useState<ResourceCategory[]>([]);
  const [explain, setExplain] = useState(false);
  const qc = useQueryClient();
  const m = useSearchResources();
  const languages = langs.split(',').map((s) => s.trim()).filter(Boolean);
  const ok = (mode === 'auto' || (query.trim().length > 0 && query.length <= 150))
    && languages.length <= 5 && languages.every((language) => language.length <= 40);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    m.mutate(
      {
        id: projectId,
        data: {
          ...(mode === 'query' ? { query: query.trim() } : {}),
          ...(languages.length ? { languages } : {}),
          ...(cats.length ? { categories: cats } : {}),
          explain,
        },
      },
      {
        onSuccess: (res) => {
          qc.invalidateQueries({ queryKey: getListResourcesQueryKey(projectId) });
          onResult(res.data);
        },
      },
    );
  };
  return (
    <section className="rise rounded-md border border-card-border bg-card p-4 md:p-5">
      <p className="eyebrow">Resource intelligence</p>
      <h2 className="font-display text-2xl">Find real building blocks</h2>
      <p className="mt-1 max-w-2xl text-xs text-muted-foreground">Results come from live provider APIs (GitHub, Hugging Face, UCI, a reviewed docs catalog). The AI never invents links or metadata. Ranking is a transparent heuristic, not an endorsement.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div role="radiogroup" aria-label="Search mode" className="inline-grid grid-cols-2 gap-1 rounded-md bg-secondary p-1 text-sm">
          {(['query', 'auto'] as const).map((k) => (
            <button type="button" role="radio" aria-checked={mode === k} key={k} onClick={() => { setMode(k); if (k === 'auto') setExplain(true); }} className={`rounded px-3 py-1 ${mode === k ? 'bg-card shadow-sm' : 'text-muted-foreground'}`} data-testid={`search-mode-${k}`}>
              {k === 'query' ? 'Explicit query' : 'Automatic from analysis (AI)'}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
          {mode === 'query' ? (
            <div className="space-y-1">
              <Label htmlFor="rq">Query <span className="font-mono text-[10px] text-muted-foreground">{query.length}/150</span></Label>
              <Input id="rq" value={query} maxLength={150} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. appointment no-show prediction" className="bg-background" data-testid="input-resource-query" />
            </div>
          ) : (
            <p className="self-end rounded border border-dashed p-2 text-xs text-muted-foreground">The model extracts technical requirements and search phrases from your project and latest analysis, if present. Uses AI capacity even when explanations are off.</p>
          )}
          <div className="space-y-1">
            <Label htmlFor="rl">Languages (comma separated)</Label>
            <Input id="rl" value={langs} onChange={(e) => setLangs(e.target.value)} placeholder="Python, TypeScript" className="bg-background" data-testid="input-languages" />
          </div>
        </div>
        <fieldset>
          <legend className="mb-1 text-xs text-muted-foreground">Categories (none selected = repositories, datasets, models, APIs and documentation)</legend>
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => {
              const on = cats.includes(c);
              return (
                <button type="button" key={c} aria-pressed={on} onClick={() => setCats(on ? cats.filter((x) => x !== c) : [...cats, c])} className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/15 hover:border-foreground/40'}`} data-testid={`toggle-category-${c}`}>
                  {humanize(c.toLowerCase())}
                </button>
              );
            })}
          </div>
        </fieldset>
        {(languages.length > 5 || languages.some((language) => language.length > 40)) && <p role="alert" className="text-xs text-destructive">Use up to five languages, at most 40 characters each.</p>}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={explain} onCheckedChange={(c) => setExplain(!!c)} data-testid="checkbox-explain" />
            Add AI explanations {mode === 'query' && !explain && <span className="text-xs text-muted-foreground">(off = AI-free search)</span>}
          </label>
          <Button type="submit" disabled={!ok || m.isPending} className="ml-auto" data-testid="button-search-resources">
            <Search className="mr-1.5 h-4 w-4" />{m.isPending ? 'Querying providers...' : 'Search'}
          </Button>
        </div>
        <InlineError error={m.error} />
      </form>
    </section>
  );
}

function SearchMeta({ s, onOpen, projectId }: { s: ResourceSearch; onOpen: (i: Item) => void; projectId: string }) {
  return (
    <section className="rise space-y-3" aria-label="Search result">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="eyebrow">This search</span>
        <span className="font-mono">"{s.query}"</span>
        {s.cached && <Chip value="x">cached retrieval</Chip>}
        <span>Explanations: <Chip value={s.explanationStatus}>{s.explanationStatus}</Chip></span>
        <span className="font-mono text-[10px] text-muted-foreground">search {s.searchId.slice(0, 8)}</span>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Provider statuses">
        {s.providerStatuses.map((p) => (
          <li key={p.provider} className="flex items-center gap-1.5 rounded border border-foreground/10 bg-card px-2 py-1 text-xs" data-testid={`provider-${p.provider}`}>
            <span className="font-medium">{p.provider}</span>
            <Chip value={p.status} />
            <span className="font-mono text-muted-foreground">{p.count} results</span>
            {p.error && <span className="text-destructive">{p.error}</span>}
          </li>
        ))}
      </ul>
      {s.requirements.length > 0 && (
        <div className="text-xs"><span className="eyebrow mr-2">Extracted requirements</span>{s.requirements.map((r, i) => <span key={i} className="mr-1 inline-block rounded-sm bg-secondary px-1.5 py-0.5">{r}</span>)}</div>
      )}
      {s.explanationStatus === 'UNAVAILABLE' && <p className="text-xs text-muted-foreground">Explanations could not be generated. The source results below are still genuine.</p>}
      {s.items.length === 0 ? (
        <EmptyState mark="0" title="Providers returned zero results" body="That is a real empty result, not proof nothing suitable exists. Try different literal terms; synonyms are not expanded." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {s.items.map((it, i) => {
            const { resource, ...rec } = it;
            return <ResourceCard key={it.id} item={{ resource, recommendation: rec }} rank={i + 1} onOpen={onOpen} projectId={projectId} />;
          })}
        </ul>
      )}
    </section>
  );
}

function ListView({ projectId, saved, onOpen }: { projectId: string; saved: boolean; onOpen: (i: Item) => void }) {
  const [page, setPage] = useState(1);
  const [cat, setCat] = useState<ResourceCategory | ''>('');
  const [onlyUnsaved, setOnlyUnsaved] = useState(false);
  const params: ListResourcesParams = { page, limit: PAGE_SIZE, ...(cat ? { category: cat } : {}), ...(saved ? { saved: 'true' } : onlyUnsaved ? { saved: 'false' } : {}) };
  const q = useListResources(projectId, params, { query: { enabled: !!projectId, queryKey: getListResourcesQueryKey(projectId, params) } });
  const items = q.data?.data.items ?? [];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Category</span>
          <select value={cat} onChange={(e) => { setCat(e.target.value as ResourceCategory | ''); setPage(1); }} className="rounded border border-input bg-card px-2 py-1" data-testid="select-filter-category">
            <option value="">All</option>
            {CATS.map((c) => <option key={c} value={c}>{humanize(c.toLowerCase())}</option>)}
          </select>
        </label>
        {!saved && (
          <label className="flex items-center gap-1.5">
            <Checkbox checked={onlyUnsaved} onCheckedChange={(c) => { setOnlyUnsaved(!!c); setPage(1); }} data-testid="checkbox-unsaved" /> Unsaved only
          </label>
        )}
      </div>
      {q.isLoading ? (
        <RowsSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load resources" />
      ) : items.length === 0 ? (
        <EmptyState mark={saved ? 'SAV' : 'SRC'} title={saved ? 'Nothing saved' : 'No recommendations here'} body={saved ? 'Save a resource from any search to keep it here, even after later searches change.' : 'Run a search above. Filters may also be hiding results.'} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((it, i) => <ResourceCard key={`${it.resource.id}-${it.recommendation?.id ?? 's'}`} item={it} rank={it.recommendation ? (page - 1) * PAGE_SIZE + i + 1 : undefined} onOpen={onOpen} projectId={projectId} />)}
        </ul>
      )}
      <Pager page={page} setPage={setPage} count={items.length} limit={PAGE_SIZE} label="Resources pagination" />
    </div>
  );
}

function SaveControls({ resourceId, projectId, saved: serverSaved }: { resourceId: string; projectId: string; saved?: SavedResource | null }) {
  const qc = useQueryClient();
  const stateKey = ['resource-save-state', projectId, resourceId];
  // Share mutation results between the live search, persisted list and open drawer.
  // A fresh list response is authoritative; captured drawer props may be stale.
  const state = useQuery<SavedResource | null>({
    queryKey: stateKey, queryFn: skipToken, initialData: serverSaved ?? null,
  });
  useEffect(() => {
    if (serverSaved !== undefined) qc.setQueryData(stateKey, serverSaved);
  }, [serverSaved, projectId, resourceId, qc]);
  const saved = state.data;
  const { toast } = useToast();
  const save = useSaveResource();
  const remove = useRemoveSavedResource();
  const refresh = () => qc.invalidateQueries({ queryKey: getListResourcesQueryKey(projectId) });
  const doSave = (status?: ResourceSaveInputStatus) =>
    save.mutate({ id: resourceId, data: status ? { projectId, status } : { projectId } }, { onSuccess: (r) => { qc.setQueryData(stateKey, r.data); refresh(); toast({ title: 'Saved to project', description: `Status: ${r.data.status}` }); } });
  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1.5">
        {saved ? (
          <>
            <label className="sr-only" htmlFor={`st-${resourceId}`}>Saved status</label>
            <select id={`st-${resourceId}`} value={saved.status} disabled={save.isPending} onChange={(e) => doSave(e.target.value as ResourceSaveInputStatus)} className="rounded border border-input bg-background px-1.5 py-1 text-xs" data-testid={`select-save-status-${resourceId}`}>
              {SAVE_STATUSES.map((s) => <option key={s} value={s}>{humanize(s.toLowerCase())}</option>)}
            </select>
            <Button size="sm" variant="ghost" disabled={remove.isPending || save.isPending} onClick={() => remove.mutate({ id: projectId, resourceId }, { onSuccess: () => { qc.setQueryData(stateKey, null); refresh(); toast({ title: 'Removed from saved', description: 'The source and its recommendation remain.' }); } })} data-testid={`button-unsave-${resourceId}`}>
              <BookmarkX className="mr-1 h-3.5 w-3.5" />Remove
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => doSave()} data-testid={`button-save-${resourceId}`}>
            <Bookmark className="mr-1 h-3.5 w-3.5" />{save.isPending ? 'Saving...' : saved === undefined ? 'Save' : 'Save'}
          </Button>
        )}
      </div>
      <InlineError error={save.error || remove.error} />
    </div>
  );
}

function ResourceCard({ item, rank, onOpen, projectId }: { item: Item; rank?: number; onOpen: (i: Item) => void; projectId: string }) {
  const { resource: r, recommendation: rec, saved } = item;
  return (
    <li className="lift rise flex flex-col rounded-md border border-card-border bg-card p-3.5" data-testid={`card-resource-${r.id}`}>
      <div className="flex items-start gap-3">
        {rank !== undefined && <span className="font-mono text-xs text-muted-foreground">#{rank}</span>}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap gap-1"><Chip value="x">{humanize(r.category.toLowerCase())}</Chip><Chip value="x">{r.provider}</Chip>{saved && <Chip value={saved.status} />}</div>
          <button onClick={() => onOpen(item)} className="text-left font-display text-lg leading-tight hover:text-accent" data-testid={`button-open-resource-${r.id}`}>{r.name}</button>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description || 'No description reported by source.'}</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-[10px] text-muted-foreground">
        <span>License: {r.license ?? 'Unknown'}</span>
        <span>Lang: {r.language ?? 'Unknown'}</span>
        <span>Src upd: {r.sourceUpdatedAt ? fmtDay(r.sourceUpdatedAt) : 'Unknown'}</span>
      </div>
      {rec ? (
        <div className="mt-2 flex items-center gap-3 text-[11px]">
          <Score label="Rank" v={rec.rankScore} strong />
          <Score label="Relevance" v={rec.relevanceScore} />
          <Score label="Quality" v={rec.qualityScore} />
          {rec.explanation ? <span className="ml-auto"><AiLabel review={rec.explanation.reviewRequired !== false} /></span> : null}
        </div>
      ) : (
        <p className="mt-2 text-[11px] italic text-muted-foreground">Saved from an earlier search; no current recommendation snapshot.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-foreground/10 pt-2">
        <SafeLink url={r.url} />
        <SaveControls resourceId={r.id} projectId={projectId} saved={saved} />
      </div>
    </li>
  );
}

function Score({ label, v, strong }: { label: string; v: number; strong?: boolean }) {
  return (
    <span className="flex items-center gap-1.5" title={`${label} score (heuristic, 0 to 100)`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="relative h-1 w-10 overflow-hidden rounded bg-secondary"><span className={`absolute inset-y-0 left-0 origin-left ${strong ? 'bg-accent' : 'bg-foreground/50'}`} style={{ width: `${Math.max(0, Math.min(100, v))}%` }} /></span>
      <span className="font-mono tabular-nums">{Math.round(v)}</span>
    </span>
  );
}

function DetailSheet({ item, projectId, onClose }: { item: Item | null; projectId: string; onClose: () => void }) {
  const rid = item?.resource.id ?? '';
  const q = useGetResource(rid, { query: { enabled: !!rid, queryKey: getGetResourceQueryKey(rid) } });
  const cur = q.data?.data;
  const rec = item?.recommendation;
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-background sm:max-w-xl">
        {item && (
          <>
            <SheetHeader>
              <p className="eyebrow">{item.resource.provider} / {humanize(item.resource.category.toLowerCase())}</p>
              <SheetTitle className="font-display text-2xl">{item.resource.name}</SheetTitle>
              <SheetDescription>Source facts and AI interpretation are kept apart. Unknown means the source did not report it. License, pricing, quota and security suitability are not established.</SheetDescription>
            </SheetHeader>
            <div className="mt-5 space-y-6 text-sm">
              <section>
                <p className="eyebrow mb-2">Current source record</p>
                {q.isLoading ? <RowsSkeleton rows={2} /> : q.isError ? <ErrorPanel error={q.error} onRetry={() => q.refetch()} /> : cur ? (
                  <div className="space-y-2 rounded border border-foreground/10 bg-card p-3">
                    <p>{cur.description || <span className="italic text-muted-foreground">No description.</span>}</p>
                    <SafeLink url={cur.url} />
                    <KV data={{ license: cur.license, language: cur.language, externalId: cur.externalId, tags: cur.tags }} />
                    <p className="font-mono text-[10px] text-muted-foreground">Source reports last update {cur.sourceUpdatedAt ? fmtDate(cur.sourceUpdatedAt) : 'Unknown'} / retrieved by Blindspot {fmtDate(cur.retrievedAt)}</p>
                    <details><summary className="cursor-pointer text-xs text-muted-foreground">Quality signals (raw, null = unknown)</summary><KV data={cur.qualitySignals} className="mt-2" /></details>
                    <details><summary className="cursor-pointer text-xs text-muted-foreground">Source metadata</summary><KV data={cur.sourceMetadata} className="mt-2" /></details>
                  </div>
                ) : null}
              </section>
              {rec ? (
                <>
                  <section>
                    <p className="eyebrow mb-2">Ranking at search time (heuristic, not endorsement)</p>
                    <div className="mb-2 flex flex-wrap gap-3 text-[11px]"><Score label="Rank" v={rec.rankScore} strong /><Score label="Relevance" v={rec.relevanceScore} /><Score label="Quality" v={rec.qualityScore} /></div>
                    <div className="rounded border border-foreground/10 bg-card p-3"><KV data={rec.ranking} /></div>
                  </section>
                  <section>
                    <div className="mb-2 flex items-center justify-between"><p className="eyebrow">AI explanation</p>{rec.explanation && <AiLabel review={rec.explanation.reviewRequired !== false} />}</div>
                    {rec.explanation ? (
                      <div className="space-y-2 rounded border border-dashed border-accent/40 bg-accent/5 p-3">
                        <p><span className="eyebrow">Use case </span>{rec.explanation.recommendedUseCase}</p>
                        <p>{rec.explanation.explanation}</p>
                        <p><span className="eyebrow">Estimated difficulty </span>{rec.explanation.integrationDifficulty}</p>
                        {rec.explanation.limitations.length > 0 && <ul className="list-disc pl-5 text-xs">{rec.explanation.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>}
                        {rec.explanation.alternativeResourceIds.length > 0 && <p className="font-mono text-[10px] text-muted-foreground">Alternatives in this search: {rec.explanation.alternativeResourceIds.map((x) => x.slice(0, 8)).join(', ')}</p>}
                      </div>
                    ) : <p className="text-xs italic text-muted-foreground">No explanation (explanations were off or unavailable).</p>}
                  </section>
                  <section>
                    <p className="eyebrow mb-2">Immutable snapshot from search {rec.searchId.slice(0, 8)}</p>
                    <div className="rounded border border-foreground/10 bg-secondary/40 p-3"><KV data={rec.sourceSnapshot} /></div>
                  </section>
                </>
              ) : (
                <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">Saved from an earlier search. No recommendation snapshot is attached to this view.</p>
              )}
              <SaveControls resourceId={item.resource.id} projectId={projectId} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
