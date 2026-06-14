import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

const AGENT_META: Record<string, { icon: string; label: string; desc: string }> = {
  CEO: { icon: '👔', label: 'CEO Agent', desc: 'Strategy & orchestration' },
  PM: { icon: '📋', label: 'PM Agent', desc: 'PRD & task delegation' },
  Design: { icon: '🎨', label: 'Design Agent', desc: 'Visual spec & styling' },
  Dev: { icon: '💻', label: 'Dev Agent', desc: 'HTML/CSS build' },
  DevOps: { icon: '🚀', label: 'DevOps Agent', desc: 'Deploy & hosting' },
  Evaluator: { icon: '⭐', label: 'Judge Agent', desc: 'Quality scoring & feedback' },
};

const AGENT_ORDER = ['CEO', 'PM', 'Design', 'Dev', 'DevOps', 'Evaluator'];

export default async function BuildPage() {
  const session = await getSession();
  if (!session?.prompt) {
    redirect('/?error=Session+expired.+Start+again.');
  }

  return (
    <main>
      <div className="app-container-wide" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 id="build-status" className="app-title" style={{ fontSize: '1.5rem' }}>
          Agents working…
        </h2>

        <p id="build-error" className="app-status-error hidden" />

        <div id="agent-lanes" className="agent-grid">
          {AGENT_ORDER.map((agent) => {
            const meta = AGENT_META[agent];
            return (
              <section key={agent} data-agent={agent} data-status="waiting" className="agent-card">
                <header className="agent-card-header">
                  <span style={{ fontSize: '1.5rem' }}>{meta.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h3 className="agent-card-title">{meta.label}</h3>
                    <p className="agent-card-desc">{meta.desc}</p>
                  </div>
                  <span data-lane-badge data-status="waiting" className="agent-card-badge">
                    ·
                  </span>
                </header>
                <div className="agent-card-body">
                  <p data-lane-message className="agent-card-msg">
                    Waiting…
                  </p>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <script src="/build-stream.js" defer />
    </main>
  );
}
