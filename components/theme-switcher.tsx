"use client";

import * as React from "react";
import { useTheme } from "next-themes";

const themes = [
  { name: "Slate", value: "theme-slate", icon: "🌑", description: "Modern donkerblauw" },
  { name: "Ocean", value: "theme-ocean", icon: "🌊", description: "Diep oceaan blauw" },
  { name: "Forest", value: "theme-forest", icon: "🌲", description: "Natuurlijk groen" },
  { name: "Purple", value: "theme-purple", icon: "💜", description: "Modern paars" },
  { name: "Rose", value: "theme-rose", icon: "🌹", description: "Warm roze" },
  { name: "Amber", value: "theme-amber", icon: "🟡", description: "Goudgeel accent" },
  { name: "Light", value: "light", icon: "☀️", description: "Licht thema" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = themes.find((t) => t.value === theme) || themes[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
        aria-label="Selecteer thema"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-popover shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
            <div className="p-2">
              <div className="px-2 py-1.5 mb-2">
                <p className="text-xs font-medium text-muted-foreground">Kies een thema</p>
              </div>
              <div className="space-y-1">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setTheme(t.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                      theme === t.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t.name}</p>
                      <p
                        className={`text-xs ${
                          theme === t.value ? "opacity-90" : "text-muted-foreground"
                        }`}
                      >
                        {t.description}
                      </p>
                    </div>
                    {theme === t.value && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

