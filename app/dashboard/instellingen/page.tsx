// Prevent static generation for this page

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

// Schakel static generation uit voor deze pagina
export const dynamic = 'force-dynamic';

export default async function InstellingenPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Instellingen</h1>
          <p className="text-muted-foreground">
            De instellingen pagina wordt momenteel gerefactored. Gebruik voorlopig de oude functionaliteit.
          </p>
        </div>
      </div>
    </div>
  );
}
