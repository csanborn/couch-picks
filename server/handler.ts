import Anthropic from '@anthropic-ai/sdk';
import { PicksRequestSchema, type PicksResponse } from '../shared/schema.js';
import { DEFAULT_MODEL, UnusableAnswerError, generatePicks } from './anthropic.js';
import { mockPicks } from './mock.js';

export interface PicksConfig {
  apiKey?: string | undefined;
  model?: string | undefined;
}

export interface HandlerResult {
  status: number;
  body: PicksResponse | { error: string };
}

/** Framework-free handler for POST /api/picks, so it can be tested without a server. */
export async function handlePicks(rawBody: unknown, config: PicksConfig): Promise<HandlerResult> {
  const request = PicksRequestSchema.safeParse(rawBody);
  if (!request.success) {
    return { status: 400, body: { error: request.error.issues[0]?.message ?? 'Invalid request.' } };
  }
  const { mood } = request.data;
  const apiKey = config.apiKey?.trim();
  if (!apiKey) return { status: 200, body: mockPicks(mood) };

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1 });
    const body = await generatePicks(client, config.model?.trim() || DEFAULT_MODEL, mood);
    return { status: 200, body };
  } catch (error) {
    if (error instanceof UnusableAnswerError) return { status: 502, body: { error: error.message } };
    if (error instanceof Anthropic.AuthenticationError) {
      return { status: 502, body: { error: 'The Anthropic API key was rejected.' } };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { status: 503, body: { error: 'Rate limited. Try again in a moment.' } };
    }
    if (error instanceof Anthropic.APIError) {
      return { status: 502, body: { error: 'The picks service is having trouble. Try again.' } };
    }
    if (error instanceof Anthropic.AnthropicError) {
      // The SDK's structured output parser throws this for malformed JSON or schema mismatches.
      return { status: 502, body: { error: 'The model returned an answer we could not read.' } };
    }
    throw error;
  }
}
