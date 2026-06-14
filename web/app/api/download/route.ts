import { NextRequest, NextResponse } from 'next/server';
import { getResultHtml } from '@/lib/result-store';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const html = getResultHtml(id);
  if (!html) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="landing-page.html"',
    },
  });
}
