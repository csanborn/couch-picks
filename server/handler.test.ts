import Anthropic from '@anthropic-ai/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PicksResponseSchema } from '../shared/schema.js';
import { handlePicks } from './handler.js';

interface FakeReply {
  stopReason: string;
  text: string;
  error?: Error;
}

/** Stands in for the network: what the model "said" for the next call. */
const sdk = vi.hoisted(() => {
  const state: { reply: FakeReply; calls: { options: unknown; params: Record<string, unknown> }[] } = {
    reply: { stopReason: 'end_turn', text: '' },
    calls: [],
  };
  return state;
});

// Keep the real SDK (error classes, zod helper) and replace only the network call.
// The fake runs the request's own output format parser, as the SDK's parse() does.
vi.mock('@anthropic-ai/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@anthropic-ai/sdk')>();
  class FakeAnthropic extends actual.default {
    constructor(private readonly fakeOptions: ConstructorParameters<typeof actual.default>[0]) {
      super(fakeOptions);
    }
    override beta = {
      messages: {
        parse: (params: Record<string, unknown> & { output_config: { format: { parse: (text: string) => unknown } } }) => {
          sdk.calls.push({ options: this.fakeOptions, params });
          if (sdk.reply.error) return Promise.reject(sdk.reply.error);
          const { stopReason, text } = sdk.reply;
          try {
            const parsed = stopReason === 'end_turn' ? params.output_config.format.parse(text) : null;
            return Promise.resolve({ stop_reason: stopReason, parsed_output: parsed });
          } catch (error) {
            return Promise.reject(error instanceof Error ? error : new Error(String(error)));
          }
        },
      },
    } as unknown as Anthropic['beta'];
  }
  return { ...actual, default: FakeAnthropic };
});

const goodAnswer = JSON.stringify({
  rows: [
    {
      title: 'Rainy day comfort',
      picks: [{ title: 'Kettle Weather', year: 2016, kind: 'Movie', blurb: 'Soft and funny.', tags: ['Cozy'] }],
    },
  ],
});

const withKey = { apiKey: 'test-key', model: undefined };

beforeEach(() => {
  sdk.reply = { stopReason: 'end_turn', text: goodAnswer };
  sdk.calls = [];
});

describe('handlePicks', () => {
  it('rejects a bad request body with 400', async () => {
    const result = await handlePicks({ mood: '   ' }, withKey);
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: 'Tell us a mood first.' });
    expect(sdk.calls).toHaveLength(0);
  });

  it('serves demo rows without an API key and never calls the SDK', async () => {
    for (const apiKey of [undefined, '', '   ']) {
      const result = await handlePicks({ mood: 'cozy' }, { apiKey });
      expect(result.status).toBe(200);
      expect(PicksResponseSchema.parse(result.body).source).toBe('demo');
    }
    expect(sdk.calls).toHaveLength(0);
  });

  it('calls the Messages API with structured output and returns model picks', async () => {
    const result = await handlePicks({ mood: ' rainy afternoon ' }, withKey);
    expect(result.status).toBe(200);
    const body = PicksResponseSchema.parse(result.body);
    expect(body.source).toBe('model');
    expect(body.mood).toBe('rainy afternoon');
    expect(body.rows[0]?.picks[0]?.title).toBe('Kettle Weather');

    const [call] = sdk.calls;
    expect(call?.options).toMatchObject({ apiKey: 'test-key' });
    expect(call?.params).toMatchObject({
      model: 'claude-sonnet-5-5',
      messages: [{ role: 'user', content: 'Mood: rainy afternoon' }],
      output_config: { effort: 'low', format: { type: 'json_schema' } },
      fallbacks: 'default',
      betas: ['server-side-fallback-2026-07-01'],
    });
  });

  it('uses ANTHROPIC_MODEL when it is set', async () => {
    await handlePicks({ mood: 'cozy' }, { apiKey: 'test-key', model: 'claude-opus-5-5' });
    expect(sdk.calls[0]?.params.model).toBe('claude-opus-5-5');
  });

  it.each([
    ['malformed JSON', { stopReason: 'end_turn', text: '{"rows": [' }, 'The model returned an answer we could not read.'],
    ['the wrong shape', { stopReason: 'end_turn', text: '{"movies": []}' }, 'The model returned an answer we could not read.'],
    ['no usable rows', { stopReason: 'end_turn', text: '{"rows": []}' }, 'The model returned no usable picks.'],
    ['a truncated answer', { stopReason: 'max_tokens', text: '' }, 'The model returned an incomplete answer.'],
    ['a refusal', { stopReason: 'refusal', text: '' }, 'The model declined this mood. Try wording it another way.'],
  ])('answers 502 for %s', async (_label, reply, error) => {
    sdk.reply = reply;
    const result = await handlePicks({ mood: 'cozy' }, withKey);
    expect(result).toEqual({ status: 502, body: { error } });
  });

  it.each([
    [new Anthropic.AuthenticationError(401, undefined, 'bad key', new Headers()), 502, 'The Anthropic API key was rejected.'],
    [new Anthropic.RateLimitError(429, undefined, 'slow down', new Headers()), 503, 'Rate limited. Try again in a moment.'],
    [new Anthropic.InternalServerError(500, undefined, 'boom', new Headers()), 502, 'The picks service is having trouble. Try again.'],
    [new Anthropic.APIConnectionError({ message: 'offline' }), 502, 'The picks service is having trouble. Try again.'],
  ])('maps SDK error %#', async (error, status, message) => {
    sdk.reply = { stopReason: 'end_turn', text: '', error };
    expect(await handlePicks({ mood: 'cozy' }, withKey)).toEqual({ status, body: { error: message } });
  });

  it('rethrows errors it does not understand', async () => {
    sdk.reply = { stopReason: 'end_turn', text: '', error: new TypeError('bug') };
    await expect(handlePicks({ mood: 'cozy' }, withKey)).rejects.toThrow('bug');
  });
});
