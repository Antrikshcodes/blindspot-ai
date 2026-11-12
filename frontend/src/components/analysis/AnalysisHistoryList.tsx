import React from 'react';
import { motion } from 'framer-motion';
import {
  History,
  Calendar,
  ArrowRight,
  CheckCircle,
  FileCode,
} from 'lucide-react';
import { useGetAnalysisHistory } from '../../api/analysisApi';
import type { AnalysisHistoryItem } from '../../types/analysis';

interface AnalysisHistoryListProps {
  projectId: string;
  activeAnalysisId?: string;
  onSelectAnalysis: (analysisId: string) => void;
}

export const AnalysisHistoryList: React.FC<AnalysisHistoryListProps> = ({
  projectId,
  activeAnalysisId,
  onSelectAnalysis,
}) => {
  const { data, isLoading } = useGetAnalysisHistory(projectId, {
    limit: 50,
  });

  const historyItems: AnalysisHistoryItem[] = data?.data?.items || [];

  if (isLoading) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-sand-light border border-forest/15 text-center text-forest space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-purple border-t-transparent animate-spin mx-auto" />
        <p className="text-xs font-mono text-forest/70">Loading analysis version history...</p>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="p-10 rounded-3xl bg-sand-light border border-forest/15 text-center text-forest/60 space-y-2">
        <History className="w-8 h-8 mx-auto opacity-40 text-purple" />
        <p className="text-sm font-semibold">No historical analysis versions found.</p>
        <p className="text-xs font-sans">Run your first AI idea deconstruction to record version 1.</p>
      </div>
    );
  }

  // Find max version to mark as latest
  const maxVersion = Math.max(...historyItems.map((h) => h.version));

  return (
    <div className="space-y-4">
      <div className="p-4 sm:p-5 rounded-2xl bg-sand-light border border-forest/15 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-serif font-bold text-forest flex items-center gap-2">
            <History className="w-4 h-4 text-purple" /> Analysis Version History
          </h3>
          <p className="text-xs text-forest/70 font-sans mt-0.5">
            Every analysis run creates an immutable snapshot. You can inspect any past iteration.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-forest/60 bg-sand px-3 py-1 rounded-full border border-forest/10">
          {historyItems.length} Record{historyItems.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-3">
        {historyItems.map((item) => {
          const isLatest = item.version === maxVersion;
          const isActive = item.id === activeAnalysisId;
          const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isActive
                  ? 'bg-sand-light border-purple shadow-md ring-1 ring-purple/30'
                  : 'bg-sand-light border-forest/15 hover:border-forest/30 shadow-sm'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold bg-forest text-sand px-3 py-0.5 rounded-full">
                    Version {item.version}
                  </span>

                  {isLatest && (
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Latest
                    </span>
                  )}

                  {isActive && (
                    <span className="text-[10px] font-mono font-bold bg-purple/15 text-purple border border-purple/30 px-2 py-0.5 rounded-full">
                      Currently Viewing
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-forest/60 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-forest/40" /> {dateStr}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-purple" /> {item.model || 'openai:gpt-4o'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectAnalysis(item.id)}
                  disabled={isActive}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-purple/20 text-purple cursor-default opacity-80'
                      : 'bg-forest text-sand hover:bg-forest-light'
                  }`}
                >
                  {isActive ? 'Active Report' : 'Load This Report'}
                  {!isActive && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
