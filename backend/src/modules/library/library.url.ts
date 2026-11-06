import { AppError } from '../../utils/response.js';

/**
 * This only validates and normalizes a source link. It does not fetch the URL,
 * establish that a resource exists, or verify its license/security.
 */
export function canonicalSourceUrl(category: string, input: string): string {
  const invalid = () => new AppError(
    'Use a GitHub repository URL or a supported dataset URL (Hugging Face, Kaggle, data.gov).',
    400, 'INVALID_RESOURCE_URL',
  );
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw invalid();
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw invalid();

  const segments = url.pathname.split('/').filter(Boolean);
  if (category === 'GITHUB_REPOSITORY') {
    if (url.hostname !== 'github.com' || segments.length !== 2) throw invalid();
    const [owner, rawRepo] = segments;
    const repo = rawRepo.replace(/\.git$/i, '');
    if (!/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(owner)
      || owner.length > 39 || !/^[a-z\d_.-]+$/i.test(repo)
      || repo === '.' || repo === '..') throw invalid();
    return `https://github.com/${owner.toLowerCase()}/${repo.toLowerCase()}`;
  }

  const isHuggingFace = url.hostname === 'huggingface.co'
    && segments[0] === 'datasets' && (segments.length === 2 || segments.length === 3);
  const isKaggle = url.hostname === 'www.kaggle.com'
    && segments[0] === 'datasets' && segments.length === 3;
  const isDataGov = url.hostname === 'catalog.data.gov'
    && segments[0] === 'dataset' && segments.length === 2;
  if (!isHuggingFace && !isKaggle && !isDataGov) throw invalid();
  if (segments.some((segment) => !/^[a-z\d_.-]+$/i.test(segment))) throw invalid();
  return `https://${url.hostname}/${segments.join('/')}`;
}
