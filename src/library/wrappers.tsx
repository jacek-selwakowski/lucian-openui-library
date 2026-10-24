import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod";
import { LucianMount, type LucianElementDescriptor } from "@/runtime/element";

/**
 * Wrap any generated Lucian element descriptor as an OpenUI component with an
 * optional `label` prop that overrides the element's primary string.
 *
 * This is the bridge used by the full library (all 400 elements) and as the
 * render engine for curated components that need richer props.
 */
export function lucianShowcaseComponent(
  descriptor: LucianElementDescriptor,
  options?: { description?: string; extraProps?: "none" },
) {
  return defineComponent({
    name: descriptor.name,
    description:
      options?.description ??
      `${descriptor.summary} Interactive: pointer, touch and keyboard, honors reduced motion. Category: ${descriptor.category}.`,
    props: z.object({
      label: z
        .string()
        .optional()
        .describe(
          `Overrides the element's main text (default "${descriptor.strings[0]?.[1] ?? descriptor.title}").`,
        ),
    }),
    component: ({ props }) => <LucianMount descriptor={descriptor} label={props.label} />,
  });
}
