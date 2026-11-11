import { type FormEvent } from 'react';
import { BookOpen, Brain, Database, GitBranch, GraduationCap, KeyRound, Plug, RotateCcw, Search, Sparkles, Wrench, type LucideIcon } from 'lucide-react';
import type { ResourceCategory, ResourceProvider } from '@workspace/api-client-react';
import { Checkbox } from '@/components/ui/checkbox';
import { InlineError } from '@/components/kit';
import { cn } from '@/lib/utils';
import { CATEGORIES, CATEGORY_META, CORE_CATEGORIES, EXAMPLES, PROVIDERS, PROVIDER_META, buildPayload, validate, type Draft } from '@/lib/resource-search';
import { useResourceSession, useRunResourceSearch } from '@/hooks/use-resource-search';

const ICONS: Record<ResourceCategory, LucideIcon> = {
  GITHUB_REPOSITORY: GitBranch, DATASET: Database, AI_MODEL: Brain, API: Plug,
  DOCUMENTATION: BookOpen, OPEN_SOURCE_TOOL: Wrench, LEARNING_RESOURCE: GraduationCap,
};

const field = 'w-full min-h-10 rounded-md border border-[#1F3D2B]/20 bg-[#FBF7EE] px-3 py-2 text-sm text-[#1F3D2B] placeholder:text-[#1F3D2B]/40 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40';

