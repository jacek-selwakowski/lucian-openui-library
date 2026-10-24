import { useEffect, useState } from "react";
import { LucianThemeProvider } from "@/runtime/theme";
import { GalleryPage } from "./GalleryPage";
import { PlaygroundPage } from "./PlaygroundPage";
import { ChatPage } from "./ChatPage";

type Tab = "gallery" | "playground" | "chat";
type ThemeChoice = "light" | "dark" | "system";

const TABS: { id: Tab; label: string }[] = [
  { id: "gallery", label: "Gallery" },
  { id: "playground", label: "Playground" },
  { id: "chat", label: "Chat" },
];

const THEMES: ThemeChoice[] = ["light", "dark", "system"];

export function App() {
  const [tab, setTab] = useState<Tab>("gallery");
  const [theme, setTheme] = useState<ThemeChoice>("system");
  // Force a re-render when the OS preference flips so "system" re-resolves.
  const [, setPrefTick] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setPrefTick((t) => t + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Mirror the resolved choice onto <html> so the page background follows
  // tokens.css media queries; "system" defers to the OS preference.
  useEffect(() => {
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <LucianThemeProvider theme={theme}>
      <div className="app">
        <header className="app-header">
          <div className="app-brand">
            Lucian <span>OpenUI Library</span>
          </div>
          <nav className="app-nav" aria-label="Pages">
            {TABS.map((t) => (
              <button
                key={t.id}
                className="app-tab"
                aria-selected={tab === t.id}
                role="tab"
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="theme-toggle" role="group" aria-label="Theme">
            {THEMES.map((th) => (
              <button key={th} aria-pressed={theme === th} onClick={() => setTheme(th)}>
                {th}
              </button>
            ))}
          </div>
        </header>
        <main className="app-main">
          {tab === "gallery" && <GalleryPage />}
          {tab === "playground" && <PlaygroundPage />}
          {tab === "chat" && <ChatPage />}
        </main>
      </div>
    </LucianThemeProvider>
  );
}
