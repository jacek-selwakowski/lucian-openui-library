/**
 * Sample OpenUI Lang programs for the Playground page.
 *
 * Rules:
 * - Every program must be valid against the current `lucianLibrary`
 *   (parse with zero errors / unresolved / orphaned).
 * - `requires` lists non-core component names the program uses. Programs whose
 *   requirements are not in the live library are hidden from the dropdown, so
 *   curated-component samples appear automatically once they land.
 */

export interface SampleProgram {
  name: string;
  description: string;
  /** Component names (besides Page/Section/ShowcaseGrid) this program needs. */
  requires: string[];
  program: string;
}

export const SAMPLE_PROGRAMS: SampleProgram[] = [
  {
    name: "Layout primitives",
    description: "Page, Section, and ShowcaseGrid — the stable root components.",
    requires: [],
    program: `// Layout primitives — available in every build of the library.
root = Page("Lucian showcase", [intro, tiles])

intro = Section("About this library", null, [
  introTitle,
  introBody
])

introTitle = Section("400 animated UI elements as one OpenUI library", null, [])
introBody = Section("Edit this program on the left, then press Render. Diagnostics update as you type.", null, [])

tiles = ShowcaseGrid(null, "m", [
  tileButtons,
  tileInputs,
  tileCharts
])

tileButtons = Section("Buttons", null, [])
tileInputs = Section("Inputs & search", null, [])
tileCharts = Section("Widgets & charts", null, [])`,
  },
  {
    name: "Feedback & loaders",
    description: "Buttons, progress, and error states from the curated set.",
    requires: ["LiquidGlassButton", "FillProgressDownload", "IndeterminateBar", "EmptyStateFloat", "ErrorRetry", "LoginCardFeedback"],
    program: `// Feedback & loaders — curated interactive elements.
root = Page("Feedback & loaders", [actions, progress, errors])

actions = Section("Actions", null, [
  actionGrid
])

actionGrid = ShowcaseGrid(null, "m", [
  glassButton,
  downloadButton
])

glassButton = Section("Liquid glass CTA", null, [glass])
glass = LiquidGlassButton("Deploy site")
downloadButton = Section("Download with progress", null, [download])
download = FillProgressDownload("design-system-v2.zip", "42 MB")

progress = Section("Progress", null, [
  progressGrid
])

progressGrid = ShowcaseGrid(null, "m", [
  indeterminate,
  emptyState
])

indeterminate = Section("Indeterminate job", null, [job])
job = IndeterminateBar("Syncing workspace")
emptyState = Section("Empty state", null, [empty])
empty = EmptyStateFloat("My projects")

errors = Section("Error handling", null, [
  errorGrid
])

errorGrid = ShowcaseGrid(null, "m", [
  retryTile,
  loginTile
])

retryTile = Section("Retry widget", null, [retry])
retry = ErrorRetry("Region uptime")
loginTile = Section("Sign-in feedback", null, [login])
login = LoginCardFeedback("Lumen", "Sign in with your Lumen account")`,
  },
  {
    name: "Charts & data",
    description: "Live KPIs, weather, and rating widgets from the curated set.",
    requires: ["KpiCountUp", "WeatherWidget", "StarRating"],
    program: `// Charts & data widgets.
root = Page("Charts & data", [main, side])

main = Section("Primary widgets", null, [
  mainGrid
])

mainGrid = ShowcaseGrid(420, "m", [
  kpiTile,
  weatherTile
])

kpiTile = Section("Live metric", null, [kpi])
kpi = KpiCountUp("Live visitors")
weatherTile = Section("Day-cycle weather", null, [weather])
weather = WeatherWidget("Jeju · Hallim")

side = Section("Secondary widgets", null, [
  sideGrid
])

sideGrid = ShowcaseGrid(280, "s", [
  ratingTile,
  toggleTile
])

ratingTile = Section("Rating input", null, [rating])
rating = StarRating("How was the tour?")
toggleTile = Section("Stretchy toggle", null, [toggle])
toggle = SquashToggle("Focus mode")`,
  },
];
