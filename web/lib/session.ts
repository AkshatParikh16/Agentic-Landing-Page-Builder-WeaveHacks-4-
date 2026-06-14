import { cookies } from 'next/headers';

const COOKIE_NAME = 'builder-session';
const MAX_AGE = 60 * 60;

export type Question = {
  id: string;
  question: string;
  type: 'text' | 'select';
  options?: string[];
};

export type BuilderSession = {
  prompt: string;
  questions: Question[];
  answers: Record<string, string>;
};

export async function getSession(): Promise<BuilderSession | null> {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as BuilderSession;
  } catch {
    return null;
  }
}

export async function setSession(session: BuilderSession): Promise<void> {
  cookies().set(COOKIE_NAME, encodeURIComponent(JSON.stringify(session)), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}
