import { useParams } from 'wouter';
import { ProjectFrame } from '@/components/project-frame';
import { ErrorPanel, RowsSkeleton } from '@/components/kit';
import { Hypotheses } from '@/pages/overview';
import { useLatest } from '@/lib/latest';
import { FeedbackSummaryPanel } from '@/components/discovery/feedback-summary';
export default function EvidencePage() {
  const { id = '' } = useParams<{ id: string }>();
  return <ProjectFrame id={id}>{(p) => <Evidence projectId={p.id} />}</ProjectFrame>;
}

function Evidence({ projectId }: { projectId: string }) {
  const latest = useLatest(projectId);
  const assumptions = latest.analysis?.assumptions ?? [];

  return (
    <div className="space-y-10">
      <FeedbackSummaryPanel projectId={projectId} assumptions={assumptions} latestMissing={latest.missing} latestAnalysisId={latest.analysis?.id} />

      <section>
        <div className="mb-3 rounded-md border border-foreground/15 bg-secondary/60 p-3 text-xs leading-relaxed">
          <strong>Outcome review is your call.</strong> Move a hypothesis to Testing, then record Supported, Invalidated or Inconclusive by citing evidence linked to it. Supported means the cited records lean that way; it is not proof of a market. Any outcome can be reopened.
        </div>
        {latest.analysis ? (
          <Hypotheses analysisId={latest.analysis.id} projectId={projectId} readOnly={false} />
        ) : latest.failed ? (
          <ErrorPanel error={latest.q.error} onRetry={() => latest.q.refetch()} />
        ) : latest.q.isLoading ? (
          <RowsSkeleton rows={3} />
        ) : null}
      </section>
    </div>
  );
}
