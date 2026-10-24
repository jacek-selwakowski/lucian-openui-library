import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod";

/**
 * Layout primitives for the Lucian OpenUI library.
 * Containers use `children: z.array(z.any())` — the same pattern as the
 * built-in `Stack` — and render children through `renderNode`.
 */

const GAP_VALUES = ["none", "xs", "s", "m", "l", "xl"] as const;

function gapValue(gap?: string): string {
  switch (gap) {
    case "none":
      return "0";
    case "xs":
      return "8px";
    case "s":
      return "12px";
    case "l":
      return "24px";
    case "xl":
      return "40px";
    default:
      return "16px";
  }
}

/** Root container every Lucian program starts from. */
export const Page = defineComponent({
  name: "Page",
  description:
    'Root container. Vertical page layout with a heading and content children. Use exactly once as the root of a program.',
  props: z.object({
    title: z.string().optional().describe("Page heading shown at the top."),
    children: z.array(z.any()).describe("Page content blocks."),
  }),
  component: ({ props, renderNode }) => (
    <div
      className="lucian-page"
      style={{ display: "flex", flexDirection: "column", gap: gapValue("l"), padding: "24px" }}
    >
      {props.title ? (
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--ux-ink, inherit)",
          }}
        >
          {props.title}
        </h1>
      ) : null}
      {renderNode(props.children)}
    </div>
  ),
});

/** A titled vertical section. */
export const Section = defineComponent({
  name: "Section",
  description:
    'Vertical group with an optional small heading. Use to separate a page into parts, e.g. "Actions", "Status".',
  props: z.object({
    title: z.string().optional().describe("Section heading."),
    gap: z.enum(GAP_VALUES).optional().describe('Vertical spacing, default "m".'),
    children: z.array(z.any()).describe("Section content."),
  }),
  component: ({ props, renderNode }) => (
    <section style={{ display: "flex", flexDirection: "column", gap: gapValue(props.gap) }}>
      {props.title ? (
        <h2
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 650,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--ux-ink-2, inherit)",
          }}
        >
          {props.title}
        </h2>
      ) : null}
      {renderNode(props.children)}
    </section>
  ),
});

/** Responsive grid for showcasing several interactive elements side by side. */
export const ShowcaseGrid = defineComponent({
  name: "ShowcaseGrid",
  description:
    'Grid of interactive showcase tiles. Use when presenting several demo elements at once; each child renders in its own tile.',
  props: z.object({
    minTile: z
      .number()
      .optional()
      .describe("Minimum tile width in px before wrapping (default 360)."),
    gap: z.enum(GAP_VALUES).optional().describe('Tile spacing, default "m".'),
    children: z.array(z.any()).describe("Elements to display, one per tile."),
  }),
  component: ({ props, renderNode }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${props.minTile ?? 360}px, 1fr))`,
        gap: gapValue(props.gap),
      }}
    >
      {renderNode(props.children)}
    </div>
  ),
});
