'use client';

import { useFormStatus } from 'react-dom';

type Props = {
  label: string;
  pendingLabel: string;
  className?: string;
};

export function SubmitButton({ label, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        `w-full py-3 rounded-xl font-semibold transition ${
          pending
            ? 'bg-indigo-800 text-indigo-200 cursor-wait'
            : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30'
        }`
      }
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
