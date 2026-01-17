import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SetupClient } from './setup-client';

// Schakel static generation uit voor deze pagina
export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  const user = await currentUser();

  return <SetupClient user={user} />;
}
