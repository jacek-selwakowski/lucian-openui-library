import { createContext, useContext, useMemo, type ReactNode } from "react";
import "./tokens.css";

export type LucianThemeName = "light" | "dark" | "system";

interface LucianThemeContextValue {
  theme: LucianThemeName;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: LucianThemeName) => void;
}

const LucianThemeContext = createContext<LucianThemeContextValue | null>(null);

function systemTheme(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Scoped theme provider for Lucian elements.
 *
 * The source tokens (and each element's dark-mode rules) listen to
 * `:root[data-theme]` and `prefers-color-scheme`. The converter mirrors every
 * `:root` theme selector onto `.lucian-root`, so setting `data-theme` here
 * scopes light/dark to this subtree without touching the host page.
 */
export function LucianThemeProvider({
  theme = "system",
  onThemeChange,
  children,
}: {
  theme?: LucianThemeName;
  onThemeChange?: (theme: LucianThemeName) => void;
  children: ReactNode;
}) {
  const value = useMemo<LucianThemeContextValue>(() => {
    const resolved = theme === "system" ? systemTheme() : theme;
    return {
      theme,
      resolvedTheme: resolved,
      setTheme: (next) => onThemeChange?.(next),
    };
  }, [theme, onThemeChange]);

  return (
    <LucianThemeContext.Provider value={value}>
      <div className="lucian-root" data-theme={theme === "system" ? resolvedAttr(value) : theme}>
        {children}
      </div>
    </LucianThemeContext.Provider>
  );
}

function resolvedAttr(value: LucianThemeContextValue): string {
  // "system" resolves to the concrete theme too — the .lucian-root mirror
  // rules (tokens.css) key off [data-theme], and the dark media query only
  // fires for :not([data-theme="light"]), so the resolved value is required
  // for scoping to work inside the wrapper. It re-resolves on system change.
  return value.resolvedTheme;
}

export function useLucianTheme(): LucianThemeContextValue {
  const ctx = useContext(LucianThemeContext);
  if (!ctx) {
    return { theme: "system", resolvedTheme: systemTheme(), setTheme: () => {} };
  }
  return ctx;
}

export function isLucianThemeName(value: string): value is LucianThemeName {
  return value === "light" || value === "dark" || value === "system";
}
