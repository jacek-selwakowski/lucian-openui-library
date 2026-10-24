import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod";
import { LucianMount, type LucianElementDescriptor } from "@/runtime/element";
import { lucianShowcaseComponent } from "./wrappers";
import { categories, elementById, elementByName } from "@/elements";

/**
 * Curated flagship selection of Lucian elements (~54 of 400).
 *
 * Most entries use `lucianShowcaseComponent` with a custom WHEN-to-use
 * description. A handful expose semantic flat props rendered through
 * `LucianMount` with per-pair `strings` overrides — the runtime escapes
 * every override and substitutes it into markup only, never script
 * (ARCHITECTURE.md §3). Markup-bearing pairs are rebuilt via `withHtml`
 * with escaped values inside code-controlled tags.
 */

/* ------------------------------------------------------------------ */
/* Pure descriptor helpers                                             */
/* ------------------------------------------------------------------ */

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/** Copy of `d` with replaced `html` (for trusted markup transforms: the
 * wrapper tags are code-controlled and any user value inside is escaped). */
function withHtml(d: LucianElementDescriptor, html: string): LucianElementDescriptor {
  return { ...d, html };
}

function el(id: string): LucianElementDescriptor {
  return elementById[id];
}

const INTERACTIVE =
  "Interactive: pointer, touch and keyboard, honors reduced motion.";

/** Generic showcase wrapper with a custom WHEN-to-use description. */
function showcase(id: string, when: string) {
  return lucianShowcaseComponent(el(id), {
    description: `${when} ${INTERACTIVE}`,
  });
}

/* ------------------------------------------------------------------ */
/* Semantic components (flat props over runtime-owned overrides)        */
/* ------------------------------------------------------------------ */

/** Glass capsule button that squashes to a loading drop, then a check. */
export const LiquidGlassButton = defineComponent({
  name: el("001").name,
  description:
    `Primary CTA button with a liquid-glass look; squashes into a loading drop on press, then settles into a check. ${INTERACTIVE}`,
  props: z.object({
    label: z.string().optional().describe('Button text (default "Continue").'),
  }),
  component: ({ props }) => <LucianMount descriptor={el("001")} label={props.label} />,
});

/** Download button that becomes its own progress bar and folds into "Saved". */
export const FillProgressDownload = defineComponent({
  name: el("004").name,
  description:
    `Download action where the button itself turns into a live progress bar, then folds into a "Saved to Downloads" confirmation. Use for file downloads, exports, report generation. ${INTERACTIVE}`,
  props: z.object({
    fileName: z.string().optional().describe('File being downloaded (default "2026 quarterly report.pdf").'),
    size: z.string().optional().describe('Human-readable file size (default "24.6 MB").'),
  }),
  component: ({ props }) => {
    let d = el("004");
    if (props.size != null) {
      d = withHtml(d, d.html.split("24.6 MB").join(escHtml(props.size)));
    }
    return <LucianMount descriptor={d} strings={{ 1: props.fileName }} />;
  },
});

/** Stretchy drag toggle with state captions. */
export const SquashToggle = defineComponent({
  name: el("013").name,
  description:
    `Playful on/off switch whose knob stretches like rubber while traveling; caption swaps with the state. Use for settings rows, mode toggles, DND-style switches. ${INTERACTIVE}`,
  props: z.object({
    label: z.string().optional().describe('Setting name (default "Do Not Disturb").'),
    offText: z.string().optional().describe('Caption while off (default "Notifications ring as usual").'),
    onText: z.string().optional().describe('Caption while on (default "Silenced until 8 AM tomorrow").'),
  }),
  component: ({ props }) => (
    <LucianMount
      descriptor={el("013")}
      label={props.label}
      strings={{ 1: props.offText, 2: props.onText }}
    />
  ),
});

/** Star rating with preview-fill and a popping confirm. */
export const StarRating = defineComponent({
  name: el("016").name,
  description:
    `1–5 star rating input: stars pre-fill under the cursor, then pop on click with a matching word and color. Use for feedback forms, review prompts, satisfaction scores. ${INTERACTIVE}`,
  props: z.object({
    question: z.string().optional().describe('Prompt above the stars (default "How was your order?").'),
  }),
  component: ({ props }) => <LucianMount descriptor={el("016")} label={props.question} />,
});

