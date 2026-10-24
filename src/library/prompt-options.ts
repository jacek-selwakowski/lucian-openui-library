import type { PromptOptions } from "@openuidev/lang-core";

/**
 * Prompt options for the curated Lucian library. Server-safe: type-only
 * import, no component or library references — pair with `lucianLibrary`
 * (or `lucianFullLibrary`) wherever you build a system prompt.
 *
 * Both example programs are verified valid against `lucianLibrary`
 * (see scratch/validate.mjs) — keep them in sync if primitives change.
 */
export const lucianPromptOptions: PromptOptions = {
  preamble:
    "Lucian is a library of 400 production-grade animated web UI elements. Each element is a self-contained live widget — buttons, toggles, inputs, cards, charts, loaders, hero scenes — with pointer, touch and keyboard interaction built in. Pages are composed as Page > Section > ShowcaseGrid.",
  additionalRules: [
    "Pick the element whose description best matches the purpose; do not try to rebuild an element from smaller ones. Every Lucian element is interactive and self-animating — pass it text props and let it run.",
    "Group related elements into one Section with a short title, and lay elements out inside ShowcaseGrid tiles; a page of two to four sections reads best.",
    "Prefer a component's props (label, question, title, product, fileName, …) to customize its text; positional argument order follows the props listed in the component docs.",
    "Every Lucian component accepts at most the props documented for it — most take only a text label; do not pass styles, classes or event handlers.",
  ],
  examples: [
    `root = Page("Product spotlight", [features, signals])
features = Section("Try it live", "m", [featureGrid])
featureGrid = ShowcaseGrid(360, "m", [rating, pricing, cart])
rating = StarRating("How was your experience?")
pricing = PricingToggle()
cart = ProductAddToCart("Studio Desk Lamp", "$89")
signals = Section("Live signals", "m", [signalGrid])
signalGrid = ShowcaseGrid(360, "m", [visitors, weather])
visitors = KpiCountUp("Live visitors")
weather = WeatherWidget("Seoul · Seongsu")`,
    `root = Page("Build in motion", [hero, status])
hero = Section("Motion", "m", [heroGrid])
heroGrid = ShowcaseGrid(420, "m", [theme, terminal])
theme = CircularThemeSwitch()
terminal = TerminalDemo()
status = Section("Status", "m", [statusGrid])
statusGrid = ShowcaseGrid(360, "m", [download, progress])
download = FillProgressDownload("quarterly-report.pdf", "12 MB")
progress = IndeterminateBar("Deploy #42", "main · 9c1f2ab")`,
  ],
};
