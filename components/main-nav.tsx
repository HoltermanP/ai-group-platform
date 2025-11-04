'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Shield, 
  Search, 
  Eye, 
  Map,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    module: null, // Geen module, altijd zichtbaar
  },
  {
    href: '/dashboard/projects',
    label: 'Projecten',
    icon: FolderKanban,
    module: null, // Geen module, altijd zichtbaar
  },
  {
    href: '/dashboard/ai-safety',
    label: 'Veiligheid',
    icon: Shield,
    module: 'ai-safety' as const,
  },
  {
    href: '/dashboard/ai-schouw',
    label: 'Schouwen',
    icon: Search,
    module: 'ai-schouw' as const,
  },
  {
    href: '/dashboard/ai-toezicht',
    label: 'Toezicht',
    icon: Eye,
    module: 'ai-toezicht' as const,
  },
  {
    href: '/dashboard/kaart',
    label: 'Kaart',
    icon: Map,
    module: null, // Geen module, altijd zichtbaar
  },
  {
    href: '/dashboard/rapportage',
    label: 'Rapportage',
    icon: FileText,
    module: null, // Geen module, altijd zichtbaar
  },
];

export function MainNav() {
  const pathname = usePathname();
  const [modulePermissions, setModulePermissions] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await fetch('/api/users/module-permissions');
        if (res.ok) {
          const data = await res.json();
          setModulePermissions(data.permissions);
        }
      } catch (error) {
        console.error('Error fetching module permissions:', error);
      }
    };

    fetchPermissions();
  }, []);

  // Filter items op basis van module rechten
  const visibleItems = navigationItems.filter(item => {
    // Als het geen module is, altijd tonen
    if (!item.module) return true;
    
    // Als permissions nog niet geladen zijn, niet tonen (voorkomt flash)
    if (modulePermissions === null) return false;
    
    // Toon alleen als gebruiker toegang heeft
    return modulePermissions[item.module] === true;
  });

  return (
    <nav className="hidden md:flex gap-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || 
          (item.href !== '/dashboard' && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "hover:bg-accent hover:text-accent-foreground",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

