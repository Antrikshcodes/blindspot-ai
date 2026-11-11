import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Chip } from '@/components/kit';
import type { Relationship } from '@/lib/evidence';
import { useFade } from '@/components/discovery/motion';
import { OriginTag, SentimentTag } from './evidence-library';

export function EvidenceRelationships({ rels, selectedEvidenceId, focusedAssumptionId, onSelectEvidence }: { rels: Relationship[]; selectedEvidenceId: string | null; focusedAssumptionId?: string | null; onSelectEvidence: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(focusedAssumptionId ?? null);
  useEffect(() => { if (focusedAssumptionId) setOpen(focusedAssumptionId); }, [focusedAssumptionId]);
  const fade = useFade(4);
  return (
    <div data-testid="evidence-relationships" className="space-y-2">
      <p className="text-xs text-[#1F3D2B]/70">Links use each record's exact hypothesis reference. Supporting and challenging counts describe sentiment, not human verification. Mixed sentiment is not a proven contradiction.</p>
      <ul className="space-y-2">
        {rels.map(({ assumption: a, records, tally: t }) => {
          const isOpen = open === a.id;
          return (
            <li key={a.id} className="rounded-md border border-[#1F3D2B]/15 bg-[#FFFDF8]" data-testid={`relationship-${a.id}`}>
              <button type="button" onClick={() => setOpen(isOpen ? null : a.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-3 text-left" data-testid={`relationship-toggle-${a.id}`}>
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex flex-wrap gap-1.5"><Chip value={a.status} /><Chip value="x">{a.category}</Chip>{t.mixed && <span className="rounded-sm border border-[#8B5CF6]/40 px-1.5 py-0.5 text-[10.5px] text-[#5B33C9]">Mixed sentiment</span>}</span>
                  <span className="block break-words text-sm text-[#1F3D2B]">{a.description}</span>
                  <span className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10.5px] text-[#1F3D2B]/65">
                    <span>{t.total} linked</span><span>{t.supporting} supporting</span><span>{t.challenging} challenging</span><span>{t.neutral} neutral</span><span>{t.sources} source note{t.sources === 1 ? '' : 's'}</span>
                  </span>
                </span>
                <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-[#1F3D2B]/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div {...fade} className="border-t border-[#1F3D2B]/10 p-3">
                    {records.length === 0 ? <p className="text-xs italic text-[#1F3D2B]/60">No linked evidence was returned for this hypothesis. This view cannot establish its strength or verification history.</p> : (
                      <ul className="space-y-1.5">
                        {records.map((e) => (
                          <li key={e.id}>
                            <button type="button" onClick={() => onSelectEvidence(e.id)} className={`w-full rounded border p-2 text-left text-xs transition-colors ${selectedEvidenceId === e.id ? 'border-[#1F3D2B] bg-[#1F3D2B]/5' : 'border-[#1F3D2B]/10 hover:border-[#1F3D2B]/35'}`} data-testid={`relationship-evidence-${e.id}`}>
                              <span className="line-clamp-2 break-words font-display text-sm italic">"{e.quote}"</span>
                              <span className="mt-1 flex flex-wrap gap-1.5"><SentimentTag s={e.sentiment} /><OriginTag origin={e.origin} /></span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
