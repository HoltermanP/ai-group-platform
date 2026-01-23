import { safeAuth, safeCurrentUser } from '@/lib/auth-wrapper';
import { redirect } from 'next/navigation';
import { SetupClient } from './setup-client';

// Schakel static generation uit voor deze pagina
export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const { userId } = await safeAuth();

  if (!userId) {
    redirect('/');
  }

  const user = await safeCurrentUser();

  // Extraheer alleen de benodigde user data voor serialisatie
  const userData = user ? {
    emailAddress: user.emailAddresses?.[0]?.emailAddress,
  } : null;

  return <SetupClient user={userData} />;
}
