import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  Sparkles,
  Shield,
  Code2,
  Calendar,
  Layers,
  Star,
  GitFork,
  Download,
  AlertCircle,
  BookmarkCheck,
  Bookmark,
  Loader2,
  Info,
} from 'lucide-react';
import { useGetResource } from '../../api/resourceApi';
import type { Recommendation, SavedResource } from '../../types/resources';
import {
  ResourceSaveInputStatus,
  formatCategoryLabel,
  getProviderBadgeStyles,
  getSaveStatusBadgeStyles,
} from '../../types/resources';

interface ResourceDetailDrawerProps {
  resourceId: string | null;
  onClose: () => void;
  recommendation?: Recommendation;
  saved?: SavedResource | null;
  onSaveStatusChange: (resourceId: string, status: ResourceSaveInputStatus) => Promise<void>;
  onRemoveSave: (resourceId: string) => Promise<void>;
  isSaving?: boolean;
}

export const ResourceDetailDrawer: React.FC<ResourceDetailDrawerProps> = ({
  resourceId,
  onClose,
  recommendation,
  saved,
  onSaveStatusChange,
  onRemoveSave,
  isSaving = false,
}) => {
  const { data: resourceData, isLoading, error } = useGetResource(resourceId || '', {
    query: {
      enabled: Boolean(resourceId),
    },
  });

  const resource = resourceData?.data;
  const isSaved = Boolean(saved);
  const saveStatus = saved?.status as ResourceSaveInputStatus | undefined;
  const statusStyles = saveStatus ? getSaveStatusBadgeStyles(saveStatus) : null;

  const quality = resource?.qualitySignals || {};
  const explanation = recommendation?.explanation;
  const ranking = (recommendation?.ranking || {}) as Record<string, unknown>;

  return (
    <AnimatePresence>
      {Boolean(resourceId) && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-forest/40 backdrop-blur-sm z-40"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden border-l border-forest/15"
          >
            {/* Header */}
            <div className="p-6 border-b border-forest/15 bg-sand/30 flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {resource && (
                    <>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-forest/10 text-forest border border-forest/20">
                        {formatCategoryLabel(resource.category)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          getProviderBadgeStyles(resource.provider).bg
                        } ${getProviderBadgeStyles(resource.provider).text} ${
                          getProviderBadgeStyles(resource.provider).border
                        }`}
                      >
                        {resource.provider.replace(/_/g, ' ')}
                      </span>
                    </>
                  )}
                </div>

                <h3 className="text-xl font-bold text-forest truncate">
                  {resource?.name || 'Resource Details'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {resource?.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-forest/70 hover:text-forest hover:bg-forest/10 transition-colors"
                    title="Open official resource link"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-forest/70 hover:text-forest hover:bg-forest/10 transition-colors"
                  title="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoading && (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-forest/60">
                  <Loader2 className="w-8 h-8 animate-spin text-forest" />
                  <p className="text-sm">Fetching verified resource metadata...</p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Failed to load resource details</p>
                    <p className="text-xs text-rose-700/80 mt-1">
                      {error instanceof Error ? error.message : 'Please check your connection.'}
                    </p>
                  </div>
                </div>
              )}

              {resource && (
                <>
                  {/* Save Status & Action Controls */}
                  <div className="p-4 rounded-2xl bg-sand/40 border border-forest/15 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isSaved ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                              statusStyles?.bg || 'bg-forest/10'
                            } ${statusStyles?.text || 'text-forest'} ${statusStyles?.border || 'border-forest/20'}`}
                          >
                            <BookmarkCheck className="w-3.5 h-3.5" />
                            {saveStatus}
                          </span>
                          <span className="text-xs text-forest/70">in your project library</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-forest/75 font-medium">
                          <Bookmark className="w-4 h-4 text-forest/60" />
                          <span>Not saved in this project yet</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Update Resource Save Status"
                        value={saveStatus || ''}
                        disabled={isSaving}
                        onChange={async (e) => {
                          const val = e.target.value as ResourceSaveInputStatus;
                          if (val && resource.id) {
                            await onSaveStatusChange(resource.id, val);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-forest/20 text-forest focus:outline-none focus:ring-2 focus:ring-forest/30"
                      >
                        <option value="" disabled>
                          {isSaved ? 'Change Status' : 'Save Status...'}
                        </option>
                        <option value={ResourceSaveInputStatus.CONSIDERING}>Mark as Considering</option>
                        <option value={ResourceSaveInputStatus.TRYING}>Mark as Trying</option>
                        <option value={ResourceSaveInputStatus.INTEGRATED}>Mark as Integrated</option>
                      </select>

                      {isSaved && (
                        <button
                          type="button"
                          onClick={() => resource.id && onRemoveSave(resource.id)}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-forest uppercase tracking-wider">
                      Source Description
                    </h4>
                    <p className="text-sm text-forest/85 leading-relaxed bg-sand/20 p-4 rounded-xl border border-forest/10">
                      {resource.description || 'No description provided by source provider.'}
                    </p>
                  </div>

                  {/* Multi-Criteria Ranking Breakdown */}
                  {recommendation && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-forest" />
                          <span>Ranking & Scoring Breakdown</span>
                        </h4>
                        <span className="text-xs font-bold text-forest bg-forest/10 px-2.5 py-0.5 rounded-full border border-forest/20">
                          Overall Rank: {Math.round(recommendation.rankScore * 100)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {ranking &&
                          Object.entries(ranking).map(([key, value]) => (
                            <div
                              key={key}
                              className="p-3 rounded-xl bg-sand/30 border border-forest/10 flex flex-col justify-between"
                            >
                              <span className="text-[11px] text-forest/70 uppercase tracking-wide">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className="text-sm font-bold text-forest mt-1">
                                {typeof value === 'number'
                                  ? `${Math.round(value * 100)}%`
                                  : String(value ?? '—')}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Quality & Maintenance Signals */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-forest uppercase tracking-wider">
                      Provider Quality Signals
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-sand/20 border border-forest/10 flex flex-col items-center justify-center text-center">
                        <Star className="w-4 h-4 text-amber-500 mb-1" />
                        <span className="text-sm font-bold text-forest">
                          {quality.stars?.toLocaleString() ?? '—'}
                        </span>
                        <span className="text-[10px] text-forest/60">Stars</span>
                      </div>

                      <div className="p-3 rounded-xl bg-sand/20 border border-forest/10 flex flex-col items-center justify-center text-center">
                        <GitFork className="w-4 h-4 text-forest/60 mb-1" />
                        <span className="text-sm font-bold text-forest">
                          {quality.forks?.toLocaleString() ?? '—'}
                        </span>
                        <span className="text-[10px] text-forest/60">Forks</span>
                      </div>

                      <div className="p-3 rounded-xl bg-sand/20 border border-forest/10 flex flex-col items-center justify-center text-center">
                        <Download className="w-4 h-4 text-forest/60 mb-1" />
                        <span className="text-sm font-bold text-forest">
                          {quality.downloads?.toLocaleString() ?? '—'}
                        </span>
                        <span className="text-[10px] text-forest/60">Downloads</span>
                      </div>

                      <div className="p-3 rounded-xl bg-sand/20 border border-forest/10 flex flex-col items-center justify-center text-center">
                        <Shield className="w-4 h-4 text-forest/60 mb-1" />
                        <span className="text-sm font-bold text-forest truncate max-w-[90px]">
                          {resource.license || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-forest/60">License</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-forest/5 text-[11px] text-forest/70 border border-forest/10">
                      <Info className="w-3.5 h-3.5 text-forest/60 mt-0.5 shrink-0" />
                      <p>
                        Provider counts reflect upstream platform stats and are not an official certification of production readiness.
                      </p>
                    </div>
                  </div>

                  {/* AI Explanation Section */}
                  {explanation && (
                    <div className="space-y-3 p-4 rounded-2xl bg-purple/5 border border-purple/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple uppercase tracking-wider">
                          <Sparkles className="w-4 h-4 text-purple" />
                          <span>AI Intelligence Suggestion</span>
                        </div>
                        <span className="text-[10px] font-semibold text-purple bg-purple/10 px-2.5 py-0.5 rounded-full border border-purple/20">
                          Review Required
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-semibold text-forest">Recommended Use Case:</span>
                          <p className="text-forest/80 mt-0.5">{explanation.recommendedUseCase}</p>
                        </div>

                        <div>
                          <span className="font-semibold text-forest">Implementation Rationale:</span>
                          <p className="text-forest/80 mt-0.5 leading-relaxed">{explanation.explanation}</p>
                        </div>

                        {explanation.integrationDifficulty && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-forest">Estimated Difficulty:</span>
                            <span className="px-2 py-0.5 rounded-md bg-purple/10 text-purple font-bold text-[11px]">
                              {explanation.integrationDifficulty}
                            </span>
                          </div>
                        )}

                        {explanation.limitations && explanation.limitations.length > 0 && (
                          <div className="pt-2 border-t border-purple/15">
                            <span className="font-semibold text-forest">Known Limitations & Constraints:</span>
                            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-forest/80">
                              {explanation.limitations.map((limit, idx) => (
                                <li key={idx}>{limit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Source & Technical Metadata Table */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-forest uppercase tracking-wider">
                      Technical & Source Metadata
                    </h4>

                    <div className="rounded-xl border border-forest/15 divide-y divide-forest/10 text-xs">
                      <div className="p-3 flex items-center justify-between bg-sand/10">
                        <span className="text-forest/70">External ID</span>
                        <code className="text-forest font-mono text-[11px] bg-forest/5 px-2 py-0.5 rounded">
                          {resource.externalId}
                        </code>
                      </div>

                      {resource.language && (
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-forest/70 flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5" />
                            Language
                          </span>
                          <span className="font-semibold text-forest">{resource.language}</span>
                        </div>
                      )}

                      {resource.sourceUpdatedAt && (
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-forest/70 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Source Last Updated
                          </span>
                          <span className="text-forest font-medium">
                            {new Date(resource.sourceUpdatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {resource.tags && resource.tags.length > 0 && (
                        <div className="p-3 space-y-1.5">
                          <span className="text-forest/70 block">Provider Tags</span>
                          <div className="flex flex-wrap gap-1">
                            {resource.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-sand border border-forest/10 text-[10px] text-forest/80 font-mono"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-5 border-t border-forest/15 bg-sand/30 flex items-center justify-between gap-3">
              {resource?.url ? (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-forest text-sand hover:bg-forest/90 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Visit Upstream Repository</span>
                </a>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-forest/20 text-forest hover:bg-forest/5 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
