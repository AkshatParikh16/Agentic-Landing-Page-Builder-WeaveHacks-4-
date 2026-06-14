import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { BuildProgress } from '@/components/build-progress';

export default async function BuildPage() {
  const session = await getSession();
  if (!session?.prompt) {
    redirect('/?error=Session+expired.+Start+again.');
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <BuildProgress prompt={session.prompt} answers={session.answers} />
    </main>
  );
}
