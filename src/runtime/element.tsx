import { memo, useEffect, useRef, type CSSProperties } from "react";

/**
 * A Lucian element ported verbatim from the source collection
 * (https://github.com/Seokwoooo/lucian-uxui-prompt).
 *
 * The source elements are self-contained HTML fragments: scoped CSS
 * (every selector under `.uNNN`), a markup root `div.ux.uNNN`, and an IIFE
 * script that finds its root via `document.currentScript.previousElementSibling`.
 * The converter (scripts/convert.mjs) extracts those three parts plus the
 * localization map; this runtime mounts them inside React.
 */
export interface LucianElementDescriptor {
  /** Zero-padded number, "001" … "400". */
  id: string;
  /** Generated PascalCase component name, unique across the collection. */
  name: string;
  /** File slug, e.g. "liquid-glass-button". */
  slug: string;
  /** English title from @en. */
  title: string;
  /** English category name (see CATEGORY_EN in ARCHITECTURE.md). */
  category: string;
  /** English summary from @en. */
  summary: string;
  /** Tags from @meta. */
  tags: string[];
  /** Tile shape hint from @meta ("square" | "tall"). */
  shape: "square" | "tall";
  /** Scoped CSS from the element's <style> block, theme selectors mirrored for .lucian-root. */
  css: string;
  /** Markup fragment: the `div.ux.uNNN` root and its contents (no <style>). */
  html: string;
  /** The element IIFE. Contains `document.currentScript.previousElementSibling` exactly once. */
  script: string;
  /** Korean → English string pairs from @en.map, in source order (first pair = primary label). */
  strings: [string, string][];
  /** Collection: 1 = Interface (001–200), 2 = Animation (201–400). */
  collection: 1 | 2;
}

/* ------------------------------------------------------------------ */
/* CSS injection — one <style> per element, added once per page load. */
/* ------------------------------------------------------------------ */

const injectedCss = new Set<string>();

export function ensureElementCss(descriptor: LucianElementDescriptor): void {
  if (typeof document === "undefined" || injectedCss.has(descriptor.id)) return;
  injectedCss.add(descriptor.id);
  const style = document.createElement("style");
  style.dataset.lucianElement = descriptor.id;
  style.textContent = descriptor.css;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/* Localization + prop substitution                                    */
/* ------------------------------------------------------------------ */

/** Escape untrusted text before it is embedded into element markup.
 * Quotes are included so values substituted inside double-quoted attributes
 * (value="…", placeholder="…", aria-label="…") cannot break out.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface LocalizedElement {
  html: string;
  script: string;
}

/** Per-pair text overrides (by pair index). Applied to markup only. */
export type StringOverrides = { [index: number]: string | undefined };

export interface LocalizeOptions {
  /** Replacement for the primary (first) string pair. Escaped, markup-only. */
  label?: string;
  /** Replacements for any string pair, keyed by pair index. Escaped, markup-only. */
  strings?: StringOverrides;
}

/**
 * Apply the Korean → English map to markup and script, with optional
 * user-provided overrides.
 *
 * Security contract (ARCHITECTURE.md §3):
 * - Authored `en` values are trusted: they pass through raw (many carry
 *   intentional markup like `<b>Deploy #128</b>`) and they are the *only*
 *   values ever substituted into the script.
 * - Overrides (`label`, `strings`) are untrusted: fully HTML-escaped and
 *   substituted into markup ONLY. Prop text can never become executable
 *   code and can never break out of an attribute context.
 * - Pairs are applied longest-first to avoid substring collisions.
 */
export function localizeDescriptor(
  descriptor: LucianElementDescriptor,
  options?: LocalizeOptions,
): LocalizedElement {
  const label = options?.label;
  const overrides = options?.strings;
  const pairs = descriptor.strings
    .map((pair, index) => ({ pair, index }))
    .sort((a, b) => b.pair[0].length - a.pair[0].length);
  let html = descriptor.html;
  let script = descriptor.script;
  for (const { pair: [ko, en], index } of pairs) {
    const override =
      overrides?.[index] ?? (index === 0 && label != null ? label : undefined);
    // Markup: override (escaped) when provided; authored en passes raw.
    html = html.split(ko).join(override != null ? escapeHtml(override) : en);
    // Script: authored en only — overrides never touch executable code.
    script = script.split(ko).join(en);
  }
  return { html, script };
}

/* ------------------------------------------------------------------ */
/* Script mounting                                                     */
/* ------------------------------------------------------------------ */

/**
 * Run an element's IIFE against a live root node. The source convention
 * (`var root = document.currentScript.previousElementSibling`) is rewritten to
 * the injected `__lucianRoot` parameter — a name the sources never use, so the
 * script's own `var root` cannot shadow it (a param named `root` would make
 * `var root = root` assign undefined).
 */
export function mountElementScript(script: string, root: HTMLElement): void {
  // Source scripts expect `root` to be the element's own `.ux` root node (the
  // previousElementSibling of the original script tag). Hosts typically mount
  // via `wrapper.innerHTML = html`, which adds one wrapper level — resolve it.
  const ux = root.firstElementChild;
  const target =
    ux instanceof HTMLElement && ux.classList.contains("ux") ? ux : root;
  const body = script.replace(
    /document\.currentScript\.previousElementSibling/g,
    "__lucianRoot",
  );
  new Function("__lucianRoot", body)(target);
}

/* ------------------------------------------------------------------ */
/* React mount component                                               */
/* ------------------------------------------------------------------ */

export interface LucianMountProps {
  descriptor: LucianElementDescriptor;
  /** Replaces the element's primary (first-mapped) string. Escaped, markup-only. */
  label?: string;
  /** Per-pair string overrides (see LocalizeOptions). Escaped, markup-only. */
  strings?: StringOverrides;
  className?: string;
  style?: CSSProperties;
}

/** Cheap stable fingerprint of the localized markup. */
function htmlKey(html: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < html.length; i++) {
    h ^= html.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${html.length.toString(36)}:${(h >>> 0).toString(36)}`;
}

/**
 * Renders one Lucian element: injects its scoped CSS, renders its markup,
 * and starts its behavior script against the rendered root.
 */
export const LucianMount = memo(function LucianMount({
  descriptor,
  label,
  strings,
  className,
  style,
}: LucianMountProps) {
  ensureElementCss(descriptor);
  const ref = useRef<HTMLDivElement>(null);
  const { html, script } = localizeDescriptor(descriptor, { label, strings });
  const key = htmlKey(html);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // First mount, or markup changed (prop update swapped the innerHTML,
    // destroying the nodes the IIFE captured) — (re)run the script.
    // StrictMode's double-invoke is absorbed by the key comparison.
    if (node.dataset.lucianMounted === "1" && node.dataset.lucianHtml === key) return;
    node.dataset.lucianMounted = "1";
    node.dataset.lucianHtml = key;
    mountElementScript(script, node);
    // Elements clean up through their own `root.isConnected` guards; listeners
    // attached to the root subtree are garbage-collected with the DOM node.
  }, [script, key]);

  return (
    <div
      ref={ref}
      className={className ? `lucian-mount ${className}` : "lucian-mount"}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
