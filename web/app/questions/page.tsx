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
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-center">A few quick questions</h2>
        <p className="text-sm text-gray-400 text-center">
          Product: {session.prompt.slice(0, 120)}
          {session.prompt.length > 120 ? '…' : ''}
        </p>
        <QuestionsForm questions={session.questions} />
        <Link href="/" className="block text-center text-sm text-gray-500 hover:text-gray-300">
          ← Back
        </Link>
      </div>
    </main>
  );
}
