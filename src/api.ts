import { ErrorResponseSchema, PicksResponseSchema, type PicksResponse } from '../shared/schema';

export async function fetchPicks(mood: string, signal: AbortSignal): Promise<PicksResponse> {
  const response = await fetch('/api/picks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood }),
    signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ErrorResponseSchema.safeParse(body);
    throw new Error(parsed.success ? parsed.data.error : 'Could not load picks. Try again.');
  }
  return PicksResponseSchema.parse(body);
}
