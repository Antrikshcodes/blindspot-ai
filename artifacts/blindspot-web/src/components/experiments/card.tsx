import { motion } from 'framer-motion';
import type { Experiment } from '@workspace/api-client-react';
import { Chip } from '@/components/kit';
import { fmtDate } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/experiments';
import { useStagger } from '@/components/discovery/motion';
import { wrap } from './ui';

export function ExperimentCard({ e, i, selected, hypothesis, onSelect }: { e: Experiment; i: number; selected: boolean; hypothesis?: string; onSelect: () => void }) {
  const stagger = useStagger();
  return (
    <motion.li {...stagger(i)} className="min-w-0">
      <button type="button" onClick={onSelect} aria-pressed={selected} data-testid={`card-experiment-${e.id}`}
        className={`w-full min-w-0 rounded-lg border p-3.5 text-left transition-colors ${selected ? 'border-[#1F3D2B] bg-[#1F3D2B]/[0.06] ring-1 ring-[#1F3D2B]' : 'border-[#1F3D2B]/12 bg-[#FBF8F1] hover:border-[#1F3D2B]/40'}`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className={`min-w-0 font-display text-base leading-snug text-[#1F3D2B] ${wrap}`}>{e.name}</h3>
          <Chip value={e.status}>{STATUS_LABEL[e.status] ?? e.status}</Chip>
        </div>
        <p className={`mt-1 line-clamp-2 text-xs text-[#1F3D2B]/85 ${wrap}`}>{e.explanation}</p>
        <p className={`mt-1 line-clamp-2 text-xs text-muted-foreground ${wrap}`}>{hypothesis ? `Tests: ${hypothesis}` : <span className="font-mono">assumption {e.assumptionId.slice(0, 8)}</span>}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 font-mono text-[10px] text-muted-foreground">
          <span>created {fmtDate(e.createdAt)}</span>
          <span>updated {fmtDate(e.updatedAt)}</span>
          {e.observedResult?.trim() ? <span className="text-[#1F3D2B]">observation recorded</span> : null}
        </div>
      </button>
    </motion.li>
  );
}
