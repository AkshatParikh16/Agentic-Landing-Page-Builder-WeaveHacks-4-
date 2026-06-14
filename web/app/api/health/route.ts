import { NextResponse } from 'next/server';
import { verifyOpenAI } from '@/lib/health';
import { getEnvStatus } from '@/lib/env';

export async function GET() {
  const health = await verifyOpenAI();
  const env = getEnvStatus();

  return NextResponse.json(
    {
      ok: health.ok,
      message: health.message,
      openaiVerified: health.openaiVerified,
      verifiedAt: health.verifiedAt,
      ...env,
    },
    { status: health.ok ? 200 : health.openaiVerified === false && !env.openai.configured ? 503 : 502 }
  );
}
