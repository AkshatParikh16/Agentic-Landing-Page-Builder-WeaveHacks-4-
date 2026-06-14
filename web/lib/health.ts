import { getEnvStatus, requireOpenAIKey } from './env';
import { formatOpenAIError, getOpenAIClient } from './openai-client';

export type HealthResult = {
  ok: boolean;
  message: string;
  openaiVerified: boolean;
  verifiedAt: string | null;
};

/** Live OpenAI verification — shared by server pages and /api/health. */
export async function verifyOpenAI(): Promise<HealthResult> {
  const env = getEnvStatus();

  if (!env.openai.configured || !env.openai.validFormat) {
    return {
      ok: false,
      message:
        'OPENAI_API_KEY is missing or invalid. Add it to web/.env.local and restart npm run dev.',
      openaiVerified: false,
      verifiedAt: null,
    };
  }

  try {
    requireOpenAIKey();
    const openai = getOpenAIClient();
    await openai.models.list();
    return {
      ok: true,
      message: 'OpenAI connection verified.',
      openaiVerified: true,
      verifiedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      message: formatOpenAIError(err),
      openaiVerified: false,
      verifiedAt: null,
    };
  }
}

export function formatVerifiedAt(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}
