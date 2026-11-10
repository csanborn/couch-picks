import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { ModelOutputSchema, normalizeModelOutput, type PicksResponse } from '../shared/schema.js';

export const DEFAULT_MODEL = 'claude-sonnet-5-5';

const SYSTEM_PROMPT = `You recommend things to watch for a TV app called couch-picks.
Given a viewer's mood, return 3 or 4 rows of 6 to 8 picks each. Each row has its own angle on the mood.
Every title must be original and invented for this app: never name a real film, show, studio, actor or streaming service.
Blurbs are one or two warm, specific sentences (under 200 characters) saying why the pick fits this mood.
Row titles are a few words in sentence case. Tags are two or three short words each.
Respect audience hints: if a child is mentioned, keep every pick age appropriate.
Do not use em dashes or en dashes.`;

/** Raised when the model answered but the answer cannot be shown. */
export class UnusableAnswerError extends Error {
  override name = 'UnusableAnswerError';
}

export async function generatePicks(client: Anthropic, model: string, mood: string): Promise<PicksResponse> {
  const message = await client.beta.messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Mood: ${mood}` }],
    output_config: { effort: 'low', format: zodOutputFormat(ModelOutputSchema) },
    // On a policy decline, let the API retry on the model's default fallback.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });

  if (message.stop_reason === 'refusal') {
    throw new UnusableAnswerError('The model declined this mood. Try wording it another way.');
  }
  if (message.stop_reason === 'max_tokens' || !message.parsed_output) {
    throw new UnusableAnswerError('The model returned an incomplete answer.');
  }
  const response = normalizeModelOutput(message.parsed_output, mood);
  if (!response) throw new UnusableAnswerError('The model returned no usable picks.');
  return response;
}
