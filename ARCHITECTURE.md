# Lucian OpenUI Library — Architecture Contract

This document is the **binding contract** for all work in this repository. Read it fully before changing anything. If reality disagrees with this file, fix the file first.

## Goal

Turn the 400 self-contained animated UI elements from
`/home/jacek/tools/Skills/lucian-uxui-prompt` (the "source repo") into a **full OpenUI component library**:
the model-facing generative-UI standard from https://github.com/thesysdev/openui (packages `@openuidev/*`, installed here).

Deliverables:

1. `src/elements/u001.tsx … u400.tsx` + `src/elements/index.ts` — every element as a `LucianElementDescriptor` (generated, deterministic).
2. `src/library/` — the OpenUI libraries: `lucianLibrary` (curated, model-facing) and `lucianFullLibrary` (all 400 exposed), root components, prompt options.
3. `src/demo/` — Vite React demo: gallery of all 400, an OpenUI Lang playground (write Lang, see it render), and an AgentInterface chat page.
4. `src/generated/spec.json` — library spec via `npm run spec`.

## Source repo facts (verified)

- Elements live at `src/elements/NNN-slug.html` (001–400). 001–200 = Interface collection, 201–400 = Animation collection.
- File anatomy (in this order):
  1. `<!-- @meta {"title","category","summary","hint","shape","hue","hue2","tags"} -->` (Korean; `shape`, `hue`, `hue2` optional)
  2. `<!-- @demo [...] -->`
  3. `<!-- @en {"title","summary","hint","map":[[ko,en],...]} -->` (`map` may be `[]`)
  4. `<style>…scoped CSS…</style>` — every selector under `.uNNN`; `@property` names start `--uNNN-`
  5. markup root: an element with `class="ux uNNN"` — usually `<div>`, but 049/050 use `<article>` and 312 uses `<nav>` (class attribute is the invariant)
  6. `<script>…IIFE…</script>` — contains `document.currentScript.previousElementSibling` **exactly once** (verified for all 400)
- Colors come only from `--ux-*` tokens defined in source `src/tokens.css`.
- Theme selectors used anywhere: `:root[data-theme="dark"]`, `:root[data-theme="light"]`, `:root:not([data-theme="light"])`, `:root:not([data-theme="dark"])`, plus bare `:root` and `@media (prefers-color-scheme)`.

## Category map (Korean → English, canonical)

`버튼`→Buttons · `토글·선택`→Toggles & Pickers · `입력·검색`→Inputs & Search · `메뉴·탭`→Menus & Tabs · `카드·콘텐츠`→Cards & Content · `로그인·가입`→Sign-in & Sign-up · `알림·피드백`→Alerts & Feedback · `로딩·진행`→Loading & Progress · `빈·오류 상태`→Empty & Error States · `위젯·차트`→Widgets & Charts · `공간·일정·디자인 도구`→Layout, Schedule & Design · `문서·데이터 편집`→Document & Data Editing · `분석·데이터`→Analytics & Data · `작업·시스템`→Workflow & Systems · `텍스트 모션`→Text Motion · `히어로·배경`→Hero & Backgrounds · `내비게이션`→Navigation · `스크롤 모션`→Scroll Motion · `섹션·콘텐츠`→Sections & Content · `소셜 증명`→Social Proof · `커머스·가격`→Commerce & Pricing · `폼·입력`→Forms & Input · `앱 화면`→App Screens · `빌더 도구`→Site Builder Tools · `커서·호버`→Cursor & Hover · `프로모션·보상`→Promos & Rewards · `데이터 모션`→Data Motion

(The build also aliases `메뉴·내비` and `탭` to `메뉴·탭`.)

## Repo layout (this project)

