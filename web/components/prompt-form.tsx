import { submitPrompt } from '@/app/actions';
import { SubmitButton } from '@/components/submit-button';

export function PromptForm() {
  return (
    <form action={submitPrompt} className="app-form">
      <textarea
        name="prompt"
        required
        minLength={10}
        placeholder="e.g. A gym app that tracks workouts and nutrition"
      />
      <SubmitButton label="Continue →" pendingLabel="Generating questions…" />
    </form>
  );
}
