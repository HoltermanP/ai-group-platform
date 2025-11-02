'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function SetupPage() {
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState<'check' | 'setup' | 'complete'>('check');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  useEffect(() => {
    if (isLoaded && user) {
      checkSetup();
    }
  }, [isLoaded, user]);

  const checkSetup = async () => {
    try {
      const res = await fetch('/api/setup');
      if (res.ok) {
        const data = await res.json();
        if (data.setupCompleted) {
          setStep('complete');
        } else {
          setStep('setup');
        }
      } else {
        setStep('setup');
      }
    } catch {
      setStep('setup');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName || 'Mijn Organisatie',
          organizationSlug: orgSlug || 'mijn-organisatie',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Fout bij setup');
      }

      setStep('complete');
    } catch (err) {
      console.error('Setup error:', err);
      setError(err instanceof Error ? err.message : 'Onbekende fout');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">Je moet ingelogd zijn om setup uit te voeren</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <CardTitle>Setup Voltooid!</CardTitle>
            </div>
            <CardDescription>
              Je platform is klaar voor gebruik
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-4">Je hebt nu toegang tot:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Gebruikersbeheer (admin rechten)</li>
                <li>Organisatiebeheer</li>
                <li>Project en veiligheidsbeheer</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <a href="/dashboard">Naar Dashboard</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/dashboard/admin/users">Gebruikers Beheren</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/dashboard/admin/organizations">Organisaties Beheren</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Platform Setup</CardTitle>
          <CardDescription>
            Welkom! Laten we je eerste organisatie aanmaken en je admin rechten geven.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Je Account</Label>
                <Input
                  id="email"
                  value={user.emailAddresses[0]?.emailAddress || ''}
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dit account krijgt super admin rechten
                </p>
              </div>

              <div>
                <Label htmlFor="orgName">Organisatie Naam</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  placeholder="Bijv. AI Group"
                  required
                />
              </div>

              <div>
                <Label htmlFor="orgSlug">Organisatie Slug</Label>
                <Input
                  id="orgSlug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="bijv-ai-group"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Gebruikt in URLs (alleen kleine letters en streepjes)
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-destructive font-medium">Fout bij setup</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Bezig met setup...' : 'Platform Instellen'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">⚠️ Database Setup Vereist</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Voordat je setup kunt voltooien, moet je eerst de database tabellen aanmaken.</p>
          <p>Voer dit commando uit:</p>
          <code className="block bg-muted p-2 rounded">npm run db:push</code>
          <p className="text-xs text-muted-foreground">
            Of voer het SQL script uit: <code>scripts/setup-admin.sql</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

