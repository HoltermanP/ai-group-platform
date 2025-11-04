'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

interface ModuleCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  module: 'ai-safety' | 'ai-schouw' | 'ai-toezicht';
}

export function ModuleCard({ href, icon: Icon, title, description, module }: ModuleCardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    // Voor niet-ingelogde gebruikers tonen we altijd de card maar niet klikbaar
    const checkAccess = async () => {
      try {
        const res = await fetch('/api/users/module-permissions');
        if (res.ok) {
          const data = await res.json();
          setHasAccess(data.permissions[module] === true);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking module access:', error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [module]);

  // Als er geen toegang is, toon de card maar maak hem niet klikbaar
  const cardContent = (
    <div className={`h-full rounded-xl border-2 border-border bg-card p-8 text-left transition-all duration-300 ${
      hasAccess !== false 
        ? 'hover:shadow-2xl hover:border-primary hover:-translate-y-2 cursor-pointer' 
        : 'opacity-60 cursor-not-allowed'
    }`}>
      <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ${
        hasAccess !== false ? 'group-hover:bg-primary group-hover:text-primary-foreground transition-all' : ''
      }`}>
        <Icon className="h-8 w-8" />
      </div>
      <h3 className={`font-bold text-2xl mb-4 text-card-foreground ${
        hasAccess !== false ? 'group-hover:text-primary transition-colors' : ''
      }`}>
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        {description}
      </p>
      {hasAccess === false && (
        <p className="text-sm text-muted-foreground italic mb-4">
          Je hebt geen toegang tot deze module
        </p>
      )}
      <div className={`flex items-center text-sm font-medium ${
        hasAccess !== false 
          ? 'text-primary group-hover:gap-2 transition-all' 
          : 'text-muted-foreground'
      }`}>
        {hasAccess !== false ? 'Meer informatie' : 'Geen toegang'}
        {hasAccess !== false && (
          <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );

  // Als er geen toegang is, toon de card zonder link
  if (hasAccess === false) {
    return <div className="group">{cardContent}</div>;
  }

  // Voor niet-ingelogde gebruikers of gebruikers met toegang, toon als link
  return (
    <Link href={href} className="group">
      {cardContent}
    </Link>
  );
}

