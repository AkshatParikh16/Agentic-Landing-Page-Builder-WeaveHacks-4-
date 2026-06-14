'use client';

import { useEffect, useMemo, useState } from 'react';

type Question = {
  id: string;
  question: string;
  type: 'text' | 'select';
  options?: string[];
};

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

type View = 'input' | 'questions' | 'generating' | 'result';

type HealthState = {
  ok: boolean;
  message: string;
  openaiVerified: boolean;
} | null;

const AGENT_ORDER = ['CEO', 'PM', 'Design', 'Dev', 'DevOps', 'Evaluator'] as const;

const AGENT_META: Record<string, { icon: string; label: string; desc: string }> = {
  CEO: { icon: '👔', label: 'CEO Agent', desc: 'Strategy & orchestration' },
  PM: { icon: '📋', label: 'PM Agent', desc: 'PRD & task delegation' },
  Design: { icon: '🎨', label: 'Design Agent', desc: 'Visual spec & styling' },
  Dev: { icon: '💻', label: 'Dev Agent', desc: 'HTML/CSS/JS build' },
  DevOps: { icon: '🚀', label: 'DevOps Agent', desc: 'Deploy & hosting' },
  Evaluator: { icon: '⭐', label: 'Judge Agent', desc: 'Quality scoring & feedback' },
};

function AgentLane({ agent, steps }: { agent: string; steps: AgentStep[] }) {
  const meta = AGENT_META[agent] ?? { icon: '🤖', label: agent, desc: '' };
  const isRunning = steps.some((s) => s.status === 'running');
  const isDone = steps.length > 0 && !isRunning;

  return (
    <section className={`bg-gray-900/80 border rounded-2xl overflow-hidden ${isRunning ? 'border-indigo-500' : isDone ? 'border-emerald-600/80' : 'border-gray-800'}`}>
      <header className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <span className="text-2xl">{meta.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{meta.label}</h3>
          <p className="text-xs text-gray-500">{meta.desc}</p>
        </div>
        {isRunning && <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
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

export default function HomeClient() {
  const [view, setView] = useState<View>('input');
  const [prompt, setPrompt] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [html, setHtml] = useState('');
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthState>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(async (res) => {
        const data = await res.json();
        setHealth({
          ok: Boolean(data.ok),
          message: String(data.message ?? ''),
          openaiVerified: Boolean(data.openaiVerified),
        });
      })
      .catch(() => {
        setHealth({
          ok: false,
          message: 'Cannot reach the server. Run npm run dev in the web folder.',
          openaiVerified: false,
        });
      });
  }, []);

  const hasPrompt = prompt.trim().length > 0;

  const stepsByAgent = useMemo(() => {
    const map: Record<string, AgentStep[]> = {};
    for (const name of AGENT_ORDER) map[name] = [];
    for (const step of steps) {
      if (!map[step.agent]) map[step.agent] = [];
      map[step.agent].push(step);
    }
    return map;
  }, [steps]);

  async function handleContinue() {
    const text = prompt.trim();
    if (!text) {
      setError('Please type a product description first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('No questions returned. Try again.');
      }
      setQuestions(data.questions);
      setView('questions');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleBuild() {
    setView('generating');
    setSteps([]);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), answers }),
      });
      if (!res.body) throw new Error('No stream body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let n = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
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
            setView('result');
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
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setView('questions');
    }
  }

  function resetAll() {
    setView('input');
    setPrompt('');
    setQuestions([]);
    setAnswers({});
    setSteps([]);
    setHtml('');
    setFinalScore(null);
    setError('');
  }

  if (view === 'result') {
    return (
      <div className="fixed inset-0 flex flex-col bg-gray-950 text-white">
        <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
          <h2 className="font-semibold">
            Your Landing Page
            {finalScore != null && <span className="ml-2 text-sm text-gray-400">Score {finalScore}/10</span>}
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
            <button type="button" onClick={resetAll} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">
              Start Over
            </button>
          </div>
        </div>
        <iframe srcDoc={html} className="flex-1 w-full border-0" sandbox="allow-scripts allow-same-origin" title="Preview" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto min-h-[80vh] flex flex-col justify-center space-y-6">
        {view === 'input' && (
          <>
            <div className="text-center space-y-2">
              <p className="text-indigo-400 text-sm uppercase tracking-wide">Agentic Landing Page Builder</p>
              <h1 className="text-4xl font-bold">Describe your product</h1>
              <p className="text-gray-400 text-sm">CEO → PM → Design → Dev → Judge agents build your page.</p>
            </div>

            {health === null && (
              <p className="text-xs text-center text-amber-400">Verifying OpenAI connection…</p>
            )}
            {health?.ok && health.openaiVerified && (
              <p className="text-xs text-center text-emerald-400 font-medium">OpenAI connection verified</p>
            )}
            {health && !health.ok && (
              <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                {health.message}
              </div>
            )}

            <textarea
              className="w-full h-40 bg-gray-900 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none text-sm"
              placeholder="e.g. A gym app that tracks workouts and nutrition"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (error) setError('');
              }}
            />

            {hasPrompt && (
              <p className="text-xs text-emerald-400">{prompt.trim().length} characters — ready to continue</p>
            )}

            {error && (
              <div className="text-sm text-red-300 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleContinue}
              className={`w-full py-3 rounded-xl font-semibold transition ${
                loading
                  ? 'bg-indigo-800 text-indigo-200 cursor-wait'
                  : hasPrompt
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-gray-800 text-gray-500'
              }`}
            >
              {loading ? 'Generating questions…' : 'Continue →'}
            </button>
          </>
        )}

        {view === 'questions' && (
          <>
            <h2 className="text-3xl font-bold text-center">A few quick questions</h2>
            <div className="space-y-5">
              {questions.map((q) => (
                <div key={q.id} className="space-y-2">
                  <label className="text-sm text-gray-300">{q.question}</label>
                  {q.type === 'text' ? (
                    <input
                      type="text"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm"
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {q.options?.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt }))}
                          className={`px-4 py-2 rounded-lg text-sm border ${
                            answers[q.id] === opt ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-900 border-gray-700'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="button" onClick={handleBuild} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold">
              Build My Page →
            </button>
            <button type="button" onClick={() => setView('input')} className="w-full py-2 text-sm text-gray-500 hover:text-gray-300">
              ← Back
            </button>
          </>
        )}

        {view === 'generating' && (
          <>
            <h2 className="text-2xl font-bold text-center">Agents working…</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AGENT_ORDER.map((a) => (
                <AgentLane key={a} agent={a} steps={stepsByAgent[a] ?? []} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
