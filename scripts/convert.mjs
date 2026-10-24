// Lucian OpenUI Library — deterministic converter (worker A).
//
// Reads the 400 self-contained element files from the pinned source repo
// (lucian-uxui-prompt) and emits:
//   src/elements/uNNN.tsx  — one LucianElementDescriptor per element
//   src/elements/index.ts  — registry (elements, byId, byName, byCategory, …)
//   src/runtime/tokens.css — source tokens with the .lucian-root mirror rule
//
// Parsing mirrors the upstream build (lucian-uxui-prompt/src/build.mjs):
// same regexes for @meta/@demo/@en, <style>, and the trailing <script>.
// Quality gates below run before anything is written; any failure exits 1.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SRC = '/home/jacek/tools/Skills/lucian-uxui-prompt/src'; // pinned source repo
const EL_DIR = join(SRC, 'elements');
const OUT_DIR = join(ROOT, 'src', 'elements');
const TOKENS_IN = join(SRC, 'tokens.css');
const TOKENS_OUT = join(ROOT, 'src', 'runtime', 'tokens.css');

const EXPECTED = 400;
const HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/;
const CURRENT_SCRIPT_EXPR = 'document.currentScript.previousElementSibling';

// Canonical category order (ARCHITECTURE.md) — also drives `categories` export.
const CATEGORY = [
  ['버튼', 'Buttons'],
  ['토글·선택', 'Toggles & Pickers'],
  ['입력·검색', 'Inputs & Search'],
  ['메뉴·탭', 'Menus & Tabs'],
  ['카드·콘텐츠', 'Cards & Content'],
  ['로그인·가입', 'Sign-in & Sign-up'],
  ['알림·피드백', 'Alerts & Feedback'],
  ['로딩·진행', 'Loading & Progress'],
  ['빈·오류 상태', 'Empty & Error States'],
  ['위젯·차트', 'Widgets & Charts'],
  ['공간·일정·디자인 도구', 'Layout, Schedule & Design'],
  ['문서·데이터 편집', 'Document & Data Editing'],
  ['분석·데이터', 'Analytics & Data'],
  ['작업·시스템', 'Workflow & Systems'],
  ['텍스트 모션', 'Text Motion'],
  ['히어로·배경', 'Hero & Backgrounds'],
  ['내비게이션', 'Navigation'],
  ['스크롤 모션', 'Scroll Motion'],
  ['섹션·콘텐츠', 'Sections & Content'],
  ['소셜 증명', 'Social Proof'],
  ['커머스·가격', 'Commerce & Pricing'],
  ['폼·입력', 'Forms & Input'],
  ['앱 화면', 'App Screens'],
  ['빌더 도구', 'Site Builder Tools'],
  ['커서·호버', 'Cursor & Hover'],
  ['프로모션·보상', 'Promos & Rewards'],
  ['데이터 모션', 'Data Motion'],
];
const CATEGORY_EN = Object.fromEntries(CATEGORY);
const CATEGORY_ALIAS = { '메뉴·내비': '메뉴·탭', '탭': '메뉴·탭' };

// OpenUI reserved / built-in names — never emitted as a Lucian component name.
const RESERVED_NAMES = new Set([
  'Query', 'Mutation', 'Action', 'Stack', 'Card', 'Table', 'Text', 'Image',
  'Button', 'Modal', 'Tab', 'Form', 'Chart', 'Icon', 'List', 'Grid', 'Page', 'Section',
]);

// CSS mirror rule (ARCHITECTURE.md §2): every :root theme selector gets a
// .lucian-root twin so themes can be scoped to the provider subtree.
// Longest patterns first; plain variants are not substrings of the :not ones,
// but this ordering is safe regardless.
const MIRROR_RULES = [
  [':root:not([data-theme="light"])', ':root:not([data-theme="light"]),.lucian-root:not([data-theme="light"])'],
  [':root:not([data-theme="dark"])', ':root:not([data-theme="dark"]),.lucian-root:not([data-theme="dark"])'],
  [':root[data-theme="dark"]', ':root[data-theme="dark"],.lucian-root[data-theme="dark"]'],
  [':root[data-theme="light"]', ':root[data-theme="light"],.lucian-root[data-theme="light"]'],
];

