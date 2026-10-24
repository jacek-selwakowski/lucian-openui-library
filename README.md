# Lucian OpenUI Library

A complete [OpenUI](https://thesys.dev) (Open Standard for Generative UI) component library generated from the [Lucian UX/UI Prompt](../lucian-uxui-prompt) collection — **400 production-grade animated web UI elements** (200 interface components + 200 animation components), each one self-contained: scoped CSS, markup, and an interaction script, driven by a shared `--ux-*` design-token theme.

Models compose pages in OpenUI Lang:

```
Page
  Section("Buttons", "m", [
    ShowcaseGrid("m", [
      LiquidGlassButton("Download"),
      SquashToggle("Auto-refresh", "OFF", "ON"),
    ]),
  ])
```

## What's inside

| Layer | File | Contents |
|---|---|---|
| Element descriptors | `src/elements/u001.tsx … u400.tsx` | One descriptor per source element: metadata, CSS, HTML, script, ko→en string pairs. Generated — do not edit by hand. |
| Registry | `src/elements/index.ts` | `elements`, `elementById`, `elementByName`, `categories` (27), `elementsByCategory`, `ELEMENT_COUNT`. |
| Runtime | `src/runtime/element.tsx` | `LucianMount` — mounts an element's CSS + HTML + IIFE into React (StrictMode-safe, CSS injected once, script scoped via `root`). Also `localizeDescriptor` (ko→en) and the escaped `label` override. |
| Theming | `src/runtime/theme.tsx`, `src/runtime/tokens.css` | Light/dark/system provider on `.lucian-root`; theme rules mirrored from `:root[data-theme=…]` so they work inside the wrapper. |
| Curated library | `src/library/curated.tsx` | 54 flagship components — 13 with semantic props (`StarRating(question)`, `KpiCountUp(label)`, `WeatherWidget(location)`, …), the rest generic `label`-only. |
| Full library | `src/library/full.tsx` | `lucianFullLibrary` — every one of the 400 elements as a model-facing component. |
| Prompt options | `src/library/prompt-options.ts` | Server-safe preamble, rules, and validated example programs for the OpenUI Gateway. |
| Demo app | `src/demo/` | Gallery (filter/search/chunked render of all 400), Playground (live OpenUI Lang editor + diagnostics + renderer), Chat (AgentInterface wired to a dev gateway). |

## Quick start

```bash
npm install
npm run build     # tsc -b && vite build
npm run dev       # demo app at :5173
```

Tabs in the demo: **Gallery** (browse all 400 live), **Playground** (write OpenUI Lang, see live diagnostics and rendering), **Chat** (talk to a model that answers in Lucian components).

## Chat / gateway setup

The chat tab needs an OpenUI Gateway API key (server-side only — never bundled):

```bash
npx @openuidev/cli@latest generate-api-key   # once
export THESYS_API_KEY=...                    # server.mjs reads it from env
node server.mjs                              # :8787, vite proxies /api/agent
```

Without the key, the chat tab shows setup instructions instead.

## Regenerating everything

`npm run convert` re-extracts all 400 descriptors from `../lucian-uxui-prompt/src/elements/*.html` with hard gates (count must stay 400, one `currentScript` per file, unique non-reserved names, no stray Hangul). Then:

```bash
npm run spec    # src/generated/spec.json (library spec for the gateway)
npm run prompt  # dist/prompt.txt (~4.4K tokens system prompt)
```

## Using the library elsewhere

```ts
import { lucianLibrary } from "lucian-openui-library/src/library/library";

const parser = createParser(lucianLibrary.toJSONSchema(), "Page");
const { root } = parser.parse(programText);
// render with @openuidev/react-lang <Renderer library={lucianLibrary} response={programText} />
```

Export `lucianFullLibrary` from `src/library/full.ts` when you want the model to see all 400 components.

## Conventions

- OpenUI Lang props are **positional**: `Section("Title", "m", [children])` — optional middle props must be filled.
- The `label` prop on any element overrides its primary text (HTML-escaped, markup allowed, script never touched).
- Some elements carry demo data baked into their script closures (see ARCHITECTURE.md "Known limits") — they animate fine but aren't prop-driven.
- Full design/architecture contract: [ARCHITECTURE.md](./ARCHITECTURE.md).
