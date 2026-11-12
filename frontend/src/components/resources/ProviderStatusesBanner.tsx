import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Layers,
} from 'lucide-react';
import type { ProviderStatus } from '../../types/resources';

interface ProviderStatusesBannerProps {
  cached?: boolean;
  partial?: boolean;
  explanationStatus?: string;
  explanationError?: string | null;
  requirements?: string[];
  providerStatuses?: Record<string, { status: string; count?: number; error?: string; durationMs?: number }> | ProviderStatus[];
  searchTime?: string;
  totalResults?: number;
}

export const ProviderStatusesBanner: React.FC<ProviderStatusesBannerProps> = ({
  cached = false,
  partial = false,
  explanationStatus,
  explanationError,
  requirements = [],
  providerStatuses,
  totalResults,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Normalize provider statuses to a consistent array
  const normalizedProviders: Array<{ name: string; status: string; count?: number; error?: string; durationMs?: number }> = [];

  if (Array.isArray(providerStatuses)) {
    providerStatuses.forEach((p) => {
      normalizedProviders.push({
        name: p.provider || 'unknown',
        status: p.status || 'UNKNOWN',
        count: p.count,
        error: p.error,
        durationMs: (p as { durationMs?: number }).durationMs,
      });
    });
  } else if (providerStatuses && typeof providerStatuses === 'object') {
    Object.entries(providerStatuses).forEach(([name, data]) => {
      normalizedProviders.push({
        name,
        status: data?.status || 'UNKNOWN',
        count: data?.count,
        error: data?.error,
        durationMs: data?.durationMs,
      });
    });
  }

  const failedCount = normalizedProviders.filter((p) => p.status === 'FAILED' || p.status === 'ERROR').length;
  const successCount = normalizedProviders.filter((p) => p.status === 'SUCCESS').length;

  return (
    <div className="bg-sand/40 border border-forest/15 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Top Bar / Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest text-sand text-xs font-semibold tracking-wide">
            <Server className="w-3.5 h-3.5" />
            <span>Search Providers</span>
            <span className="ml-1 px-1.5 py-0.2 bg-sand/20 rounded-full text-[11px]">
              {successCount}/{normalizedProviders.length || 'Ready'}
            </span>
          </div>

          {cached && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest/10 text-forest text-xs font-medium border border-forest/20">
              <Clock className="w-3 h-3 text-forest/70" />
              Cached Result
            </span>
          )}

          {partial && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-900 text-xs font-semibold border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              Partial Provider Results
            </span>
          )}

          {explanationStatus && explanationStatus !== 'COMPLETED' && explanationStatus !== 'SUCCESS' && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple/15 text-purple text-xs font-semibold border border-purple/30">
              <Sparkles className="w-3 h-3 text-purple" />
              Explanations {explanationStatus === 'PENDING' ? 'Processing' : 'Unavailable'}
            </span>
          )}

          {typeof totalResults === 'number' && (
            <span className="text-xs text-forest/70 font-medium ml-1">
              Found <strong className="text-forest font-bold">{totalResults}</strong> relevant resources
            </span>
          )}
        </div>

        {normalizedProviders.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-forest/80 hover:text-forest transition-colors py-1 px-2 rounded-lg hover:bg-forest/5"
          >
            <span>{isExpanded ? 'Hide Provider Details' : 'View Provider Diagnostics'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Partial Warning Message if any provider failed */}
      {partial && (
        <div className="bg-amber-50/80 border border-amber-300/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold">
              {failedCount} of {normalizedProviders.length} providers experienced rate limits or connection timeouts.
            </p>
            <p className="text-amber-800/80">
              Showing authentic results from responding providers. No placeholder or mock data was fabricated.
            </p>
          </div>
        </div>
      )}

      {/* Explanation Error Notice */}
      {explanationError && (
        <div className="bg-purple/10 border border-purple/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-purple">
          <Sparkles className="w-4 h-4 text-purple mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">AI Explanations Note</p>
            <p className="text-forest/80 mt-0.5">{explanationError}</p>
          </div>
        </div>
      )}

      {/* Extracted Requirements Chips */}
      {requirements.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-forest uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5 text-forest/70" />
            <span>Extracted Product Requirements ({requirements.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {requirements.map((req, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-forest/5 border border-forest/15 text-forest text-xs font-medium"
              >
                {req}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Provider Diagnostics Grid */}
      <AnimatePresence>
        {isExpanded && normalizedProviders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 border-t border-forest/10 pt-3">
              {normalizedProviders.map((provider) => {
                const isSuccess = provider.status === 'SUCCESS';
                const isFailed = provider.status === 'FAILED' || provider.status === 'ERROR';
                const isEmpty = provider.status === 'EMPTY';

                return (
                  <div
                    key={provider.name}
                    className="p-3 rounded-xl bg-sand/60 border border-forest/15 flex flex-col justify-between text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-forest uppercase tracking-wider text-[11px]">
                        {provider.name.replace(/_/g, ' ')}
                      </span>
                      {isSuccess && (
                        <span className="flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded-full text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          SUCCESS
                        </span>
                      )}
                      {isEmpty && (
                        <span className="flex items-center gap-1 text-forest/70 font-medium bg-forest/10 px-2 py-0.5 rounded-full text-[10px]">
                          NO MATCHES
                        </span>
                      )}
                      {isFailed && (
                        <span className="flex items-center gap-1 text-rose-800 font-semibold bg-rose-500/15 px-2 py-0.5 rounded-full text-[10px]">
                          <XCircle className="w-3 h-3 text-rose-700" />
                          FAILED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-forest/70 text-[11px]">
                      <span>{provider.count ?? 0} resources</span>
                      {typeof provider.durationMs === 'number' && (
                        <span className="text-[10px] text-forest/60">
                          {provider.durationMs}ms
                        </span>
                      )}
                    </div>

                    {provider.error && (
                      <p className="text-[10px] text-rose-800 truncate" title={provider.error}>
                        {provider.error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