```
scripts/convert.mjs          # generator: source repo → src/elements/* + tokens.css  [worker A]
src/runtime/element.tsx      # LucianElementDescriptor, LucianMount, localize, css inject  [DONE, stable]
src/runtime/theme.tsx        # LucianThemeProvider (.lucian-root scoping)  [DONE, stable]
src/runtime/tokens.css       # generated from source tokens.css (mirror rule below)  [generated]
src/elements/uNNN.tsx        # 400 generated descriptor files  [worker A]
src/elements/index.ts        # registry: descriptors[], byId, byCategory, ELEMENT_COUNT  [worker A]
src/library/wrappers.tsx     # descriptor→React bridge + generic defineComponent wrapper  [worker B]
src/library/primitives.tsx   # Page (root), Section, Grid  [worker B]
src/library/curated.tsx      # ~50 flagship defineComponents with semantic props  [worker B]
src/library/library.ts       # lucianLibrary (curated, grouped)  [worker B]
src/library/full.ts          # lucianFullLibrary (all 400)  [worker B]
src/library/prompt-options.ts  [worker B]
src/demo/                    # App, GalleryPage, PlaygroundPage, ChatPage  [worker C]
```

## Contracts

### 1. Descriptor (src/runtime/element.tsx — already written, do not change)

```ts
export interface LucianElementDescriptor {
  id: string;            // "001"
  name: string;          // PascalCase from slug, unique
  slug: string;
  title: string;         // English
  category: string;      // English category above
  summary: string;       // English
  tags: string[];
  shape: "square" | "tall";
  css: string;           // style content, :root theme selectors mirrored (rule below)
  html: string;          // markup fragment incl. root div.ux.uNNN, WITHOUT <style>
  script: string;        // IIFE verbatim (currentScript expression left intact)
  strings: [string, string][]; // ko→en from @en.map, source order
  collection: 1 | 2;
}
```

`LucianMount({ descriptor, label?, strings?, className?, style? })` renders it. Text substitution contract (security-critical, enforced in `localizeDescriptor`):

