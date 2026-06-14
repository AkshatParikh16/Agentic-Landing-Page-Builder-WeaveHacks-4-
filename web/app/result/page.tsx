import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getResultHtml, getResultMeta } from '@/lib/result-store';

export default async function ResultPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id;
  if (!id) redirect('/');

  const html = getResultHtml(id);
  if (!html) {
    redirect('/?error=Result+not+found.+Build+again.');
  }

  const meta = getResultMeta(id);

  return (
    <main>
      <div className="app-container-wide">
        <div className="result-header">
          <h2>
            Your Landing Page
            {meta?.finalScore != null && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                Score {meta.finalScore}/10
              </span>
            )}
          </h2>
          <div className="result-toolbar">
            <a href={`/api/download?id=${id}`} className="app-btn" style={{ width: 'auto' }}>
              Download HTML
            </a>
            <Link href="/" className="app-btn app-btn-secondary" style={{ width: 'auto' }}>
              Start Over
            </Link>
          </div>
        </div>
        <iframe className="result-frame" srcDoc={html} sandbox="allow-same-origin" title="Preview" />
      </div>
    </main>
  );
}