function mirrorCss(css) {
  let out = css;
  for (const [from, to] of MIRROR_RULES) out = out.split(from).join(to);
  return out;
}

function pascalCase(slug) {
  return slug.split('-').map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join('');
}

// Escape raw text for safe embedding inside a TS template literal.
// Backslash first (a raw `\d` in source JS/CSS would otherwise be silently
// corrupted by the template literal's own escape processing), then backtick
// and ${ so the literal cannot be terminated or interpolated early.
function tpl(raw) {
  return raw.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

const errors = [];
const notes = [];
const special = []; // elements that needed reserved-prefix / collision handling

const files = readdirSync(EL_DIR).filter((f) => /^\d{3}-[a-z0-9-]+\.html$/.test(f)).sort();
const items = [];
const seenName = new Map(); // name -> id

for (const file of files) {
  const id = file.slice(0, 3);
  const slug = file.slice(4, -5);
  let src = readFileSync(join(EL_DIR, file), 'utf8').replace(/\r\n/g, '\n');

  // --- comment header: @meta (required), @demo (skipped), @en (required) ---
  const metaMatch = src.match(/^\s*<!--\s*@meta\s*([\s\S]*?)-->/);
  if (!metaMatch) { errors.push(`${file}: missing @meta comment`); continue; }
  let meta;
  try { meta = JSON.parse(metaMatch[1]); } catch (e) { errors.push(`${file}: @meta JSON error: ${e.message}`); continue; }
  src = src.slice(metaMatch[0].length).trim();

  const demoMatch = src.match(/^<!--\s*@demo\s*([\s\S]*?)-->/);
  if (demoMatch) src = src.slice(demoMatch[0].length).trim();

  const enMatch = src.match(/^<!--\s*@en\s*([\s\S]*?)-->/);
  let en = null;
  if (enMatch) {
    try { en = JSON.parse(enMatch[1]); } catch (e) { errors.push(`${file}: @en JSON error: ${e.message}`); }
    if (enMatch) src = src.slice(enMatch[0].length).trim();
  }
  if (!en) { errors.push(`${file}: missing @en comment (English title/summary required)`); continue; }
  if (!en.title || !en.summary) { errors.push(`${file}: @en title/summary required`); continue; }

  const pairs = Array.isArray(en.map) ? en.map : [];
  // Words the English version intentionally keeps in Korean (upstream @en.keep):
  // subtracted before Hangul scanning, same as the source build does.
  const keep = Array.isArray(en.keep) ? en.keep : [];
  for (const p of pairs) {
    if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'string' || typeof p[1] !== 'string') {
      errors.push(`${file}: bad @en map entry ${JSON.stringify(p).slice(0, 50)}`);
    }
  }

  // --- category (alias first, then canonical map; fail hard on unknown) ---
  const koCategory = CATEGORY_ALIAS[meta.category] || meta.category;
  const category = CATEGORY_EN[koCategory];
  if (!category) { errors.push(`${file}: unknown category "${meta.category}"`); continue; }

  // --- shape / tags ---
  const shape = meta.shape || 'square';
  if (shape !== 'square' && shape !== 'tall') { errors.push(`${file}: shape must be square or tall`); continue; }
  const tags = Array.isArray(meta.tags) ? meta.tags : [];

  // --- trailing <script> (exactly one), then <style>, then markup ---
  if ((src.match(/<script[\s>]/g) || []).length !== 1) { errors.push(`${file}: exactly one <script> required`); continue; }
  const scriptMatch = src.match(/<script>([\s\S]*?)<\/script>\s*$/);
  if (!scriptMatch) { errors.push(`${file}: missing trailing <script>`); continue; }
  const script = scriptMatch[1].trim();
  const withStyle = src.slice(0, scriptMatch.index).trim();

  const styleMatch = withStyle.match(/^<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) { errors.push(`${file}: missing <style> block`); continue; }
  const css = mirrorCss(styleMatch[1].trim());
  const html = withStyle.slice(styleMatch[0].length).trim();

  // --- component name: PascalCase, reserved-prefix, collision suffix ---
  let name = pascalCase(slug);
  if (RESERVED_NAMES.has(name)) {
    name = 'Lucian' + name;
    special.push(`${id} ${slug}: reserved name → prefixed to ${name}`);
  }
  if (seenName.has(name)) {
    const renamed = name + id;
    special.push(`${id} ${slug}: name collision with ${seenName.get(name)} → appended id → ${renamed}`);
    name = renamed;
  }
  if (seenName.has(name)) { errors.push(`${file}: name still colliding after suffix: ${name}`); continue; }
  seenName.set(name, id);

  items.push({
    file, id, slug, name,
    title: en.title,
    category,
    summary: en.summary,
    tags, shape, css, html, script,
    strings: pairs,
    keep,
    collection: +id > 200 ? 2 : 1,
  });
}

