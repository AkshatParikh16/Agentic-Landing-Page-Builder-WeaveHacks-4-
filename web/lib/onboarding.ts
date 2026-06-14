import { formatOpenAIError, getOpenAIClient } from './openai-client';
import { requireOpenAIKey } from './env';
import type { Question } from './session';

export async function generateOnboardingQuestions(prompt: string): Promise<Question[]> {
  requireOpenAIKey();
  const openai = getOpenAIClient();

  try {
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
    const parsed = JSON.parse(content) as { questions?: Question[] };

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('AI returned no questions. Please try again.');
    }

    return parsed.questions;
  } catch (err) {
    if (err instanceof Error && err.message.includes('no questions')) throw err;
    throw new Error(formatOpenAIError(err));
  }
}
