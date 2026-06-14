import { submitAnswers } from '@/app/actions';
import { SubmitButton } from '@/components/submit-button';
import type { Question } from '@/lib/session';

export function QuestionsForm({ questions }: { questions: Question[] }) {
  return (
    <form action={submitAnswers} className="space-y-5">
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label htmlFor={q.id} className="text-sm text-gray-300">
            {q.question}
          </label>
          {q.type === 'select' && q.options?.length ? (
            <select
              id={q.id}
              name={q.id}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm"
              defaultValue=""
            >
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
            <input
              id={q.id}
              type="text"
              name={q.id}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm"
            />
          )}
        </div>
      ))}
      <SubmitButton label="Build My Page →" pendingLabel="Starting build…" />
    </form>
  );
}
