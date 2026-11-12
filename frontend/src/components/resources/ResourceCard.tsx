import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Star,
  GitFork,
  Download,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ChevronRight,
  Shield,
  Code2,
  CheckCircle,
  Loader2,
  Layers,
} from 'lucide-react';
import type { Resource, Recommendation, SavedResource } from '../../types/resources';
import {
  ResourceSaveInputStatus,
  formatCategoryLabel,
  getProviderBadgeStyles,
  getSaveStatusBadgeStyles,
} from '../../types/resources';

interface ResourceCardProps {
  resource: Resource;
  recommendation?: Recommendation;
  saved?: SavedResource | null;
  onSaveStatusChange: (resourceId: string, status: ResourceSaveInputStatus) => Promise<void>;
  onRemoveSave: (resourceId: string) => Promise<void>;
  onSelect: (resourceId: string) => void;
  isSaving?: boolean;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  recommendation,
  saved,
  onSaveStatusChange,
  onRemoveSave,
  onSelect,
  isSaving = false,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const providerStyles = getProviderBadgeStyles(resource.provider);
  const isSaved = Boolean(saved);
  const saveStatus = saved?.status as ResourceSaveInputStatus | undefined;
  const statusStyles = saveStatus ? getSaveStatusBadgeStyles(saveStatus) : null;

  const quality = resource.qualitySignals || {};
  const explanation = recommendation?.explanation;

  const rankPercent = typeof recommendation?.rankScore === 'number'
    ? Math.round(recommendation.rankScore * 100)
    : null;
  const relevancePercent = typeof recommendation?.relevanceScore === 'number'
    ? Math.round(recommendation.relevanceScore * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`relative group bg-white/80 backdrop-blur-sm border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
        isSaved ? 'border-forest/40 ring-1 ring-forest/15' : 'border-forest/15 hover:border-forest/30'
      }`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Badge */}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-forest/10 text-forest border border-forest/20">
              {formatCategoryLabel(resource.category)}
            </span>

