/**
 * Classify rejected ICP calls without converting failures into empty results.
 * Only explicit authentication failures should prompt reauthentication.
 */
export type RequestFailure = 'authentication' | 'authorization' | 'network' | 'unknown';

export function classifyRequestFailure(error: unknown): RequestFailure {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/permission denied|not authorized|unauthorized principal|access denied|insufficient permissions/i.test(message)) {
    return 'authorization';
  }
  if (/delegation.*(expired|invalid)|expired.*delegation|signature.*expired|identity.*expired|authentication required|unauthenticated/i.test(message)) {
    return 'authentication';
  }
  if (/networkerror|failed to fetch|network request failed|connection refused|timeout|timed out|offline|503 service unavailable/i.test(message)) {
    return 'network';
  }
  return 'unknown';
}
