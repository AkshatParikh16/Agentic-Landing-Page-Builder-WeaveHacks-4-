import { NextResponse } from 'next/server';
import { getEnvStatus, requireOpenAIKey } from '@/lib/env';
import { formatOpenAIError, getOpenAIClient } from '@/lib/openai-client';

export async function GET() {
  const env = getEnvStatus();

  if (!env.openai.configured || !env.openai.validFormat) {
    return NextResponse.json(
      {
        ok: false,
        message: 'OPENAI_API_KEY is missing or invalid. Add it to web/.env.local and restart npm run dev.',
        openaiVerified: false,
        ...env,
      },
      { status: 503 }
    );
  }

  try {
    requireOpenAIKey();
    const openai = getOpenAIClient();
    await openai.models.list();

    return NextResponse.json({
      ok: true,
      message: 'OpenAI connection verified.',
      openaiVerified: true,
      ...env,
    });
  } catch (err) {
    const message = formatOpenAIError(err);
    return NextResponse.json(
      {
        ok: false,
        message,
        openaiVerified: false,
        ...env,
      },
      { status: 502 }
    );
  }
}
