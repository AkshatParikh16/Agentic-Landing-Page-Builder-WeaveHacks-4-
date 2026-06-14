'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type AgentStatus = 'waiting' | 'running' | 'done' | 'error';

type AgentStep = {
  id: string;
  agent: string;
  status: AgentStatus;
  message?: string;
  ms?: number;
  output?: Record<string, unknown>;
  iteration?: number;
};

const AGENT_ORDER = ['CEO', 'PM', 'Design', 'Dev', 'DevOps', 'Evaluator'] as const;

const AGENT_META: Record<string, { icon: string; label: string; desc: string }> = {
  CEO: { icon: '👔', label: 'CEO Agent', desc: 'Strategy & orchestration' },
  PM: { icon: '📋', label: 'PM Agent', desc: 'PRD & task delegation' },
  Design: { icon: '🎨', label: 'Design Agent', desc: 'Visual spec & styling' },
  Dev: { icon: '💻', label: 'Dev Agent', desc: 'HTML/CSS build' },
  DevOps: { icon: '🚀', label: 'DevOps Agent', desc: 'Deploy & hosting' },
  Evaluator: { icon: '⭐', label: 'Judge Agent', desc: 'Quality scoring & feedback' },
};

function AgentLane({ agent, steps }: { agent: string; steps: AgentStep[] }) {
  const meta = AGENT_META[agent] ?? { icon: '🤖', label: agent, desc: '' };
  const isRunning = steps.some((s) => s.status === 'running');
  const isDone = steps.length > 0 && !isRunning;

  return (
    <section
      className={`bg-gray-900/80 border rounded-2xl overflow-hidden ${
        isRunning ? 'border-indigo-500' : isDone ? 'border-emerald-600/80' : 'border-gray-800'
      }`}
    >
      <header className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <span className="text-2xl">{meta.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{meta.label}</h3>
          <p className="text-xs text-gray-500">{meta.desc}</p>
        </div>
        {isRunning && (
          <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        )}
        {isDone && !isRunning && <span className="text-emerald-400">✓</span>}
      </header>
      <div className="p-4 min-h-[72px] space-y-2">
        {steps.length === 0 && <p className="text-xs text-gray-600 italic">Waiting…</p>}
        {steps.map((step) => (
          <div key={step.id}>
            {step.message && <p className="text-xs text-gray-400">{step.message}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

type Props = {
  prompt: string;
  answers: Record<string, string>;
};

export function BuildProgress({ prompt, answers }: Props) {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [html, setHtml] = useState('');
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const stepsByAgent = useMemo(() => {
    const map: Record<string, AgentStep[]> = {};
    for (const name of AGENT_ORDER) map[name] = [];
    for (const step of steps) {
      if (!map[step.agent]) map[step.agent] = [];
      map[step.agent].push(step);
    }
    return map;
  }, [steps]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, answers }),
        });
        if (!res.body) throw new Error('No stream body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let n = 0;

        while (!cancelled) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            const line = part.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            const event = JSON.parse(line.slice(6));
            if (event.agent === 'DONE') {
              setHtml(event.html ?? '');
              setFinalScore(event.output?.finalScore ?? null);
              setDone(true);
              return;
            }
            if (event.agent === 'ERROR') throw new Error(event.message ?? 'Unknown error');
            setSteps((prev) => {
              const idx = prev.findIndex((s) => s.agent === event.agent && s.status === 'running');
              const step: AgentStep = {
                id: `s-${n++}`,
                agent: event.agent,
                status: event.status,
                message: event.message,
                ms: event.ms,
                output: event.output,
                iteration: event.iteration,
              };
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = step;
                return updated;
              }
              return [...prev, step];
            });
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Something went wrong');
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [prompt, answers]);

  if (done && html) {
    return (
      <div className="fixed inset-0 flex flex-col bg-gray-950 text-white">
        <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
          <h2 className="font-semibold">
            Your Landing Page
            {finalScore != null && (
              <span className="ml-2 text-sm text-gray-400">Score {finalScore}/10</span>
            )}
          </h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'landing-page.html';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm"
            >
              Download HTML
            </button>
            <Link href="/" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">
              Start Over
            </Link>
          </div>
        </div>
        <iframe
          srcDoc={html}
          className="flex-1 w-full border-0"
          sandbox="allow-same-origin"
          title="Preview"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-center">Agents working…</h2>
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-indigo-400 hover:text-indigo-300"
            >
              Retry
            </button>
            <Link href="/questions" className="text-gray-400 hover:text-gray-300">
              ← Back to questions
            </Link>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENT_ORDER.map((a) => (
          <AgentLane key={a} agent={a} steps={stepsByAgent[a] ?? []} />
        ))}
      </div>
    </div>
  );
}
