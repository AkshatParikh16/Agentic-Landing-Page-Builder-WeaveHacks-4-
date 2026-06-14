import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session?.prompt) {
    return NextResponse.json({ error: 'Session expired' }, { status: 404 });
  }

  return NextResponse.json({
    prompt: session.prompt,
    answers: session.answers ?? {},
  });
}
