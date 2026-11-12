import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Edit,
  Quote,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import type { ScoredAssumption } from '../../types/analysis';
import {
  getRiskLevelStyles,
  getStatusBadgeStyles,
} from '../../types/analysis';
import { AssumptionStatusModal } from './AssumptionStatusModal';

interface AssumptionExplorerProps {
  assumptions: ScoredAssumption[];
  onAssumptionUpdated?: (updated: ScoredAssumption) => void;
  selectedAssumptionId?: string | null;
}

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'PROBLEM', label: 'Problem' },
  { id: 'CUSTOMER', label: 'Customer' },
  { id: 'DEMAND', label: 'Demand' },
  { id: 'BEHAVIOUR', label: 'Behaviour' },
  { id: 'WILLINGNESS_TO_PAY', label: 'Willingness to Pay' },
  { id: 'TECHNICAL', label: 'Technical' },
  { id: 'DISTRIBUTION', label: 'Distribution' },
  { id: 'BUSINESS_MODEL', label: 'Business Model' },
  { id: 'COMPETITIVE', label: 'Competitive' },
  { id: 'OPERATIONAL', label: 'Operational' },
];

const STATUSES: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'All Statuses' },
  { id: 'UNTESTED', label: 'Untested' },
  { id: 'TESTING', label: 'Testing' },
  { id: 'SUPPORTED', label: 'Supported' },
  { id: 'INVALIDATED', label: 'Invalidated' },
  { id: 'INCONCLUSIVE', label: 'Inconclusive' },
];