/* ---------------- quality gates (before writing anything) ---------------- */

if (items.length !== EXPECTED) errors.push(`parsed ${items.length} elements, expected ${EXPECTED}`);
if (files.length !== EXPECTED) errors.push(`found ${files.length} source files, expected ${EXPECTED}`);

const seenId = new Set();
for (const it of items) {
  const tag = `${it.file}`;
  if (seenId.has(it.id)) errors.push(`${tag}: duplicate id ${it.id}`);
  seenId.add(it.id);

  // html root: any element tag whose class attribute starts with `ux u{ID}`
  // (397 are <div>; 049/050 use <article>, 312 uses <nav> — class is the invariant,
  // matching upstream build.mjs which only checks `class="ux uNNN"`)
  const rootOk = new RegExp(`^<[a-zA-Z][\\w-]* class="ux u${it.id}[" ]`).test(it.html);
  if (!rootOk) {
    errors.push(`${tag}: html does not start with a root tagged class="ux u${it.id}"`);
  }
  if (it.html.includes('<style')) errors.push(`${tag}: html still contains a <style> block`);

  // script root-finding convention, exactly once
  const occurrences = it.script.split(CURRENT_SCRIPT_EXPR).length - 1;
  if (occurrences !== 1) errors.push(`${tag}: currentScript expression appears ${occurrences}x (need exactly 1)`);

  // English metadata fields must be Korean-free (html/css/script may keep Korean).
  // en map values are scanned with @en.keep words removed — upstream semantics:
  // elements about Korean content (e.g. 142 phrase pairing) keep those words.
  const stripKeep = (s) => it.keep.reduce((acc, w) => acc.split(w).join(''), s);
  if (HANGUL.test(it.title)) errors.push(`${tag}: Hangul in English title`);
  if (HANGUL.test(it.summary)) errors.push(`${tag}: Hangul in English summary`);
  it.strings.forEach(([, en], i) => {
    if (HANGUL.test(stripKeep(en))) errors.push(`${tag}: Hangul in strings[${i}] en value "${en.slice(0, 40)}"`);
  });

  // names: unique (guaranteed by construction) and non-reserved
  if (RESERVED_NAMES.has(it.name)) errors.push(`${tag}: reserved name emitted: ${it.name}`);
}

