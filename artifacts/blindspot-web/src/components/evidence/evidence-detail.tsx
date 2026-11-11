import { motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import type { Assumption, Evidence } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { HypothesisRow } from '@/components/hypothesis';
import { fmtDate } from '@/lib/api';
import { isModelSuggestion } from '@/lib/evidence';
import { useFade } from '@/components/discovery/motion';
import { OriginTag, SentimentTag } from './evidence-library';

export function VerificationUnknown() {
  return (
    <p className="rounded border border-dashed border-[#1F3D2B]/25 px-2.5 py-2 text-[11px] leading-snug text-[#1F3D2B]/70" data-testid="evidence-verification-unknown">
      <strong className="font-medium text-[#1F3D2B]">Verification not exposed.</strong> The API does not return review history for this record, so it is shown neither as verified nor unverified.
    </p>
  );
}

export function EvidenceDetail({ e, assumption, rank, projectId, onOpenSource, onClose }: {
  e: Evidence; assumption: Assumption | undefined; rank: number; projectId: string; onOpenSource: (feedbackId: string) => void; onClose: () => void;
}) {
  const fade = useFade(6);
  return (
    <motion.article key={e.id} {...fade} className="space-y-4 rounded-md border border-[#1F3D2B]/20 bg-[#FFFDF8] p-4" data-testid="evidence-detail" aria-label="Evidence details">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow text-[#1F3D2B]">Evidence record</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close details" data-testid="evidence-detail-close"><X className="h-4 w-4" /></Button>
      </div>
      <blockquote className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words border-l-2 border-[#1F3D2B] pl-3 font-display text-lg italic leading-snug text-[#1F3D2B]">"{e.quote}"</blockquote>
      <div className="flex flex-wrap items-center gap-1.5"><SentimentTag s={e.sentiment} /><OriginTag origin={e.origin} /></div>
      {isModelSuggestion(e.origin) && <p className="text-[11px] text-[#5B33C9]">Suggested by the model. Review it before citing.</p>}
      {e.origin === 'HUMAN_MAPPING' && <p className="text-[11px] text-[#1F3D2B]/70">Linked manually when notes were recorded. The link itself carries no judgment.</p>}
      <div>
        <p className="eyebrow mb-1">Reasoning</p>
        <p className="whitespace-pre-wrap break-words text-sm text-[#1F3D2B]/85">{e.reasoning || 'No reasoning recorded.'}</p>
      </div>
      <dl className="grid gap-2 text-xs">
        {[['Evidence ID', e.id], ['Source feedback reference', e.feedbackId], ['Hypothesis reference', e.assumptionId], ['Recorded', fmtDate(e.createdAt)]].map(([k, v]) => (
          <div key={k} className="grid gap-0.5"><dt className="text-[#1F3D2B]/60">{k}</dt><dd className="break-all font-mono text-[11px] text-[#1F3D2B]">{v}</dd></div>
        ))}
      </dl>
      <VerificationUnknown />
      <Button variant="outline" className="w-full border-[#1F3D2B]/30 text-[#1F3D2B]" onClick={() => onOpenSource(e.feedbackId)} data-testid="evidence-open-source">
        <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />Locate original source note
      </Button>
      <div>
        <p className="eyebrow mb-2">Linked hypothesis</p>
        {assumption ? (
          <ol><HypothesisRow a={assumption} rank={rank} projectId={projectId} readOnly={false} /></ol>
        ) : (
          <p className="rounded border border-dashed p-2 text-xs text-muted-foreground">This hypothesis is not on the loaded page.</p>
        )}
      </div>
    </motion.article>
  );
}
