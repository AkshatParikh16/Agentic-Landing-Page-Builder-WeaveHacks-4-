import { submitAnswers } from '@/app/actions';
import { SubmitButton } from '@/components/submit-button';
import type { Question } from '@/lib/session';

export function QuestionsForm({ questions }: { questions: Question[] }) {
  return (
    <form action={submitAnswers} className="app-form">
      {questions.map((q) => (
        <div key={q.id}>
          <label htmlFor={q.id} className="app-label">
            {q.question}
          </label>
          {q.type === 'select' && q.options?.length ? (
            <select id={q.id} name={q.id} defaultValue="">
              <option value="" disabled>
                Select…
              </option>
              {q.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input id={q.id} type="text" name={q.id} />
          )}
        </div>
      ))}
      <SubmitButton label="Build My Page →" pendingLabel="Starting build…" />
    </form>
  );
}