            {/* Provider Badge */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${providerStyles.bg} ${providerStyles.text} ${providerStyles.border}`}
            >
              {resource.provider.replace(/_/g, ' ')}
            </span>

            {/* Language if present */}
            {resource.language && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sand/80 text-forest/80 border border-forest/10">
                <Code2 className="w-3 h-3" />
                {resource.language}
              </span>
            )}
          </div>

          {/* Quick External Link */}
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-forest/60 hover:text-forest hover:bg-forest/5 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Resource Title & Actionable Click Area */}
        <div
          onClick={() => resource.id && onSelect(resource.id)}
          className="cursor-pointer group/title"
        >
          <h4 className="text-base font-bold text-forest group-hover/title:text-purple transition-colors flex items-center justify-between">
            <span className="line-clamp-1">{resource.name}</span>
            <ChevronRight className="w-4 h-4 text-forest/40 group-hover/title:translate-x-1 group-hover/title:text-purple transition-all shrink-0 ml-1" />
          </h4>

          <p className="text-xs text-forest/75 mt-1.5 line-clamp-2 leading-relaxed">
            {resource.description || 'No description provided by source repository.'}
          </p>
        </div>

        {/* Signals & Heuristics Bar */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-forest/10 text-xs">
          {/* Rank & Relevance Pills if available from backend */}
          {rankPercent !== null && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-forest/5 border border-forest/15"
              title="Calculated multi-criteria ranking based on relevance, maintenance, documentation, and licensing."
            >
              <Layers className="w-3.5 h-3.5 text-forest" />
              <span className="text-[11px] text-forest/70 font-medium">Rank</span>
              <span className="text-xs font-bold text-forest">{rankPercent}%</span>
            </div>
          )}

          {relevancePercent !== null && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-forest/5 border border-forest/15"
              title="Semantic relevance to your project's problem space and tech requirements."
            >
              <span className="text-[11px] text-forest/70 font-medium">Relevance</span>
              <span className="text-xs font-bold text-forest">{relevancePercent}%</span>
            </div>
          )}

          {/* Popularity Metrics (Informational Signals Only) */}
          <div className="flex items-center gap-2.5 ml-auto text-forest/65 text-xs">
            {typeof quality.stars === 'number' && quality.stars > 0 && (
              <span className="flex items-center gap-1" title="Stars (Informational signal, not an AI quality guarantee)">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
                <span>{quality.stars.toLocaleString()}</span>
              </span>
            )}

            {typeof quality.forks === 'number' && quality.forks > 0 && (
              <span className="flex items-center gap-1" title="Forks">
                <GitFork className="w-3.5 h-3.5 text-forest/60" />
                <span>{quality.forks.toLocaleString()}</span>
              </span>
            )}

            {typeof quality.downloads === 'number' && quality.downloads > 0 && (
              <span className="flex items-center gap-1" title="Downloads">
                <Download className="w-3.5 h-3.5 text-forest/60" />
                <span>{quality.downloads.toLocaleString()}</span>
              </span>
            )}

            {resource.license && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-forest/5 text-[10px] font-medium text-forest/80 border border-forest/10" title={`License: ${resource.license}`}>
                <Shield className="w-3 h-3 text-forest/60" />
                <span className="truncate max-w-[80px]">{resource.license}</span>
              </span>
            )}
          </div>
        </div>

        {/* AI Explanation Callout (If Available) */}
        {explanation && (
          <div className="mt-3 p-3 rounded-xl bg-purple/5 border border-purple/20 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] font-bold text-purple uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-purple" />
                AI Suggestion • Review Required
              </span>
              {explanation.integrationDifficulty && (
                <span className="text-[10px] font-semibold text-purple/80 bg-purple/10 px-2 py-0.5 rounded-full">
                  {explanation.integrationDifficulty} Integration
                </span>
              )}
            </div>
            <p className="text-forest/80 text-[11px] line-clamp-2 leading-relaxed">
              {explanation.explanation || explanation.recommendedUseCase}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-4 pt-3 border-t border-forest/10 flex items-center justify-between gap-3">
        {/* Save Status Button & Menu */}
        <div className="relative">
          {isSaved ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  statusStyles?.bg || 'bg-forest/10'
                } ${statusStyles?.text || 'text-forest'} ${statusStyles?.border || 'border-forest/20'}`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>{saveStatus || 'SAVED'}</span>
              </button>

              <button
                type="button"
                onClick={() => resource.id && onRemoveSave(resource.id)}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-forest/50 hover:text-rose-600 hover:bg-rose-50 transition-colors text-xs"
                title="Remove from saved library"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Remove'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-sand/60 hover:bg-forest/10 text-forest border border-forest/20 hover:border-forest/40 transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-forest/70" />
              )}
              <span>Save Resource</span>
            </button>
          )}

          {/* Quick Status Dropdown Menu */}
          {showStatusMenu && (
            <div
              className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-lg border border-forest/20 py-1.5 z-20 space-y-0.5 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1 text-[10px] font-bold text-forest/60 uppercase tracking-wider">
                Select Library Status
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (resource.id) {
                    await onSaveStatusChange(resource.id, ResourceSaveInputStatus.CONSIDERING);
                    setShowStatusMenu(false);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-forest/5 transition-colors ${
                  saveStatus === ResourceSaveInputStatus.CONSIDERING ? 'font-bold text-purple' : 'text-forest'
                }`}
              >
                <span>Considering</span>
                {saveStatus === ResourceSaveInputStatus.CONSIDERING && (
                  <CheckCircle className="w-3.5 h-3.5 text-purple" />
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (resource.id) {
                    await onSaveStatusChange(resource.id, ResourceSaveInputStatus.TRYING);
                    setShowStatusMenu(false);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-forest/5 transition-colors ${
                  saveStatus === ResourceSaveInputStatus.TRYING ? 'font-bold text-purple' : 'text-forest'
                }`}
              >
                <span>Trying</span>
                {saveStatus === ResourceSaveInputStatus.TRYING && (
                  <CheckCircle className="w-3.5 h-3.5 text-purple" />
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (resource.id) {
                    await onSaveStatusChange(resource.id, ResourceSaveInputStatus.INTEGRATED);
                    setShowStatusMenu(false);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-forest/5 transition-colors ${
                  saveStatus === ResourceSaveInputStatus.INTEGRATED ? 'font-bold text-emerald-700' : 'text-forest'
                }`}
              >
                <span>Integrated</span>
                {saveStatus === ResourceSaveInputStatus.INTEGRATED && (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* View Details CTA */}
        <button
          type="button"
          onClick={() => resource.id && onSelect(resource.id)}
          className="text-xs font-semibold text-purple hover:text-purple/80 transition-colors flex items-center gap-1"
        >
          <span>View Details</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
