import { createLibrary } from "@openuidev/react-lang";
import { Page, Section, ShowcaseGrid } from "./primitives";
import { curatedComponents, curatedGroups } from "./curated";

/**
 * Lucian OpenUI library — curated flagship set.
 *
 * Layout primitives plus ~54 hand-picked elements (see src/library/curated.tsx)
 * grouped by category. The full 400-element variant is `lucianFullLibrary`
 * from src/library/full.ts. Keep the export names `lucianLibrary` and
 * `lucianFullLibrary` stable at all times — the demo app imports them directly.
 */
export const lucianLibrary = createLibrary({
  id: "lucian",
  root: "Page",
  components: [Page, Section, ShowcaseGrid, ...curatedComponents],
  componentGroups: [
    {
      name: "Layout",
      components: ["Page", "Section", "ShowcaseGrid"],
      notes: [
        "Page is the required root; use one Section per topic and ShowcaseGrid to lay elements out in responsive tiles.",
      ],
    },
    ...curatedGroups,
  ],
});

export { lucianFullLibrary } from "./full";
export { lucianPromptOptions } from "./prompt-options";
/** The CLI (`openui generate`) resolves this module's default library via the `library` export name. */
export { lucianLibrary as library };
