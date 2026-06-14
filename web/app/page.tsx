import { verifyOpenAI } from '@/lib/health';
import { HealthBanner } from '@/components/health-banner';
import { PromptForm } from '@/components/prompt-form';

export default async function HomePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const health = await verifyOpenAI();

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto min-h-[80vh] flex flex-col justify-center space-y-6">
        <div className="text-center space-y-2">
          <p className="text-indigo-400 text-sm uppercase tracking-wide">Agentic Landing Page Builder</p>
          <h1 className="text-4xl font-bold">Describe your product</h1>
          <p className="text-gray-400 text-sm">CEO → PM → Design → Dev → Judge agents build your page.</p>
        </div>

        <HealthBanner health={health} />

        {searchParams.error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {searchParams.error}
          </div>
        )}

        <PromptForm />
      </div>
    </main>
  );
}
