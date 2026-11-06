import { useGetLatestAnalysis, getGetLatestAnalysisQueryKey } from '@workspace/api-client-react';
import { isAnalysisMissing } from '@/lib/api';

export function useLatest(projectId: string) {
  const q = useGetLatestAnalysis(projectId, {
    query: { enabled: !!projectId, queryKey: getGetLatestAnalysisQueryKey(projectId), retry: false },
  });
  const missing = q.isError && isAnalysisMissing(q.error);
  return { q, analysis: q.data?.data, missing, failed: q.isError && !missing };
}
