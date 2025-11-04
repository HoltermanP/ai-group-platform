'use client';

import Link from 'next/link';

export function ProfileLink() {
  return (
    <Link
      href="/dashboard/profiel"
      className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-all"
      title="Profiel"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </Link>
  );
}