/** Invite form with notched floating labels and email validation. */
export const FloatingLabelField = defineComponent({
  name: el("025").name,
  description:
    `Two-field form (name + email) whose labels float into a notch in the border on focus; live email validation with shake, hint and a check. Use for short invite/contact forms. ${INTERACTIVE}`,
  props: z.object({
    value: z.string().optional().describe('Pre-filled name (default "Seoyeon Kim").'),
    nameLabel: z.string().optional().describe('Name field label (default "Name").'),
    emailLabel: z.string().optional().describe('Email field label (default "Work email").'),
    buttonLabel: z.string().optional().describe('Submit button text (default "Send invite").'),
  }),
  component: ({ props }) => (
    <LucianMount
      descriptor={el("025")}
      strings={{ 0: props.value, 1: props.emailLabel, 2: props.nameLabel, 4: props.buttonLabel }}
    />
  ),
});

/** Command palette (⌘K) with fuzzy filtering and keyboard navigation. */
export const CommandPalette = defineComponent({
  name: el("046").name,
  description:
    `Search-first command palette: the pill unfolds into a filtered list with moving highlight, keyboard arrows, Enter to run, Esc to fold back. Use for app-level search and quick actions. ${INTERACTIVE}`,
  props: z.object({
    placeholder: z.string().optional().describe('Search input placeholder (default "Search or type a command").'),
  }),
  component: ({ props }) => (
    <LucianMount
      descriptor={el("046")}
      strings={{ 0: props.placeholder ?? "Search or type a command" }}
    />
  ),
});

/** Product card with color refills and a fly-into-cart add. */
export const ProductAddToCart = defineComponent({
  name: el("051").name,
  description:
    `Commerce product card: pick a color and the product refills from the top; Add sends a mini product arcing into the cart badge. Use for product showcases and store demos. ${INTERACTIVE}`,
  props: z.object({
    product: z.string().optional().describe('Product name (default "Daily Bottle 500").'),
    price: z.string().optional().describe('Price with currency (default "$24").'),
  }),
  component: ({ props }) => (
    <LucianMount descriptor={el("051")} strings={{ 2: props.product, 3: props.price }} />
  ),
});

/** Sign-in card with spinner, shake-on-wrong-password and a welcome pane. */
export const LoginCardFeedback = defineComponent({
  name: el("062").name,
  description:
    `Email + password sign-in card: the submit button shrinks to a spinner, wrong passwords shake the card with tries-left feedback, success slides to a welcome pane. Use for auth screens (demo password: any value other than the preset fails). ${INTERACTIVE}`,
  props: z.object({
    heading: z.string().optional().describe('Card heading (default "Welcome back").'),
    subtitle: z.string().optional().describe('Card subheading (default "Sign in with your Lumen account").'),
  }),
  component: ({ props }) => (
    <LucianMount descriptor={el("062")} strings={{ 0: props.heading, 1: props.subtitle }} />
  ),
});

/** Deploy/queue progress: indeterminate segments that resolve into a fill. */
export const IndeterminateBar = defineComponent({
  name: el("083").name,
  description:
    `Pipeline progress widget: indeterminate segments while queued, then the same bar becomes a determinate fill with a step-by-step log. Use for deploy/build/import statuses. ${INTERACTIVE}`,
  props: z.object({
    title: z.string().optional().describe('Job name (default "Deploy #128").'),
    detail: z.string().optional().describe('Job metadata line (default "main · a3f9c21").'),
  }),
  component: ({ props }) => {
    let d = el("083");
    if (props.title != null) {
      d = withHtml(d, d.html.split("<b>배포 #128</b>").join(`<b>${escHtml(props.title)}</b>`));
    }
    if (props.detail != null) {
      d = withHtml(d, d.html.split("main · a3f9c21").join(escHtml(props.detail)));
    }
    return <LucianMount descriptor={d} />;
  },
});

/** Empty state that swallows a template "paper" and becomes a list. */
export const EmptyStateFloat = defineComponent({
  name: el("088").name,
  description:
    `Zero-data state that turns into content: pick a template and a paper flies into the folder, which converts into the first list item; deleting everything settles the folder back. Use for empty project/file/dashboard states. ${INTERACTIVE}`,
  props: z.object({
    title: z.string().optional().describe('List header (default "My projects").'),
    message: z.string().optional().describe('Empty-state headline (default "No projects yet").'),
    hint: z.string().optional().describe('Empty-state guidance (default "Pick a template to start your first project").'),
  }),
  component: ({ props }) => {
    const d = el("088");
    const html =
      props.title != null
        ? d.html.split("<b>내 프로젝트</b>").join(`<b>${escHtml(props.title)}</b>`)
        : d.html;
    return (
      <LucianMount
        descriptor={withHtml(d, html)}
        strings={{ 2: props.message, 3: props.hint }}
      />
    );
  },
});

