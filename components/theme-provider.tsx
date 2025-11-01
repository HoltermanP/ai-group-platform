"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeWatcher>
        {children}
      </ThemeWatcher>
    </NextThemesProvider>
  )
}

function ThemeWatcher({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return
    
    const currentTheme = theme || resolvedTheme || 'theme-slate'
    const html = document.documentElement
    
    // Remove all possible theme classes
    html.classList.remove('light', 'dark', 'theme-slate', 'theme-ocean', 'theme-forest', 'theme-purple', 'theme-rose', 'theme-amber')
    
    // Add the current theme
    html.classList.add(currentTheme)
    
    // Force a style recalculation
    void html.offsetHeight
  }, [theme, resolvedTheme, mounted])

  return <>{children}</>
}