export function SearchForm({ projectId }: { projectId: string }) {
  const { draft, setDraft, clearDraft, notice } = useResourceSession(projectId);
  const { m, busy, tryLock } = useRunResourceSearch(projectId);
  const errs = validate(draft);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (errs.length || busy || !tryLock()) return;
    m.mutate({ id: projectId, data: buildPayload(draft) });
  };
  const set = (p: Partial<Draft>) => setDraft(p);
  const aiUsed = draft.mode === 'auto' || draft.explain;

  return (
    <form onSubmit={submit} className="space-y-5" aria-label="Resource search">
      <div role="radiogroup" aria-label="Search mode" className="inline-flex flex-wrap gap-1 rounded-full bg-[#1F3D2B]/8 p-1 text-sm">
        {(['query', 'auto'] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={draft.mode === k} onClick={() => set({ mode: k })}
            className={cn('min-h-9 rounded-full px-4 transition-colors', draft.mode === k ? 'bg-[#1F3D2B] text-[#E8DCC4]' : 'text-[#1F3D2B]/70 hover:text-[#1F3D2B]')}
            data-testid={`search-mode-${k}`}>
            {k === 'query' ? 'Typed query' : 'Auto from project (AI)'}
          </button>
        ))}
      </div>

      {draft.mode === 'query' ? (
        <div className="space-y-2">
          <label htmlFor="rs-query" className="flex items-baseline justify-between text-xs text-[#1F3D2B]/70">
            <span>What are you trying to build with?</span>
            <span className={cn('font-mono text-[10px]', draft.query.trim().length > 150 && 'text-destructive')}>{draft.query.trim().length}/150</span>
          </label>
          <input id="rs-query" value={draft.query} maxLength={150} onChange={(e) => set({ query: e.target.value })}
            placeholder="e.g. appointment no-show prediction" className={cn(field, 'font-display text-lg')} data-testid="input-resource-query" />
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="eyebrow mr-1">Examples, not recommendations</span>
            {EXAMPLES.map((x) => (
              <button key={x} type="button" onClick={() => set({ query: x })} className="min-h-8 rounded-full border border-dashed border-[#1F3D2B]/25 px-2.5 text-[#1F3D2B]/75 hover:border-[#1F3D2B]/60" data-testid={`button-example-${x.replace(/\s+/g, '-')}`}>{x}</button>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-[#8B5CF6]/40 bg-[#8B5CF6]/5 p-3 text-xs text-[#1F3D2B]/80">
          <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[#8B5CF6]" aria-hidden />
          A model derives requirements and search phrases from your project and latest analysis. This uses AI even with explanations off. Generated phrasing is shown after the run.
        </p>
      )}

      <fieldset>
        <legend className="eyebrow mb-2">Categories {draft.categories.length === 0 && <span className="normal-case tracking-normal">(none picked: repos, datasets, models, APIs, docs)</span>}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {CATEGORIES.map((c) => {
            const Icon = ICONS[c];
            const on = draft.categories.includes(c);
            const implied = draft.categories.length === 0 && CORE_CATEGORIES.includes(c);
            return (
              <button key={c} type="button" aria-pressed={on} onClick={() => set({ categories: toggle(draft.categories, c) })}
                className={cn('flex min-h-16 flex-col items-start gap-1 rounded-md border p-2.5 text-left transition-colors',
                  on ? 'border-[#1F3D2B] bg-[#1F3D2B] text-[#E8DCC4]' : implied ? 'border-[#1F3D2B]/35 border-dashed bg-[#FBF7EE]' : 'border-[#1F3D2B]/15 bg-[#FBF7EE] hover:border-[#1F3D2B]/40')}
                data-testid={`toggle-category-${c}`}>
                <Icon className="h-4 w-4" aria-hidden />
                <span className="text-xs font-medium">{CATEGORY_META[c].label}</span>
                <span className={cn('text-[10px] leading-tight', on ? 'text-[#E8DCC4]/75' : 'text-[#1F3D2B]/55')}>{CATEGORY_META[c].desc}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <details className="group rounded-md border border-[#1F3D2B]/12 bg-[#FBF7EE]/60 p-3" data-testid="details-advanced-search">
        <summary className="cursor-pointer text-xs font-medium text-[#1F3D2B]">Providers, languages, topics, tasks</summary>
        <div className="mt-3 space-y-4">
          <fieldset>
            <legend className="eyebrow mb-2">Providers (none picked: server defaults)</legend>
            <div className="flex flex-wrap gap-1.5">
              {PROVIDERS.map((p: ResourceProvider) => {
                const on = draft.providers.includes(p);
                const meta = PROVIDER_META[p];
                return (
                  <button key={p} type="button" aria-pressed={on} onClick={() => set({ providers: toggle(draft.providers, p) })}
                    className={cn('flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs', on ? 'border-[#1F3D2B] bg-[#1F3D2B] text-[#E8DCC4]' : 'border-[#1F3D2B]/20 text-[#1F3D2B]/80')}
                    title={meta.covers} data-testid={`toggle-provider-${p}`}>
                    {meta.optIn && <KeyRound className="h-3 w-3" aria-hidden />}{meta.label}
                    <span className="opacity-60">/ {meta.covers}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[10px] text-[#1F3D2B]/60">Kaggle is opt-in and depends on server credentials; actual availability appears only in the provider status after a run.</p>
          </fieldset>
          <div className="grid gap-3 md:grid-cols-3">
            <TextList id="input-languages" label="Languages (max 5)" value={draft.languages} onChange={(v) => set({ languages: v })} placeholder="Python, TypeScript" />
            <TextList id="input-topics" label="Topics (max 5)" value={draft.topics} onChange={(v) => set({ topics: v })} placeholder="ocr, scheduling" />
            <TextList id="input-tasks" label="Tasks (max 5)" value={draft.tasks} onChange={(v) => set({ tasks: v })} placeholder="text-classification" />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={draft.includeArchived} onCheckedChange={(c) => set({ includeArchived: !!c })} data-testid="checkbox-include-archived" />
            Include archived sources
          </label>
        </div>
      </details>

      {errs.length > 0 && (draft.query || draft.languages || draft.topics || draft.tasks) && (
        <ul role="alert" className="space-y-0.5 text-xs text-destructive">{errs.map((e) => <li key={e}>{e}</li>)}</ul>
      )}
      {notice && <p className="rounded border border-[#1F3D2B]/15 bg-[#E8DCC4]/50 px-3 py-2 text-xs" data-testid="text-search-notice">{notice}</p>}

      <div className="flex flex-wrap items-center gap-3 border-t border-[#1F3D2B]/10 pt-4">
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <Checkbox checked={draft.explain} onCheckedChange={(c) => set({ explain: !!c })} data-testid="checkbox-explain" />
          AI explanations
        </label>
        <span className={cn('font-mono text-[10px] uppercase tracking-wider', aiUsed ? 'text-[#8B5CF6]' : 'text-[#1F3D2B]/60')} data-testid="text-ai-usage">
          {aiUsed ? 'Uses AI' : 'AI-free search'}
        </span>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={clearDraft} className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm text-[#1F3D2B]/70 hover:bg-[#1F3D2B]/5" data-testid="button-clear-resource-search">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />Clear form
          </button>
          <button type="submit" disabled={errs.length > 0 || busy} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#8B5CF6] px-5 text-sm font-medium text-white transition-opacity disabled:opacity-40" data-testid="button-search-resources">
            <Search className="h-4 w-4" aria-hidden />{busy ? 'Querying providers...' : 'Search'}
          </button>
        </div>
      </div>
      <InlineError error={m.error} />
    </form>
  );
}

function TextList({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-[#1F3D2B]/70">{label}, comma separated</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={field} data-testid={id} />
    </div>
  );
}
