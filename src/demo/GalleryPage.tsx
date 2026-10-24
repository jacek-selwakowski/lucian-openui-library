import { useEffect, useMemo, useRef, useState } from "react";
import { elements, categories } from "@/elements";
import { LucianMount } from "@/runtime/element";
import type { LucianElementDescriptor } from "@/runtime/element";

const CHUNK = 24;

function matches(e: LucianElementDescriptor, query: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    e.title.toLowerCase().includes(q) ||
    e.summary.toLowerCase().includes(q) ||
    e.name.toLowerCase().includes(q) ||
    e.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function GalleryPage() {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  /** How many filtered tiles are mounted; grows as the sentinel scrolls in. */
  const [visible, setVisible] = useState(CHUNK);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of elements) m.set(e.category, (m.get(e.category) ?? 0) + 1);
    return m;
  }, []);

  const filtered = useMemo(() => {
    const list =
      category === "All" ? elements : elements.filter((e) => e.category === category);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => matches(e, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query]);

  // Filtering changes the list — restart from the first chunk.
  useEffect(() => {
    setVisible(CHUNK);
  }, [category, query]);

  // Chunked rendering: mount CHUNK more tiles whenever the sentinel enters the
  // viewport. Keeps the initial paint at ≤24 element mounts (each mounts an
  // IIFE + scoped CSS) instead of all 400.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible((v) => (v >= filtered.length ? v : v + CHUNK));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [filtered.length]);

  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  return (
    <div className="gallery">
      <div className="gallery-controls">
        <div className="gallery-search-wrap">
          <input
            className="gallery-search"
            type="search"
            placeholder="Search title, summary, tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search elements"
          />
        </div>
        <div className="chips" role="group" aria-label="Filter by category">
          <button className="chip" aria-pressed={category === "All"} onClick={() => setCategory("All")}>
            All <span className="count">{elements.length}</span>
          </button>
          {categories.map((c) => (
            <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
              {c} <span className="count">{counts.get(c) ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="gallery-meta">
        Showing {shown.length} of {filtered.length} elements{remaining > 0 ? ` · ${remaining} more on scroll` : ""}
      </div>

      {filtered.length === 0 ? (
        <div className="gallery-empty">No elements match “{query}”.</div>
      ) : (
        <div className="gallery-grid">
          {shown.map((e) => (
            <article key={e.id} className={`tile${e.shape === "tall" ? " tall" : ""}`}>
              <header className="tile-head">
                <span className="tile-id">{e.id}</span>
                <span className="tile-title" title={e.title}>
                  {e.title}
                </span>
                <span className="tile-cat">{e.category}</span>
              </header>
              <div className="tile-body">
                <LucianMount descriptor={e} />
              </div>
            </article>
          ))}
          <div ref={sentinelRef} className="gallery-sentinel" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
