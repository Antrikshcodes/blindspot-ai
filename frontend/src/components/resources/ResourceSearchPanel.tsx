import React, { useState, type FormEvent } from 'react';
import {
  Search,
  Sparkles,
  Code,
  Info,
  Check,
} from 'lucide-react';
import { useSearchResources } from '../../api/resourceApi';
import {
  ResourceCategory,
  type ResourceSearch,
  formatCategoryLabel,
} from '../../types/resources';

interface ResourceSearchPanelProps {
  projectId: string;
  onSearchResult: (result: ResourceSearch) => void;
}

const ALL_CATEGORIES: ResourceCategory[] = Object.values(ResourceCategory) as ResourceCategory[];

export const ResourceSearchPanel: React.FC<ResourceSearchPanelProps> = ({
  projectId,
  onSearchResult,
}) => {
  const [mode, setMode] = useState<'query' | 'auto'>('query');
  const [query, setQuery] = useState('');
  const [langsInput, setLangsInput] = useState('');
  const [selectedCats, setSelectedCats] = useState<ResourceCategory[]>([]);
  const [explain, setExplain] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const { mutateAsync: searchResources, isPending, error: apiError } = useSearchResources();

  const toggleCategory = (cat: ResourceCategory) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const parsedLanguages = langsInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const isLangCountValid = parsedLanguages.length <= 5;
  const isLangLengthValid = parsedLanguages.every((l) => l.length <= 40);
  const isQueryValid = mode === 'auto' || (query.trim().length > 0 && query.length <= 150);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setClientError(null);

    if (!isQueryValid) {
      setClientError('Please enter a search query between 1 and 150 characters.');
      return;
    }
    if (!isLangCountValid) {
      setClientError('Maximum 5 languages permitted.');
      return;
    }
    if (!isLangLengthValid) {
      setClientError('Each language must be 40 characters or fewer.');
      return;
    }

    try {
      const response = await searchResources({
        id: projectId,
        data: {
          ...(mode === 'query' ? { query: query.trim() } : {}),
          ...(parsedLanguages.length ? { languages: parsedLanguages } : {}),
          ...(selectedCats.length ? { categories: selectedCats } : {}),
          explain,
        },
      });

      if (response?.data) {
        onSearchResult(response.data);
      }
    } catch {
      // Handled via apiError
    }
  };

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-purple">
          <Sparkles className="w-4 h-4" /> Real-World Building Blocks
        </div>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-forest mt-1">
          Resource Intelligence Search
        </h2>
        <p className="text-xs sm:text-sm text-forest/75 font-sans mt-0.5 leading-relaxed">
          Queries live external providers (GitHub, Hugging Face, APIs.guru, UCI ML Repo, official documentation). The engine returns authentic candidate metadata and transparent ranking without invented links.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Selector Toggle */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-sand border border-forest/15 w-fit">
          <button
            type="button"
            onClick={() => setMode('query')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'query'
                ? 'bg-forest text-sand shadow-sm'
                : 'text-forest/70 hover:text-forest'
            }`}
          >
            Explicit Search Query
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('auto');
              setExplain(true);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'auto'
                ? 'bg-forest text-sand shadow-sm'
                : 'text-forest/70 hover:text-forest'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple" />
            Automatic from Idea Analysis
          </button>
        </div>

        {/* Query Input or Auto-Explanation Notice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1">
            {mode === 'query' ? (
              <>
                <div className="flex items-center justify-between text-xs font-mono font-bold text-forest/70 uppercase">
                  <label htmlFor="resource-query">Search Keywords</label>
                  <span className="text-[10px] text-forest/40">{query.length}/150</span>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-forest/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="resource-query"
                    type="text"
                    value={query}
                    maxLength={150}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. fake news detection, audio transcription, vector search..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-sand border border-forest/20 text-xs text-forest placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple font-sans"
                  />
                </div>
              </>
            ) : (
              <div className="p-3.5 rounded-2xl bg-sand border border-forest/15 text-xs text-forest/80 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple shrink-0 mt-0.5" />
                <p className="leading-relaxed font-sans">
                  The engine will read your project hypothesis and latest Phase 02 analysis to synthesize provider-specific search phrases across GitHub, Hugging Face, and API directories.
                </p>
              </div>
            )}
          </div>

          {/* Languages Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-forest/70 uppercase">
              <label htmlFor="resource-langs">Languages (Optional)</label>
              <Code className="w-3.5 h-3.5 text-forest/40" />
            </div>
            <input
              id="resource-langs"
              type="text"
              value={langsInput}
              onChange={(e) => setLangsInput(e.target.value)}
              placeholder="e.g. Python, TypeScript"
              className="w-full px-3.5 py-2.5 rounded-xl bg-sand border border-forest/20 text-xs text-forest placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple font-sans"
            />
          </div>
        </div>

        {/* Categories Multi-Select Chips */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-mono text-forest/60">
            <span className="font-bold uppercase tracking-wider">
              Filter Categories (None = Search All 7 Provider Categories):
            </span>
            {selectedCats.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCats([])}
                className="underline hover:text-forest cursor-pointer"
              >
                Clear Categories
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ALL_CATEGORIES.map((cat) => {
              const isSelected = selectedCats.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-forest text-sand font-bold shadow-sm'
                      : 'bg-sand border border-forest/15 text-forest/70 hover:text-forest hover:border-forest/30'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-purple" />}
                  <span>{formatCategoryLabel(cat)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Explanations Toggle & Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-forest/10">
          <label className="flex items-center gap-2.5 text-xs text-forest cursor-pointer font-sans select-none">
            <input
              type="checkbox"
              checked={explain}
              onChange={(e) => setExplain(e.target.checked)}
              className="rounded text-purple focus:ring-purple"
            />
            <span>
              <strong>Generate AI Explanations</strong>
              <span className="text-forest/60 ml-1">
                (Maps candidate relevance to your project's technical requirements)
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={isPending || (!isQueryValid && mode === 'query')}
            className="px-6 py-2.5 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-purple" />
            <span>{isPending ? 'Querying Live Providers...' : 'Search Real Resources'}</span>
          </button>
        </div>

        {/* Error Render */}
        {clientError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-800 text-xs font-sans">
            {clientError}
          </div>
        )}
        {apiError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-800 text-xs font-sans">
            {(apiError as any)?.data?.error?.message ||
              (apiError as any)?.message ||
              'Failed to retrieve resources from providers.'}
          </div>
        )}
      </form>
    </div>
  );
};
