'use server';

import { redirect } from 'next/navigation';
import { generateOnboardingQuestions } from '@/lib/onboarding';
import { verifyOpenAI } from '@/lib/health';
import { clearSession, getSession, setSession } from '@/lib/session';

export async function submitPrompt(formData: FormData) {
  const prompt = String(formData.get('prompt') ?? '').trim();
  if (!prompt) {
    redirect('/?error=Please+enter+a+product+description.');
  }
  if (prompt.length < 10) {
    redirect('/?error=Please+enter+at+least+10+characters.');
  }

  const health = await verifyOpenAI();
  if (!health.ok) {
    redirect(`/?error=${encodeURIComponent(health.message)}`);
  }

  try {
    const questions = await generateOnboardingQuestions(prompt);
    await setSession({ prompt, questions, answers: {} });
    redirect('/questions');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate questions';
    redirect(`/?error=${encodeURIComponent(msg)}`);
  }
}

export async function submitAnswers(formData: FormData) {
  const session = await getSession();
  if (!session) {
    redirect('/?error=Session+expired.+Start+again.');
  }

  const answers: Record<string, string> = {};
  for (const q of session.questions) {
    answers[q.id] = String(formData.get(q.id) ?? '').trim();
  }

  await setSession({ ...session, answers });
  redirect('/build');
}

export async function resetSession() {
  await clearSession();
  redirect('/');
}
