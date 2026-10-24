import { createLibrary } from "@openuidev/react-lang";
import { categories, elementByName, elements } from "@/elements";
import { Page, Section, ShowcaseGrid } from "./primitives";
import { lucianShowcaseComponent } from "./wrappers";
import { curatedComponents } from "./curated";

/** Element ids that have curated semantic components — the generic 1-prop
 * showcase wrapper must not shadow their richer prop signatures. */
const curatedIds = new Set(
  curatedComponents
    .map((c) => elementByName[c.name]?.id)
    .filter((id): id is string => id != null),
);

/**
 * The full Lucian library: layout primitives, the curated semantic
 * components, and every remaining element wrapped as a showcase component.
 * Huge by design — opt-in for consumers that want the whole collection;
 * the curated `lucianLibrary` is the default.
 */
export const lucianFullLibrary = createLibrary({
  id: "lucian-full",
  root: "Page",
  components: [
    Page,
    Section,
    ShowcaseGrid,
    ...curatedComponents,
    ...elements
      .filter((element) => !curatedIds.has(element.id))
      .map((element) => lucianShowcaseComponent(element)),
  ],
  componentGroups: [
    {
      name: "Layout",
      components: ["Page", "Section", "ShowcaseGrid"],
      notes: [
        "Page is the required root; use one Section per topic and ShowcaseGrid to lay elements out in responsive tiles.",
      ],
    },
    ...categories.map((name: string) => ({
      name,
      components: elements
        .filter((element) => element.category === name)
        .map((element) => element.name),
    })),
  ],
});
