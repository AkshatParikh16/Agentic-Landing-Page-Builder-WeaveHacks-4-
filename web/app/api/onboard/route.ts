import { NextRequest, NextResponse } from 'next/server';
import { getEnvStatus, requireOpenAIKey } from '@/lib/env';
import { formatOpenAIError, getOpenAIClient } from '@/lib/openai-client';

export async function POST(req: NextRequest) {
  try {
    requireOpenAIKey();

    let body: { prompt?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json(
        { error: 'Please enter a product description before continuing.' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a landing page consultant. Given a product description, generate 5-6 targeted questions to gather the details needed to build an effective landing page.

Return a JSON object with a "questions" array. Each question has:
- "id": a short snake_case identifier
- "question": the question text
- "type": "text" or "select"
- "options": array of 3-5 short option strings (only when type is "select")

Use "select" for questions with clear fixed choices (tone, color scheme, target audience category, CTA style).
Use "text" for open-ended answers (tagline ideas, company name, unique value prop).`,
        },
        {
          role: 'user',
          content: `Product description: ${prompt}`,
        },
      ],
    });

    const content = completion.choices[0].message.content ?? '{"questions":[]}';
    const parsed = JSON.parse(content) as { questions?: unknown[] };

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return NextResponse.json(
        { error: 'AI returned no questions. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const env = getEnvStatus();
    const message = formatOpenAIError(err);
    console.error('[api/onboard]', message);

    return NextResponse.json(
      { error: message, env },
      { status: env.openai.configured ? 502 : 503 }
    );
  }
}