if (errors.length) {
  console.error('convert failed:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}

/* -------------------------------- output -------------------------------- */

function descriptorFile(it) {
  const strings = it.strings.length
    ? '[\n' + it.strings.map((p) => `    ${JSON.stringify(p)},`).join('\n') + '\n  ]'
    : '[]';
  return `// Generated by scripts/convert.mjs from ${it.file} — do not edit.
import type { LucianElementDescriptor } from "../runtime/element";

export const u${it.id}: LucianElementDescriptor = {
  id: ${JSON.stringify(it.id)},
  name: ${JSON.stringify(it.name)},
  slug: ${JSON.stringify(it.slug)},
  title: ${JSON.stringify(it.title)},
  category: ${JSON.stringify(it.category)},
  summary: ${JSON.stringify(it.summary)},
  tags: ${JSON.stringify(it.tags)},
  shape: ${JSON.stringify(it.shape)},
  css: \`${tpl(it.css)}\`,
  html: \`${tpl(it.html)}\`,
  script: \`${tpl(it.script)}\`,
  strings: ${strings},
  collection: ${it.collection},
};
`;
}

function indexFile(its) {
  const imports = its.map((it) => `import { u${it.id} } from "./u${it.id}";`).join('\n');
  const list = its.map((it) => `u${it.id}`).join(', ');
  const present = CATEGORY.map(([, en]) => en).filter((en) => its.some((it) => it.category === en));
  return `// Generated by scripts/convert.mjs — do not edit.
${imports}

import type { LucianElementDescriptor } from "../runtime/element";

export type { LucianElementDescriptor } from "../runtime/element";

/** All ${EXPECTED} elements in id order (001–400). */
export const elements: LucianElementDescriptor[] = [${list}];

export const elementById: Record<string, LucianElementDescriptor> = Object.fromEntries(
  elements.map((e) => [e.id, e]),
);

export const elementByName: Record<string, LucianElementDescriptor> = Object.fromEntries(
  elements.map((e) => [e.name, e]),
);

/** English category names in canonical order, restricted to categories in use. */
export const categories: string[] = ${JSON.stringify(present, null, 0)};

export const elementsByCategory: Record<string, LucianElementDescriptor[]> = Object.fromEntries(
  categories.map((c) => [c, elements.filter((e) => e.category === c)]),
);

export const ELEMENT_COUNT = ${EXPECTED};
`;
}

/** Explicit light block: bare `:root` carries the light defaults, but a
 * `.lucian-root[data-theme="light"]` subtree inside a DARK host page has
 * no matching rule (the source never defines an explicit light block), so
 * it would inherit dark tokens. Emit a `.lucian-root[data-theme="light"]`
 * copy of the defaults so the provider can force light anywhere. */
function explicitLightBlock(sourceCss) {
  const m = sourceCss.match(/^:root\s*\{([^}]*)\}/m);
  if (!m) throw new Error('convert failed: no bare :root block found in tokens.css');
  return `\n/* Explicit light fallback so .lucian-root[data-theme="light"] can force\n   light tokens inside a dark host page (mirror of the bare :root defaults). */\n.lucian-root[data-theme="light"]{${m[1].trim()}\n}\n`;
}

const tokensSource = readFileSync(TOKENS_IN, 'utf8').replace(/\r\n/g, '\n');
const tokensCss =
  '/* Generated from lucian-uxui-prompt/src/tokens.css by scripts/convert.mjs — do not edit by hand. */\n' +
  mirrorCss(tokensSource) +
  explicitLightBlock(tokensSource);

// Clean stale generated outputs, then write fresh (idempotent regeneration).
mkdirSync(OUT_DIR, { recursive: true });
if (existsSync(OUT_DIR)) {
  for (const f of readdirSync(OUT_DIR)) {
    if (/^u\d{3}\.(ts|tsx)$/.test(f) || f === 'index.ts') rmSync(join(OUT_DIR, f));
  }
}

let bytes = 0;
for (const it of items) {
  const out = descriptorFile(it);
  writeFileSync(join(OUT_DIR, `u${it.id}.tsx`), out);
  bytes += Buffer.byteLength(out);
}
const index = indexFile(items);
writeFileSync(join(OUT_DIR, 'index.ts'), index);
bytes += Buffer.byteLength(index);
writeFileSync(TOKENS_OUT, tokensCss);
bytes += Buffer.byteLength(tokensCss);

if (items.length !== EXPECTED) {
  console.error(`convert failed: wrote ${items.length} descriptors, expected ${EXPECTED}`);
  process.exit(1);
}

/* -------------------------------- report -------------------------------- */

const perCat = CATEGORY.map(([, en]) => [en, items.filter((it) => it.category === en).length])
  .filter(([, n]) => n > 0);
const c1 = items.filter((it) => it.collection === 1).length;
const c2 = items.filter((it) => it.collection === 2).length;

console.log(`OK: ${items.length} elements → ${OUT_DIR} (${(bytes / 1024).toFixed(1)} KB total, incl. index.ts + tokens.css)`);
console.log(`collections: ${c1} interface + ${c2} animation`);
console.log('per category:');
for (const [en, n] of perCat) console.log(`  ${String(n).padStart(3)}  ${en}`);
if (special.length) {
  console.log('special handling:');
  for (const s of special) console.log('  - ' + s);
} else {
  console.log('special handling: none');
}
if (notes.length) console.log('notes:\n' + notes.map((n) => ' - ' + n).join('\n'));