export const AssumptionExplorer: React.FC<AssumptionExplorerProps> = ({
  assumptions,
  onAssumptionUpdated,
  selectedAssumptionId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'riskDesc' | 'riskAsc' | 'impact' | 'uncertainty' | 'title'>('riskDesc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    selectedAssumptionId ? new Set([selectedAssumptionId]) : new Set()
  );
  const [statusModalAssumption, setStatusModalAssumption] = useState<ScoredAssumption | null>(null);

  // If a selectedAssumptionId changes, expand it
  React.useEffect(() => {
    if (selectedAssumptionId) {
      setExpandedIds((prev) => new Set([...prev, selectedAssumptionId]));
    }
  }, [selectedAssumptionId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredAssumptions = useMemo(() => {
    return assumptions
      .filter((item) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchCat = item.category?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCat) return false;
        }

        // Category filter
        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'riskDesc') {
          return (b.riskScore || 0) - (a.riskScore || 0);
        }
        if (sortBy === 'riskAsc') {
          return (a.riskScore || 0) - (b.riskScore || 0);
        }
        if (sortBy === 'impact') {
          return b.impact - a.impact;
        }
        if (sortBy === 'uncertainty') {
          return b.uncertainty - a.uncertainty;
        }
        if (sortBy === 'title') {
          return (a.title || a.description).localeCompare(b.title || b.description);
        }
        return 0;
      });
  }, [assumptions, searchQuery, selectedCategory, selectedStatus, sortBy]);

  return (
    <div className="space-y-6">
      {/* Filter and Search Controls Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-forest/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hypotheses by title, category, or premise..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-sand border border-forest/20 text-xs text-forest placeholder:text-forest/40 focus:outline-none focus:border-purple"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-forest/50" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-2 px-3 rounded-xl bg-sand border border-forest/20 text-xs text-forest focus:outline-none focus:border-purple font-mono cursor-pointer"
            >
              <option value="riskDesc">Sort: Highest Risk (25 → 1)</option>
              <option value="riskAsc">Sort: Lowest Risk (1 → 25)</option>
              <option value="impact">Sort: Impact (High → Low)</option>
              <option value="uncertainty">Sort: Uncertainty (High → Low)</option>
              <option value="title">Sort: Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-forest/10 text-xs">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 no-scrollbar">
            <span className="text-[10px] font-mono text-forest/50 font-bold uppercase shrink-0 mr-1">
              Category:
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-forest text-sand font-bold'
                    : 'bg-sand border border-forest/15 text-forest/70 hover:text-forest'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 no-scrollbar shrink-0">
            <span className="text-[10px] font-mono text-forest/50 font-bold uppercase shrink-0 mr-1">
              Status:
            </span>
            {STATUSES.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                  selectedStatus === st.id
                    ? 'bg-purple text-white font-bold'
                    : 'bg-sand border border-forest/15 text-forest/70 hover:text-forest'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assumptions Count & Summary Bar */}
      <div className="flex items-center justify-between text-xs font-mono text-forest/60 px-1">
        <span>
          Showing <strong>{filteredAssumptions.length}</strong> of {assumptions.length} verified hypotheses
        </span>
        <span>Impact × Uncertainty deterministic heuristic</span>
      </div>

      {/* Assumptions List */}
      <div className="space-y-4">
        {filteredAssumptions.length === 0 ? (
          <div className="p-10 rounded-3xl bg-sand-light border border-forest/15 text-center text-forest/60 space-y-2">
            <HelpCircle className="w-8 h-8 mx-auto opacity-40 text-purple" />
            <p className="text-sm font-semibold">No hypotheses match your active filters.</p>
            <p className="text-xs font-sans">Try clearing search terms or resetting category filters.</p>
          </div>
        ) : (
          filteredAssumptions.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            const riskStyles = getRiskLevelStyles(item.riskLevel);
            const statusStyles = getStatusBadgeStyles(item.status);

            return (
              <motion.div
                key={item.id}
                layout
                className={`p-5 sm:p-6 rounded-3xl bg-sand-light border transition-all ${
                  isExpanded ? 'border-purple/40 shadow-md ring-1 ring-purple/20' : 'border-forest/15 hover:border-forest/30 shadow-sm'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 cursor-pointer" onClick={() => toggleExpand(item.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Risk Tier Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${riskStyles.bg} ${riskStyles.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${riskStyles.dot}`} />
                        {item.riskLevel} (Score: {item.riskScore}/25)
                      </span>

                      {/* Category Tag */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sand border border-forest/15 text-forest/70 uppercase">
                        {item.category}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-serif font-bold text-forest leading-snug">
                      {item.title || item.description}
                    </h3>
                  </div>

                  {/* Right Score Badges & Controls */}
                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                    {/* Impact & Uncertainty Badges */}
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="px-2 py-1 rounded-lg bg-sand border border-forest/10 text-forest/80" title="Impact on Business (1-5)">
                        Imp: <strong>{item.impact}</strong>/5
                      </span>
                      <span className="text-forest/30">×</span>
                      <span className="px-2 py-1 rounded-lg bg-sand border border-forest/10 text-forest/80" title="Uncertainty / Lack of Proof (1-5)">
                        Unc: <strong>{item.uncertainty}</strong>/5
                      </span>
                    </div>

                    {/* Manage Status Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusModalAssumption(item);
                      }}
                      className="p-2 rounded-xl bg-sand hover:bg-forest/5 border border-forest/15 text-forest/70 hover:text-forest transition-colors cursor-pointer"
                      title="Update assumption status"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    {/* Toggle Expand Icon */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="p-2 rounded-xl bg-sand hover:bg-forest/5 border border-forest/15 text-forest/70 hover:text-forest transition-colors cursor-pointer"
                      aria-label={isExpanded ? 'Collapse hypothesis details' : 'Expand hypothesis details'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Summary Description snippet */}
                <p className="text-xs sm:text-sm text-forest/80 font-sans mt-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Expandable Detail View */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-5 pt-5 border-t border-forest/10 space-y-4 text-xs font-sans"
                    >
                      {/* Rationale Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-sand border border-forest/10 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-forest/60 font-bold">
                            Impact Rationale (Why this is fatal)
                          </span>
                          <p className="text-forest/85 leading-relaxed font-sans">
                            {item.impactRationale || item.whyItMatters || 'High impact if assumption proves false.'}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-sand border border-forest/10 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-forest/60 font-bold">
                            Uncertainty Rationale (Why proof is lacking)
                          </span>
                          <p className="text-forest/85 leading-relaxed font-sans">
                            {item.uncertaintyRationale || 'Unverified in customer discovery or real spending.'}
                          </p>
                        </div>
                      </div>

                      {/* Grounding & Source Quote */}
                      {item.sourceQuote && (
                        <div className="p-3.5 rounded-2xl bg-purple/10 border border-purple/20 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-purple font-bold flex items-center gap-1">
                            <Quote className="w-3 h-3" /> Grounded in Submitted Concept ({item.grounding})
                          </span>
                          <p className="text-forest italic text-xs leading-relaxed">
                            "{item.sourceQuote}"
                          </p>
                        </div>
                      )}

                      {/* Evidence Required & Validation Method */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-sand border border-forest/10 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-forest/60 font-bold">
                            Evidence Required to Validate
                          </span>
                          <p className="text-forest/85 leading-relaxed font-sans">
                            {item.evidenceRequired}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-sand border border-forest/10 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-forest/60 font-bold">
                            Suggested Validation Method
                          </span>
                          <p className="text-forest/85 leading-relaxed font-sans">
                            {item.validationMethod}
                          </p>
                        </div>
                      </div>

                      {/* Suggested Mom Test Probe */}
                      {item.suggestedInterviewQuestion && (
                        <div className="p-3.5 rounded-2xl bg-forest/5 border border-forest/15 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-forest font-bold flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-purple" /> Suggested Mom Test Discovery Probe
                          </span>
                          <blockquote className="text-xs font-serif italic text-forest/90 pl-3 border-l-2 border-purple">
                            "{item.suggestedInterviewQuestion}"
                          </blockquote>
                          <p className="text-[10px] font-sans text-forest/60 mt-1">
                            Target Audience: <strong>{item.targetAudience}</strong>
                          </p>
                        </div>
                      )}

                      {/* Linked Evidence Records */}
                      {item.evidenceRecords && item.evidenceRecords.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Linked Customer Evidence ({item.evidenceRecords.length})
                          </span>
                          <div className="space-y-1.5">
                            {item.evidenceRecords.map((rec) => (
                              <div key={rec.id} className="p-2 rounded-xl bg-sand border border-forest/10 text-[11px]">
                                <span className="font-mono text-[9px] font-bold text-emerald-800 uppercase mr-1">
                                  [{rec.sentiment}]
                                </span>
                                <span className="italic">"{rec.quote}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-forest/10">
                        <span className="text-[10px] font-mono text-forest/50">
                          ID: {item.id}
                        </span>

                        <button
                          type="button"
                          onClick={() => setStatusModalAssumption(item)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" /> Transition Status
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Assumption Status Transition Modal */}
      {statusModalAssumption && (
        <AssumptionStatusModal
          isOpen={Boolean(statusModalAssumption)}
          onClose={() => setStatusModalAssumption(null)}
          assumption={statusModalAssumption}
          onSuccess={(updated) => {
            onAssumptionUpdated?.(updated);
            setStatusModalAssumption(null);
          }}
        />
      )}
    </div>
  );
};
