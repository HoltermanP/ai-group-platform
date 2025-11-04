'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  },
  {
    href: '/dashboard/projects',
    label: 'Projecten',
    icon: FolderKanban,
  },
  {
    href: '/dashboard/ai-safety',
    label: 'Veiligheid',
    icon: Shield,
  },
  {
    href: '/dashboard/ai-schouw',
    label: 'Schouwen',
    icon: Search,
  },
  {
    href: '/dashboard/ai-toezicht',
    label: 'Toezicht',
    icon: Eye,
  },
  {
    href: '/dashboard/kaart',
    label: 'Kaart',
    icon: Map,
  },
  {
    href: '/dashboard/rapportage',
    label: 'Rapportage',
    icon: FileText,
  },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex gap-1">
      {navigationItems.map((item) => {
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

