import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { QuestionsForm } from '@/components/questions-form';

export default async function QuestionsPage() {
  const session = await getSession();
  if (!session?.questions?.length) {
    redirect('/?error=Session+expired.+Start+again.');
  }

  return (
    <main>
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 className="app-title" style={{ fontSize: '1.875rem' }}>
          A few quick questions
        </h2>
        <p className="app-subtitle">
          Product: {session.prompt.slice(0, 120)}
          {session.prompt.length > 120 ? '…' : ''}
        </p>
        <QuestionsForm questions={session.questions} />
        <Link href="/" className="app-link">
          ← Back
        </Link>
      </div>
    </main>
  );
}