/** Failed-load widget with countdown retry ring and a recovery chart. */
export const ErrorRetry = defineComponent({
  name: el("090").name,
  description:
    `Data-fetch error state: unplugged plug waits while the retry ring counts down, retries itself, fails once with sparks, then connects and grows the recovered chart. Use for dashboard/feed load failures. ${INTERACTIVE}`,
  props: z.object({
    title: z.string().optional().describe('Widget title (default "Sales this week").'),
  }),
  component: ({ props }) => {
    const d = el("090");
    const html =
      props.title != null
        ? d.html.split("<b>이번 주 매출</b>").join(`<b>${escHtml(props.title)}</b>`)
        : d.html;
    return <LucianMount descriptor={withHtml(d, html)} />;
  },
});

/** Scrub-through-a-day weather sky. */
export const WeatherWidget = defineComponent({
  name: el("094").name,
  description:
    `Day-cycle weather panel: drag the time bar and the sky, sun/moon arc, clouds, rain, stars and temperature all follow the hour. Use for weather, time-of-day or ambient-scene showcases. ${INTERACTIVE}`,
  props: z.object({
    location: z.string().optional().describe('Place label (default "Seoul · Seongsu").'),
  }),
  component: ({ props }) => {
    const d = el("094");
    const html =
      props.location != null
        ? d.html.split("<small>서울 · 성수동</small>").join(`<small>${escHtml(props.location)}</small>`)
        : d.html;
    return <LucianMount descriptor={withHtml(d, html)} />;
  },
});

/** Live KPI with odometer digits and a sliding trend line. */
export const KpiCountUp = defineComponent({
  name: el("098").name,
  description:
    `Realtime metric card: only changed digits roll, the trend line shifts left on each tick, and metric tabs morph the chart. Use for live dashboards, ops/traffic KPIs. ${INTERACTIVE}`,
  props: z.object({
    label: z.string().optional().describe('Metric title (default "Live visitors").'),
  }),
  component: ({ props }) => <LucianMount descriptor={el("098")} strings={{ 0: props.label }} />,
});

/* ------------------------------------------------------------------ */
/* Curated set (semantic + generic showcase components)                */
/* ------------------------------------------------------------------ */

