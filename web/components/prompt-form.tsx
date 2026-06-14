import { submitPrompt } from '@/app/actions';
import { SubmitButton } from '@/components/submit-button';

export function PromptForm() {
  return (
    <form action={submitPrompt} className="space-y-4">
      <textarea
        name="prompt"
        required
        minLength={10}
        className="w-full h-40 bg-gray-900 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none text-sm"
        placeholder="e.g. A gym app that tracks workouts and nutrition"
      />
      <SubmitButton label="Continue →" pendingLabel="Generating questions…" />
    </form>
  );
}
