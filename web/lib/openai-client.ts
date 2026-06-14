import OpenAI from 'openai';
import { requireOpenAIKey } from './env';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: requireOpenAIKey() });
  }
  return client;
}

/** Turn OpenAI / network errors into user-readable messages. */
export function formatOpenAIError(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 401) {
      return 'OpenAI rejected the API key (401). Generate a new key at platform.openai.com/api-keys and update web/.env.local, then restart npm run dev.';
    }
    if (err.status === 429) {
      return 'OpenAI rate limit or quota exceeded (429). Check billing at platform.openai.com/account/billing.';
    }
    if (err.status === 403) {
      return 'OpenAI access denied (403). Your key may lack permissions or your account may be restricted.';
    }
    return `OpenAI error (${err.status}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