export const curatedComponents = [
  // Buttons
  LiquidGlassButton,
  FillProgressDownload,
  showcase("008", "Copy-to-clipboard action for install commands, API keys or share links; the copy icon redraws as a check with a confirmation bubble."),
  // Toggles & Pickers
  SquashToggle,
  StarRating,
  showcase("019", "Multi-select chips with sliding checks and a max-pick warning shake. Use for interest/topic pickers in onboarding."),
  // Inputs & Search
  FloatingLabelField,
  showcase("026", "Six-box one-time-code entry with per-digit pop-in, auto-advance and verify ripple. Use for OTP/2FA steps."),
  showcase("032", "Drag-and-drop file upload with marching border, per-file progress and retry. Use for upload dropzones."),
  // Menus & Tabs
  showcase("042", "Step-by-step wizard with filling progress line, check-marked steps and directional slide. Use for multi-step setup flows."),
  showcase("044", "One-open-at-a-time FAQ accordion with plus-to-minus rotation. Use for Q&A/help sections."),
  CommandPalette,
  // Cards & Content
  ProductAddToCart,
  showcase("056", "Monthly/yearly pricing switch with rolling price digits and plan highlight ring. Use for pricing sections."),
  showcase("057", "Auto-advancing testimonial carousel with a face picker and progress rings. Use for quotes and reviews."),
  // Sign-in & Sign-up
  LoginCardFeedback,
  showcase("066", "Social sign-in row that folds to a connecting spinner, then resolves to an account row. Use for provider login."),
  // Alerts & Feedback
  showcase("070", "Stacking toasts that fan out on hover and dismiss on swipe. Use for notification demos."),
  showcase("072", "Dismissible inline alert rows that fold away smoothly, with an expandable error log. Use for status banners."),
  // Loading & Progress
  showcase("079", "Skeleton that blooms into real content top-down after a light sweep. Use for content-load placeholders."),
  IndeterminateBar,
  showcase("086", "Streaming AI answer: bouncing dots then word-by-word reveal with a blinking cursor and stop/regenerate. Use for chat/LLM responses."),
  // Empty & Error States
  EmptyStateFloat,
  ErrorRetry,
  // Widgets & Charts
  WeatherWidget,
  showcase("095", "Morphing bar chart: switching period reshapes bars in place; hover isolates a bar and updates the readout. Use for metric comparisons."),
  showcase("096", "Scrubbing stock line with price/date readout and below-baseline color flip. Use for time-series financials."),
  KpiCountUp,
  // Layout, Schedule & Design
  showcase("102", "Collapsible nested file tree with chevrons and highlighted selection. Use for folder/project navigation."),
  showcase("118", "Type specimen comparing font weights on a slider. Use for typography/design showcases."),
  // Document & Data Editing
  showcase("126", "Note that flips between rendered Markdown and its source on one sheet. Use for editor demos."),
  showcase("143", "Mini spreadsheet where editing a number recalculates column totals live. Use for editable grid demos."),
  // Analytics & Data
  showcase("151", "84-day contribution heatmap with a date slider and per-day readout. Use for activity analytics."),
  showcase("160", "Conversion funnel with per-step drop-off and biggest-loss reasons. Use for growth/checkout analytics."),
  // Workflow & Systems
  showcase("180", "Sequential approval line collecting drafted → reviewed → approved stamps. Use for sign-off flows."),
  showcase("193", "Breathing pacer circle for 4-2-4 inhale/hold/exhale coaching. Use for wellness and focus features."),
  // Animation collection
  showcase("207", "Endless two-column testimonial wall that pauses under the pointer. Use for landing-page social proof."),
  showcase("214", "Bento feature grid whose tiles each play their own hover scene. Use for product feature overviews."),
  showcase("215", "Support chat launcher that grows into a window with quick replies and agent handoff. Use for help widgets."),
  showcase("216", "Staggered landing hero entrance: nav, badge, headline, buttons and screen arrive in sequence. Use for page intros."),
  showcase("217", "Three-plan comparison table with pinned header, column hover and a differences-only fold. Use for plan comparison."),
  showcase("219", "Circular-reveal dark mode toggle spreading from the switch itself. Use for theme switching demos."),
  showcase("223", "Sticky card stack that shrinks and recedes under the incoming card while scrolling. Use for scroll storytelling."),
  showcase("224", "AI answer whose sentence badges trace each claim to a hoverable source card. Use for cited/grounded answers."),
  showcase("225", "Cookie consent banner with expanding settings, locked essential switch and a bitten-cookie dismissal. Use for consent flows."),
  showcase("228", "Feature cards lit by a cursor-following glow that crosses card borders. Use for dark-theme feature grids."),
  showcase("229", "Self-typing terminal that installs and runs a dev server, ending in a browser preview. Use for developer product demos."),
  showcase("232", "Passkey sign-in with a ring-lighting fingerprint sheet that resolves to a welcome screen. Use for passwordless auth."),
  showcase("240", "Cart drawer with quantity rollers and a free-shipping progress bar. Use for e-commerce checkout demos."),
  showcase("246", "Bar chart race across years with rank swaps and a scrubbable timeline. Use for temporal rankings."),
  showcase("255", "Kanban board with tilting drag, opening drop gaps and per-column counts. Use for task board demos."),
  showcase("307", "Typewriter effect rotating just the keyword of a sentence with a blinking caret. Use for animated headlines."),
  showcase("319", "Aurora gradient background with drifting light pools that lean toward the cursor. Use for ambient hero backgrounds."),
  showcase("320", "Scratch-to-reveal ticket with flying flakes and confetti wins. Use for rewards and promo moments."),
];

/** Curated components grouped by registry category (registry order), for library composition. */
export const curatedGroups: { name: string; components: string[] }[] = [];
for (const name of categories) {
  const components: string[] = [];
  for (const c of curatedComponents) {
    if (elementByName[c.name]?.category === name) components.push(c.name);
  }
  if (components.length > 0) curatedGroups.push({ name, components });
}
