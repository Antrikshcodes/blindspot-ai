export type SourceContext = {
  interviewId: string;
  feedbackId: string;
  interviewPage: number;
  feedbackPage: number;
};

/** Frontend navigation context, not an API request or an ownership claim. */
export function readSourceContext(params: URLSearchParams): SourceContext | null {
  const interviewId = params.get('interviewId');
  const feedbackId = params.get('feedbackId');
  const interviewPage = Number(params.get('interviewPage') ?? 1);
  const feedbackPage = Number(params.get('feedbackPage') ?? 1);
  const validPage = (page: number) => Number.isInteger(page) && page >= 1 && page <= 10000;
  if (!interviewId || !feedbackId || interviewId.length > 200 || feedbackId.length > 200
    || !validPage(interviewPage) || !validPage(feedbackPage)) return null;
  return { interviewId, feedbackId, interviewPage, feedbackPage };
}
