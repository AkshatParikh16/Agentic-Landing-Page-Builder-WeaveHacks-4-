import { verifyOpenAI } from '@/lib/health';
import { formatVerifiedAt } from '@/lib/health';
import { PromptForm } from '@/components/prompt-form';

export default async function HomePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const health = await verifyOpenAI();

  return (
    <main>
      <div className="app-container app-center">
        <div>
          <p className="app-eyebrow">Agentic Landing Page Builder</p>
          <h1 className="app-title">Describe your product</h1>
          <p className="app-subtitle">CEO → PM → Design → Dev → Judge agents build your page.</p>
        </div>

        {health.ok && health.openaiVerified ? (
          <p className="app-status-ok">OpenAI verified at {formatVerifiedAt(health.verifiedAt)}</p>
        ) : (
          <div className="app-status-error">{health.message}</div>
        )}

        {searchParams.error && <div className="app-status-error">{searchParams.error}</div>}

        <PromptForm />
      </div>
    </main>
  );
}
