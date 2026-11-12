import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Compass,
  Bookmark,
  History,
  Filter,
  ArrowUpDown,
  Search,
  Layers,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  ResourceCategory,
  ResourceSaveInputStatus,
  type Recommendation,
  type ResourceSearch,
  formatCategoryLabel,
} from '../../types/resources';
import {
  useListResources,
  useSaveResource,
  useRemoveSavedResource,
  useGetResourceSearchHistory,
  getListResourcesQueryKey,
} from '../../api/resourceApi';
import { ResourceSearchPanel } from './ResourceSearchPanel';
import { ProviderStatusesBanner } from './ProviderStatusesBanner';
import { ResourceCard } from './ResourceCard';
import { ResourceDetailDrawer } from './ResourceDetailDrawer';

interface ResourceLibraryViewProps {
  projectId: string;
}

type TabType = 'discover' | 'library' | 'history';

export const ResourceLibraryView: React.FC<ResourceLibraryViewProps> = ({ projectId }) => {
  const queryClient = useQueryClient();

  // Active view tab
  const [activeTab, setActiveTab] = useState<TabType>('discover');

  // Search Results & Diagnostics State
  const [latestSearchResult, setLatestSearchResult] = useState<ResourceSearch | null>(null);

  // Filters for Discovery Tab
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | 'ALL'>('ALL');
  const [minRelevance, setMinRelevance] = useState<number>(0);
  const [sortOption, setSortOption] = useState<'relevance' | 'lastUpdated'>('relevance');
  const [unsavedOnly, setUnsavedOnly] = useState<boolean>(false);
  const [discoverPage, setDiscoverPage] = useState<number>(1);

  // Filters for Saved Library Tab
  const [savedStatusFilter, setSavedStatusFilter] = useState<string>('ALL');

  // Selected Resource for Detail Drawer
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  // Mutations
  const { mutateAsync: saveResourceMutation, isPending: isSavingResource } = useSaveResource();
  const { mutateAsync: removeSaveMutation, isPending: isRemovingSave } = useRemoveSavedResource();

  // Query: Discover Resources (Recommendations from latest search)
  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
    refetch: refetchList,
  } = useListResources(
    projectId,
    {
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      saved: unsavedOnly ? 'false' : undefined,
      page: discoverPage,
      limit: 12,
    },
    {
      query: {
        enabled: Boolean(projectId) && activeTab === 'discover',
      },
    }
  );

  // Query: Saved Resources
  const {
    data: savedData,
    isLoading: isSavedLoading,
    error: savedError,
    refetch: refetchSaved,
  } = useListResources(
    projectId,
    {
      saved: 'true',
      page: 1,
      limit: 50,
    },
    {
      query: {
        enabled: Boolean(projectId) && activeTab === 'library',
      },
    }
  );

  // Query: Search History & Diagnostics
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useGetResourceSearchHistory(
    projectId,
    { page: 1, limit: 10 },
    {
      query: {
        enabled: Boolean(projectId),
      },
    }
  );

  const historyItems = historyData?.data?.items || [];
  const latestHistory = historyItems[0];

  // Invalidate queries when save status changes
  const handleSaveStatusChange = async (resourceId: string, status: ResourceSaveInputStatus) => {
    try {
      await saveResourceMutation({
        id: resourceId,
        data: {
          projectId,
          status,
        },
      });
      // Invalidate project resource caches
      queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'resources'] });
    } catch (err) {
      console.error('Failed to save resource:', err);
    }
  };

  const handleRemoveSave = async (resourceId: string) => {
    try {
      await removeSaveMutation({
        id: projectId,
        resourceId,
      });
      queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'resources'] });
    } catch (err) {
      console.error('Failed to remove saved resource:', err);
    }
  };

  const handleSearchResult = (result: ResourceSearch) => {
    setLatestSearchResult(result);
    setDiscoverPage(1);
    // Refresh queries
    queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(projectId) });
    refetchHistory();
  };

  // Discover items list with client-side sorting and relevance thresholding
  const rawDiscoverItems = listData?.data?.items || [];
  const discoverItems = [...rawDiscoverItems]
    .filter((item) => {
      if (minRelevance > 0 && item.recommendation) {
        return item.recommendation.relevanceScore >= minRelevance;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOption === 'lastUpdated') {
        const dateA = a.resource.sourceUpdatedAt ? new Date(a.resource.sourceUpdatedAt).getTime() : 0;
        const dateB = b.resource.sourceUpdatedAt ? new Date(b.resource.sourceUpdatedAt).getTime() : 0;
        return dateB - dateA;
      }
      const rankA = a.recommendation?.rankScore ?? 0;
      const rankB = b.recommendation?.rankScore ?? 0;
      return rankB - rankA;
    });

  const discoverPagination = listData?.data?.pagination;
  const totalItems = discoverPagination?.total ?? discoverItems.length;
  const limitItems = discoverPagination?.limit ?? 12;

  // Saved items list
  const allSavedItems = savedData?.data?.items || [];
  const filteredSavedItems = allSavedItems.filter((item) => {
    if (savedStatusFilter === 'ALL') return true;
    return item.saved?.status === savedStatusFilter;
  });

  // Calculate counts for saved tabs
  const savedCounts = {
    ALL: allSavedItems.length,
    CONSIDERING: allSavedItems.filter((i) => i.saved?.status === ResourceSaveInputStatus.CONSIDERING).length,
    TRYING: allSavedItems.filter((i) => i.saved?.status === ResourceSaveInputStatus.TRYING).length,
    INTEGRATED: allSavedItems.filter((i) => i.saved?.status === ResourceSaveInputStatus.INTEGRATED).length,
  };

  // Find currently selected resource metadata for detail drawer
  const selectedItem =
    discoverItems.find((i) => i.resource.id === selectedResourceId) ||
    allSavedItems.find((i) => i.resource.id === selectedResourceId) ||
    latestSearchResult?.items.find((i) => i.resource.id === selectedResourceId);

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-forest/15">
        <div>
          <h2 className="text-2xl font-bold text-forest tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-purple" />
            <span>Resource Intelligence</span>
          </h2>
          <p className="text-xs text-forest/70 mt-1 max-w-xl">
            Cross-provider verified technical assets, machine learning models, datasets, and REST APIs
            ranked for your product specifications.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-sand/60 rounded-2xl border border-forest/15 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'discover'
                ? 'bg-forest text-sand shadow-sm'
                : 'text-forest/70 hover:text-forest hover:bg-forest/5'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover Resources</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'library'
                ? 'bg-forest text-sand shadow-sm'
                : 'text-forest/70 hover:text-forest hover:bg-forest/5'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Project Library</span>
            {savedCounts.ALL > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'library' ? 'bg-sand/25 text-sand' : 'bg-forest/15 text-forest'
                }`}
              >
                {savedCounts.ALL}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-forest text-sand shadow-sm'
                : 'text-forest/70 hover:text-forest hover:bg-forest/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Search Diagnostics</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DISCOVER RESOURCES */}
      {activeTab === 'discover' && (
        <div className="space-y-6">
          {/* Dual-Mode Search Panel */}
          <ResourceSearchPanel projectId={projectId} onSearchResult={handleSearchResult} />

          {/* Provider Statuses & Diagnostic Banner */}
          {(latestSearchResult || latestHistory) && (
            <ProviderStatusesBanner
              cached={latestSearchResult?.cached ?? latestHistory?.cached}
              partial={
                (latestSearchResult as unknown as { partial?: boolean })?.partial ??
                latestHistory?.partial
              }
              explanationStatus={
                latestSearchResult?.explanationStatus ?? latestHistory?.explanationStatus
              }
              explanationError={
                (latestSearchResult as unknown as { explanationError?: string })?.explanationError
              }
              requirements={latestSearchResult?.requirements ?? latestHistory?.requirements}
              providerStatuses={
                latestSearchResult?.providerStatuses ?? latestHistory?.providerStatuses
              }
              totalResults={totalItems}
            />
          )}

          {/* Discovery Filter Controls */}
          <div className="bg-sand/30 border border-forest/15 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-forest/70" />
                Category:
              </span>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setDiscoverPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-forest text-sand'
                    : 'bg-white/80 border border-forest/15 text-forest hover:bg-forest/5'
                }`}
              >
                All Categories
              </button>

              {Object.values(ResourceCategory).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setDiscoverPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-forest text-sand'
                      : 'bg-white/80 border border-forest/15 text-forest hover:bg-forest/5'
                  }`}
                >
                  {formatCategoryLabel(cat)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Min Relevance Filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-forest/70 font-medium">Min Relevance:</span>
                <select
                  aria-label="Filter Minimum Relevance"
                  value={minRelevance}
                  onChange={(e) => {
                    setMinRelevance(Number(e.target.value));
                    setDiscoverPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-forest/20 text-forest text-xs font-semibold focus:outline-none"
                >
                  <option value={0}>Any Match (0%)</option>
                  <option value={0.4}>&ge; 40% Relevance</option>
                  <option value={0.6}>&ge; 60% Relevance</option>
                  <option value={0.75}>&ge; 75% High Confidence</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-1.5 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-forest/70" />
                <select
                  aria-label="Sort Resources Order"
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value as 'relevance' | 'lastUpdated');
                    setDiscoverPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-forest/20 text-forest text-xs font-semibold focus:outline-none"
                >
                  <option value="relevance">Rank Score</option>
                  <option value="lastUpdated">Recently Updated</option>
                </select>
              </div>

              {/* Unsaved Only Toggle */}
              <label className="flex items-center gap-2 text-xs text-forest font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unsavedOnly}
                  onChange={(e) => {
                    setUnsavedOnly(e.target.checked);
                    setDiscoverPage(1);
                  }}
                  className="rounded text-forest focus:ring-forest border-forest/30"
                />
                <span>Unsaved only</span>
              </label>

              <button
                type="button"
                onClick={() => refetchList()}
                className="p-1.5 rounded-lg border border-forest/20 hover:bg-forest/5 text-forest/70 hover:text-forest transition-colors"
                title="Refresh results"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isListLoading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-forest" />
              <p className="text-sm font-medium text-forest/70">
                Loading authentic recommendations from verified providers...
              </p>
            </div>
          )}

          {/* Error State */}
          {listError && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to fetch resource recommendations</p>
                <p className="text-xs text-rose-700/80 mt-1">
                  {listError instanceof Error ? listError.message : 'Please try running a new search query.'}
                </p>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {!isListLoading && !listError && (
            <>
              {discoverItems.length === 0 ? (
                <div className="text-center py-16 px-4 bg-sand/20 rounded-2xl border border-dashed border-forest/20 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center mx-auto text-forest">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-forest">No Resources Found</h3>
                  <p className="text-xs text-forest/70 max-w-md mx-auto leading-relaxed">
                    No recommendations match your current filter criteria. Try lowering the minimum relevance
                    threshold, selecting "All Categories", or triggering an automatic search above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {discoverItems.map((item) => (
                    <ResourceCard
                      key={item.resource.id || item.resource.url}
                      resource={item.resource}
                      recommendation={item.recommendation}
                      saved={item.saved}
                      onSaveStatusChange={handleSaveStatusChange}
                      onRemoveSave={handleRemoveSave}
                      onSelect={(id) => setSelectedResourceId(id)}
                      isSaving={isSavingResource || isRemovingSave}
                    />
                  ))}
                </div>
              )}

              {/* Pagination Bar */}
              {totalItems > limitItems && (
                <div className="flex items-center justify-between pt-4 border-t border-forest/15 text-xs text-forest/70">
                  <span>
                    Showing {(discoverPage - 1) * limitItems + 1}–
                    {Math.min(discoverPage * limitItems, totalItems)} of {totalItems} resources
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={discoverPage <= 1}
                      onClick={() => setDiscoverPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl border border-forest/20 bg-white font-medium hover:bg-forest/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="font-semibold text-forest">Page {discoverPage}</span>
                    <button
                      type="button"
                      disabled={discoverPage * limitItems >= totalItems}
                      onClick={() => setDiscoverPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-xl border border-forest/20 bg-white font-medium hover:bg-forest/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: PROJECT LIBRARY (SAVED RESOURCES) */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Status Sub-Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-sand/30 border border-forest/15">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSavedStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  savedStatusFilter === 'ALL'
                    ? 'bg-forest text-sand'
                    : 'bg-white/80 border border-forest/15 text-forest hover:bg-forest/5'
                }`}
              >
                All Saved ({savedCounts.ALL})
              </button>

              <button
                type="button"
                onClick={() => setSavedStatusFilter(ResourceSaveInputStatus.CONSIDERING)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  savedStatusFilter === ResourceSaveInputStatus.CONSIDERING
                    ? 'bg-purple text-sand'
                    : 'bg-white/80 border border-forest/15 text-forest hover:bg-forest/5'
                }`}
              >
                Considering ({savedCounts.CONSIDERING})
              </button>

              <button
                type="button"
                onClick={() => setSavedStatusFilter(ResourceSaveInputStatus.TRYING)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  savedStatusFilter === ResourceSaveInputStatus.TRYING
                    ? 'bg-purple text-sand'
                    : 'bg-white/80 border border-forest/15 text-forest hover:bg-forest/5'
                }`}
              >
                Trying ({savedCounts.TRYING})
              </button>

              <button
                type="button"
                onClick={() => setSavedStatusFilter(ResourceSaveInputStatus.INTEGRATED)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  savedStatusFilter === ResourceSaveInputStatus.INTEGRATED
                    ? 'bg-emerald-700 text-sand'
                    : 'bg-white/80 border border-forest/15 text-forest hover:bg-forest/5'
                }`}
              >
                Integrated ({savedCounts.INTEGRATED})
              </button>
            </div>

            <button
              type="button"
              onClick={() => refetchSaved()}
              className="p-1.5 rounded-lg border border-forest/20 hover:bg-forest/5 text-forest/70 hover:text-forest transition-colors"
              title="Refresh saved library"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Loading */}
          {isSavedLoading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-forest" />
              <p className="text-sm font-medium text-forest/70">Loading saved project resources...</p>
            </div>
          )}

          {/* Error */}
          {savedError && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              Failed to load saved resources.
            </div>
          )}

          {/* Saved Grid */}
          {!isSavedLoading && !savedError && (
            <>
              {filteredSavedItems.length === 0 ? (
                <div className="text-center py-16 px-4 bg-sand/20 rounded-2xl border border-dashed border-forest/20 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center mx-auto text-forest">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-forest">No Saved Resources In This Category</h3>
                  <p className="text-xs text-forest/70 max-w-md mx-auto leading-relaxed">
                    Explore verified tools and repositories in the Discover tab and save them to track your
                    integration workflow.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest text-sand text-xs font-semibold hover:bg-forest/90 transition-colors shadow-sm"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Go to Discover Resources</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredSavedItems.map((item) => (
                    <ResourceCard
                      key={item.resource.id || item.resource.url}
                      resource={item.resource}
                      recommendation={item.recommendation}
                      saved={item.saved}
                      onSaveStatusChange={handleSaveStatusChange}
                      onRemoveSave={handleRemoveSave}
                      onSelect={(id) => setSelectedResourceId(id)}
                      isSaving={isSavingResource || isRemovingSave}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: SEARCH DIAGNOSTICS & HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-forest uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-purple" />
              <span>Search Execution Diagnostics</span>
            </h3>
            <button
              type="button"
              onClick={() => refetchHistory()}
              className="p-1.5 rounded-lg border border-forest/20 hover:bg-forest/5 text-forest/70 hover:text-forest transition-colors text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh History</span>
            </button>
          </div>

          {isHistoryLoading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-forest" />
              <p className="text-xs text-forest/75">Loading search diagnostics...</p>
            </div>
          )}

          {!isHistoryLoading && historyItems.length === 0 && (
            <div className="p-8 text-center bg-sand/20 rounded-2xl border border-forest/15 space-y-2">
              <p className="text-sm font-semibold text-forest">No Searches Executed Yet</p>
              <p className="text-xs text-forest/70">
                Trigger an automatic or manual search to inspect live provider telemetry and requirements extraction.
              </p>
            </div>
          )}

          {!isHistoryLoading && historyItems.length > 0 && (
            <div className="space-y-4">
              {historyItems.map((entry) => (
                <div
                  key={entry.id}
                  className="p-5 rounded-2xl bg-sand/30 border border-forest/15 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-forest text-sm">
                        {entry.query ? `"${entry.query}"` : 'Automatic AI Extraction'}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          entry.status === 'COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-800'
                            : 'bg-rose-500/15 text-rose-800'
                        }`}
                      >
                        {entry.status}
                      </span>
                      {entry.cached && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-forest/10 text-forest font-semibold">
                          Cached
                        </span>
                      )}
                      {entry.partial && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-800 font-semibold">
                          Partial
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-forest/65">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Requirements */}
                  {entry.requirements && entry.requirements.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-forest/70 uppercase tracking-wider">
                        Extracted Requirements:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.requirements.map((req, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-forest/5 border border-forest/10 text-[11px] text-forest font-medium"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Provider Diagnostic Queries */}
                  {entry.queries && entry.queries.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-forest/10">
                      <span className="text-[11px] font-bold text-forest/70 uppercase tracking-wider">
                        Provider Adapter Calls ({entry.queries.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {entry.queries.map((q) => (
                          <div
                            key={q.id}
                            className="p-2.5 rounded-xl bg-white border border-forest/10 text-[11px] space-y-1"
                          >
                            <div className="flex items-center justify-between font-semibold text-forest">
                              <span>{q.adapterName}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded ${
                                  q.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                                }`}
                              >
                                {q.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-forest/60 text-[10px]">
                              <span>{q.count} items</span>
                              <span>{q.durationMs}ms</span>
                            </div>
                            {q.error && (
                              <p className="text-[10px] text-rose-600 truncate" title={q.error}>
                                {q.error}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resource Detail Side Drawer */}
      <ResourceDetailDrawer
        resourceId={selectedResourceId}
        onClose={() => setSelectedResourceId(null)}
        recommendation={
          (selectedItem && 'recommendation' in selectedItem
            ? selectedItem.recommendation
            : (selectedItem as unknown as { ranking?: Record<string, unknown>; rankScore?: number })
            ? (selectedItem as unknown as Recommendation)
            : undefined)
        }
        saved={selectedItem && 'saved' in selectedItem ? selectedItem.saved : undefined}
        onSaveStatusChange={handleSaveStatusChange}
        onRemoveSave={handleRemoveSave}
        isSaving={isSavingResource || isRemovingSave}
      />
    </div>
  );
};
