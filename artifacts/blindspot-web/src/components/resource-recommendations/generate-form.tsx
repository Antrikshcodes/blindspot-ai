import { useState } from 'react';
import { Link } from 'wouter';
import type { ResourceCategory, ResourceProvider, ResourceSearchInput } from '@workspace/api-client-react';
import { ErrorPanel } from '@/components/kit';
import { CATEGORIES, CATEGORY_META, PROVIDERS, PROVIDER_META, splitList } from '@/lib/resource-search';
import { useResourceSession, useRunResourceSearch } from '@/hooks/use-resource-search';
import { fmtDate } from '@/lib/api';

const chip = (on: boolean) => `inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs transition-colors ${on ? 'border-[#1F3D2B] bg-[#1F3D2B] text-[#E8DCC4]' : 'border-[#1F3D2B]/25 bg-[#FBF7EE] text-[#1F3D2B] hover:border-[#1F3D2B]/50'}`;

/** Context-derived search. Sends no query and no project data; the server plans queries. */
export function GenerateForm({ projectId }: { projectId: string }) {
  const session = useResourceSession(projectId);
  const { m, busy, tryLock } = useRunResourceSearch(projectId);
  const [categories, setCategories] = useState<ResourceCategory[]>(CATEGORIES);
  const [providers, setProviders] = useState<ResourceProvider[]>([]);
  const [explain, setExplain] = useState(false);
  const [langs, setLangs] = useState('');
  const languages = splitList(langs);
  const errors: string[] = [];
  if (categories.length === 0) errors.push('Choose at least one category.');
  if (languages.length > 5) errors.push('Up to 5 languages.');
  if (languages.some((l) => l.length > 40)) errors.push('Each language must be 40 characters or fewer.');

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = () => {
    if (errors.length || !tryLock()) return;
    const data: ResourceSearchInput = {
      categories, explain,
      ...(languages.length ? { languages } : {}),
      ...(providers.length ? { providers } : {}),
    };
    m.mutate({ id: projectId, data });
  };

  const failedAt = session.run.failedAt;
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4" data-testid="recommendations-generate-form">
      <fieldset>
        <legend className="eyebrow mb-2">Categories</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <label key={c} className={chip(categories.includes(c))}>
              <input type="checkbox" className="sr-only" checked={categories.includes(c)} onChange={() => toggle(categories, c, setCategories)} data-testid={`recommendations-generate-category-${c}`} />
              {CATEGORY_META[c].label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow mb-1">Providers (optional)</legend>
        <p className="mb-2 text-[11px] text-[#1F3D2B]/60">Leave empty to let the server use its default providers.</p>
        <div className="flex flex-wrap gap-1.5">
          {PROVIDERS.map((p) => (
            <label key={p} className={chip(providers.includes(p))}>
              <input type="checkbox" className="sr-only" checked={providers.includes(p)} onChange={() => toggle(providers, p, setProviders)} data-testid={`recommendations-generate-provider-${p}`} />
              {PROVIDER_META[p].label}{PROVIDER_META[p].optIn ? ' (opt-in)' : ''}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-[#1F3D2B]/70">Languages (optional, comma separated)
          <input value={langs} onChange={(e) => setLangs(e.target.value)} placeholder="TypeScript, Python" className="min-h-10 rounded-md border border-[#1F3D2B]/20 bg-[#FBF7EE] px-3 text-sm text-[#1F3D2B]" data-testid="recommendations-generate-languages" />
        </label>
        <label className="flex min-h-10 items-center gap-2 self-end text-xs text-[#1F3D2B]">
          <input type="checkbox" checked={explain} onChange={(e) => setExplain(e.target.checked)} className="h-4 w-4 accent-[#8B5CF6]" data-testid="recommendations-generate-explain" />
          Add AI explanations (uses AI, review required)
        </label>
      </div>
      {errors.length > 0 && <ul role="alert" className="text-xs text-destructive">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || errors.length > 0} className="inline-flex min-h-11 items-center rounded-md bg-[#1F3D2B] px-5 text-sm font-medium text-[#E8DCC4] transition-opacity hover:opacity-90 disabled:opacity-55" data-testid="recommendations-generate">
          {busy ? 'Generating, waiting for server...' : 'Generate recommendations'}
        </button>
        <p className="text-[11px] text-[#1F3D2B]/60">Query planning uses AI on the server. No search text or project data is sent from this page.</p>
      </div>
      {!busy && failedAt && (
        <div className="space-y-2" data-testid="recommendations-generate-error">
          {m.isError ? <ErrorPanel error={m.error} title="Generation request not confirmed" onRetry={submit} /> : (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">The last resource request did not confirm success at {fmtDate(failedAt)}.</p>
          )}
          <p className="text-xs text-[#1F3D2B]/70">The list below is read separately from the latest completed project search. A lost response may still have committed results; check the stored provenance rather than assuming nothing was saved. You can also <Link href={`/projects/${projectId}/resources`} className="underline" data-testid="link-recommendation-search-fallback">search manually</Link>.</p>
        </div>
      )}
    </form>
  );
}