- **Authored `strings` EN values are trusted** — substituted raw into markup (many carry intentional markup like `<b>Deploy #128</b>`) and they are the **only** values ever substituted into the script.
- **`label` and `strings` overrides are untrusted** — fully HTML-escaped (incl. `"`/`'`, so attribute contexts like `value="…"` cannot break out) and applied to **markup only, never the script**. Prop text can never become executable code.
- Markup-bearing pairs are re-built in `curated.tsx` via `withHtml` with escaped values inside code-controlled tags.
- `LucianMount` re-runs the element script when the localized markup changes (prop updates swap `innerHTML`, which detaches the nodes the IIFE captured), keyed by a fingerprint of the html.
- `mountElementScript(script, host)` rewrites the `document.currentScript.previousElementSibling` chain to an injected `__lucianRoot` parameter (a param literally named `root` would be shadowed by the scripts' own `var root` and become `undefined`), and resolves `host.firstElementChild` when it is the element's `.ux` root — scripts expect `root` to be the `.ux.uNNN` element itself (sibling-relative DOM ops like `root.insertBefore(child, bin)` break one level up). A live browser mount check for all 400 elements runs as gate 2b of `verify.sh`.

### 2. CSS mirror rule (apply to tokens.css AND every element css)

Replace, order irrelevant (inputs don't overlap):

- `:root[data-theme="dark"]` → `:root[data-theme="dark"],.lucian-root[data-theme="dark"]`
- `:root[data-theme="light"]` → `:root[data-theme="light"],.lucian-root[data-theme="light"]`
- `:root:not([data-theme="light"])` → `:root:not([data-theme="light"]),.lucian-root:not([data-theme="light"])`
- `:root:not([data-theme="dark"])` → `:root:not([data-theme="dark"]),.lucian-root:not([data-theme="dark"])`

Bare `:root` selectors stay untouched (tokens must remain document-global; custom properties inherit down). In addition, the converter appends an explicit `.lucian-root[data-theme="light"]` block (copy of the bare `:root` light defaults) so a light provider subtree can force light tokens inside a dark host page — without it, light only exists as inherited `:root` defaults.

### 3. Name generation (converter)

`name = PascalCase(slug)` — split `-`, capitalize each part, join. If a collision occurs (shouldn't; slugs are unique), append the numeric id. Never emit OpenUI reserved names (`Query`, `Mutation`, `Action`, `Stack`, `Card`, `Table`, `Text`, `Image`, `Button`, `Modal`, `Tab`, `Form`, `Chart`, `@Count`, `@Sum`, `@ToAssistant`, `@OpenUrl`, `@Set`, `@Reset`, `@Run`): if a slug would produce one, prefix `Lucian`.

### 4. OpenUI library rules (from the openui skill — binding)

- `defineComponent({ name, description, props: z.object({...}), component })` from `@openuidev/react-lang`; Zod 4 (`zod` v4).
- Props are **positional in key order; required first, optional last.** Keep props flat. Optional props may only be omitted **from the end** — an optional slot in the middle must be filled with an empty string, e.g. `Section("T","",[...])`. The demo samples and prompt-options examples follow this.
- Children slots: `props: z.object({ children: z.array(ChildA.ref) })`, render with `renderNode(props.children)`.
- `createLibrary({ id, root, components })`; root must be a listed component.
- Group with `componentGroups: [{ name, components, notes? }]`.
- Descriptions must say **when to use** and what the props mean; state units/ranges.
- Never put user text into prompt options/preamble.
- Custom functions: `defineFunction`, pure, name starts uppercase, no reserved reuse.
- The library must be importable on a server for spec generation: keep `src/library/prompt-options.ts` free of component imports; `library.ts` itself may import React components (CLI `generate --spec` handles it; verify `npm run spec` works).

### 5. Demo app rules

- Vite + React 19, entry `index.html` → `src/demo/main.tsx`. Three routes via simple state tabs (no router dep): **Gallery**, **Playground**, **Chat**.
- Gallery: category filter + text search over `title/summary/tags`; render tiles with `LucianMount`; `shape:"tall"` tiles span 2 rows. Wrap in `LucianThemeProvider`.
- Playground: textarea for OpenUI Lang → `<Renderer library={lucianLibrary} response={text} />`; show parse diagnostics via `createParser(lucianLibrary.toJSONSchema(), "Page")`; ship 3+ sample programs (one per major group).
- Chat: `AgentInterface` from `@openuidev/react-ui` wired to Gateway through the local dev server proxy (`/api/agent`), key from server env `THESYS_API_KEY` — **never** bundle, echo, or ask for the key value; show a setup hint when missing. Read `/home/jacek/.agents/skills/openui/references/agent-interface.md` and `gateway.md` for wiring and follow them.
- Styling of demo chrome: use `--ux-*` tokens; minimal, dark-capable. Import `@/runtime/tokens.css` once in `main.tsx`.

### 6. Generated-file policy

- `src/elements/*`, `src/runtime/tokens.css`, `src/generated/*` are generated. Never hand-edit; regenerate with `npm run convert` / `npm run spec`.
- Commit generated element files (they are the library payload); regenerate on demand.
### 7. Known limits (accepted)

- Some element scripts hardcode demo data in closures (e.g. u008 copy text, u013/u016/u017 initial state, u056/u098 data arrays, u062 demo credentials `lumen2026`) — not prop-able; documented per-component in `curated.tsx` descriptions.
- Element animations run their own timers (rAF/`setTimeout`); all 400 were audited to clean up (removeEventListener, isConnected guards, clearInterval). If a host unmounts a subtree abruptly, at most one trailing tick can fire harmlessly.
- The full library bundles one large JS chunk (≈5.5 MB) — fine for local demo/hosted use; the curated library is the model-facing surface.
- `src/generated/` and `dist/` are gitignored; element descriptors (`src/elements/`) are committed.

## Commands

- `npm run convert` — regenerate elements + tokens from source repo (path pinned inside script)
- `npm run dev` — demo at :5173
- `npm run build` — typecheck + production build (must pass)
- `npm run spec` — write `src/generated/spec.json`
- `npm run prompt` — full generated system prompt for review

## Definition of done

1. `npm run convert` exits 0, emits exactly 400 descriptors, `index.ts` exports them.
2. `npm run build` passes.
3. `npm run spec` produces `spec.json` for `lucianLibrary`.
4. Gallery renders all 400 without cross-element CSS/JS leakage.
5. Playground sample programs parse and render.
6. No secrets in code; no user text in prompt options.
