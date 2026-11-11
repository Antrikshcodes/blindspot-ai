import type { Explanation } from '@workspace/api-client-react';
import { AiTag } from '@/components/resource-search/detail';
import { backendScore, readRanking } from '@/lib/resource-ranking';

export type ReasonRec = {
  relevanceScore: number;
  qualityScore: number;
  rankScore: number;
  ranking: Record<string, unknown>;
  explanation: Explanation | null;
};

/** Display-only percent of a server-returned weight. Never normalised or recomputed. */
export const fmtWeight = (w: number | null) => (w === null ? 'Not returned' : `${Math.round(w * 1000) / 10}%`);
const NOTE_LABELS: Record<string, string> = {
  semanticMethod: 'Semantic method',
  technicalCompatibility: 'Technical compatibility',
  maintenanceStatus: 'Maintenance status',
  licenseStatus: 'License status',
  licenseCompatibility: 'License compatibility',
  documentationStatus: 'Documentation status',
  integrationDifficulty: 'Integration difficulty (server note)',
  confidence: 'Confidence (server note)',
};

/** Replaces the legacy ranking + explanation sections in the shared detail sheet. */
export function RecommendationReason({ rec, rid }: { rec: ReasonRec; rid: string }) {
  const r = readRanking(rec.ranking);
  const rank = backendScore(rec.rankScore);
  const rel = backendScore(rec.relevanceScore);
  const qual = backendScore(rec.qualityScore);
  const notes = Object.entries(NOTE_LABELS).filter(([k]) => r.notes[k as keyof typeof r.notes]);
  return (
    <div className="space-y-5" data-testid={`recommendation-reason-${rid}`}>
      <section className="rounded-lg border border-[#1F3D2B]/15 bg-[#FBF7EE] p-4">
        <p className="eyebrow mb-2">Why this resource?</p>
        {r.notes.explanation
          ? <p className="break-words text-sm leading-relaxed text-[#1F3D2B]">{r.notes.explanation}</p>
          : <p className="text-sm italic text-[#1F3D2B]/60">Returned by the project search. The server did not include a written ranking reason.</p>}
        {r.matchedTerms.length > 0 && (
          <div className="mt-3">
            <p className="eyebrow mb-1">Matched terms</p>
            <ul className="flex flex-wrap gap-1.5">{r.matchedTerms.map((t) => <li key={t} className="rounded-sm bg-[#E8DCC4] px-1.5 py-0.5 font-mono text-[11px] text-[#1F3D2B]">{t}</li>)}</ul>
          </div>
        )}
      </section>

      <section>
        <p className="eyebrow mb-2">Ranking at search time</p>
        <dl className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <Stat label="Rank" value={r.documentedRank && rank !== null ? String(rank) : 'Meaning not documented'} />
          <Stat label="Relevance" value={rel === null ? 'Unknown' : String(rel)} />
          {r.notes.qualityScoreMeaning && <Stat label="Legacy source score" value={qual === null ? 'Unknown' : String(qual)} />}
        </dl>
        {r.notes.qualityScoreMeaning && <p className="mb-2 text-[11px] text-[#1F3D2B]/65">Legacy source score: {r.notes.qualityScoreMeaning} It is metadata, not a verified quality judgement.</p>}
        {r.factors.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-[#1F3D2B]/12">
            <table className="w-full text-left text-xs" data-testid="recommendation-rank-factors">
              <caption className="sr-only">Ranking factors returned by the server</caption>
              <thead className="bg-[#E8DCC4]/60 font-mono text-[10px] uppercase tracking-wider text-[#1F3D2B]/70">
                <tr><th className="px-3 py-2 font-medium">Factor</th><th className="px-3 py-2 font-medium">Component</th><th className="px-3 py-2 font-medium">Weight</th></tr>
              </thead>
              <tbody className="bg-[#FBF7EE]">
                {r.factors.map((f) => (
                  <tr key={f.key} className="border-t border-[#1F3D2B]/8">
                    <td className="px-3 py-1.5">{f.label}</td>
                    <td className="px-3 py-1.5 font-mono tabular-nums">{f.value === null ? <span className="text-[#1F3D2B]/55">Unknown</span> : f.value}</td>
                    <td className="px-3 py-1.5 font-mono tabular-nums">{fmtWeight(f.weight)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-xs italic text-[#1F3D2B]/60">No ranking components returned. This may be a legacy row; it keeps the server order without an inferred meaning.</p>}
        <ul className="mt-2 space-y-1 text-[11px] text-[#1F3D2B]/65">
          <li>Unknown components contribute zero on the server; they are shown as Unknown rather than 0.</li>
          <li>Stars, forks, downloads and likes are popularity metadata and are not ranking inputs.</li>
          <li>Relevance reflects the stored query and retrieved metadata, not verified product fit, security, quality or market validation.</li>
          {r.archivedPenalty !== null && <li>Archived penalty applied: {r.archivedPenalty ? 'yes' : 'no'}</li>}
          {r.lexicalScore !== null && <li>Lexical score returned: {r.lexicalScore}</li>}
          {r.semanticScore !== null && <li>Semantic score returned: {r.semanticScore}</li>}
        </ul>
        {notes.length > 0 && (
          <dl className="mt-3 space-y-1.5 text-xs">
            {notes.map(([k, label]) => (
              <div key={k} className="break-words"><dt className="eyebrow inline">{label} </dt><dd className="inline">{r.notes[k as keyof typeof r.notes]}</dd></div>
            ))}
          </dl>
        )}
        {r.unknownSignals.length > 0 && <p className="mt-2 text-[11px] text-[#1F3D2B]/65">Signals the server could not determine: {r.unknownSignals.join(', ')}</p>}
        {r.notes.disclaimer && <p className="mt-2 text-[11px] italic text-[#1F3D2B]/60">{r.notes.disclaimer}</p>}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2"><p className="eyebrow">AI explanation</p>{rec.explanation && <AiTag />}</div>
        {rec.explanation ? (
          <div className="space-y-2 break-words rounded-md border border-dashed border-[#8B5CF6]/40 bg-[#8B5CF6]/5 p-3 text-sm">
            {rec.explanation.recommendedUseCase && <p><span className="eyebrow">Use case </span>{rec.explanation.recommendedUseCase}</p>}
            {rec.explanation.explanation && <p>{rec.explanation.explanation}</p>}
            {rec.explanation.integrationDifficulty && <p><span className="eyebrow">Estimated difficulty </span>{rec.explanation.integrationDifficulty}</p>}
            {rec.explanation.limitations.length > 0 && <ul className="list-disc pl-5 text-xs">{rec.explanation.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>}
            <p className="text-[10px] text-[#1F3D2B]/60">Generated text, not approval. Verify against the source.</p>
          </div>
        ) : <p className="text-xs italic text-[#1F3D2B]/60">No AI explanation stored for this item.</p>}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#1F3D2B]/12 bg-[#FBF7EE] px-3 py-2">
      <dt className="eyebrow">{label}</dt><dd className="mt-0.5 font-mono text-sm tabular-nums text-[#1F3D2B]">{value}</dd>
    </div>
  );
}
