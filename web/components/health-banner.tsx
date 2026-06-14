import { formatVerifiedAt, type HealthResult } from '@/lib/health';

export function HealthBanner({ health }: { health: HealthResult }) {
  if (health.ok && health.openaiVerified) {
    return (
      <p className="text-xs text-center text-emerald-400 font-medium">
        OpenAI verified at {formatVerifiedAt(health.verifiedAt)}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
      {health.message}
    </div>
  );
}
