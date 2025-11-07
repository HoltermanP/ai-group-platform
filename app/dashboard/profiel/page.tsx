'use client';

import { UserProfile } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProfielPage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-3 sm:mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug
            </Button>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Profiel</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Beheer je profielinformatie en accountinstellingen
            </p>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
            <UserProfile 
              routing="path"
              path="/dashboard/profiel"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-card border-border shadow-none",
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

