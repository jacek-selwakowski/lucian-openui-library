import { useMemo, useState } from "react";
import { createParser, Renderer } from "@openuidev/react-lang";
import { lucianLibrary } from "@/library/library";
import { SAMPLE_PROGRAMS } from "./samples";

/** One parser per page load; parsers memoize by schema identity. */
const parser = createParser(lucianLibrary.toJSONSchema(), "Page");

export function PlaygroundPage() {
  const [text, setText] = useState(SAMPLE_PROGRAMS[0].program);
  const [selected, setSelected] = useState(SAMPLE_PROGRAMS[0].name);
  const [program, setProgram] = useState(SAMPLE_PROGRAMS[0].program);

  // Only offer samples the live library can fully resolve.
  const available = useMemo(
    () =>
      SAMPLE_PROGRAMS.filter((s) => s.requires.every((name) => name in lucianLibrary.components)),
    [],
  );

  const { diag, parseError } = useMemo<{ diag: ReturnType<typeof parser.parse> | null; parseError: string | null }>(() => {
    try {
      return { diag: parser.parse(program), parseError: null };
    } catch (err) {
      return { diag: null, parseError: err instanceof Error ? err.message : String(err) };
    }
  }, [program]);

  const meta = diag?.meta;
  const ok =
    diag !== null &&
    diag.root !== null &&
    meta!.incomplete === false &&
    meta!.errors.length === 0 &&
    meta!.unresolved.length === 0 &&
    meta!.orphaned.length === 0;

  return (
    <div className="playground">
      <section className="pane" aria-label="Program editor">
        <div className="pane-head">
          OpenUI Lang
          <select
            value={selected}
            onChange={(e) => {
              const sample = available.find((s) => s.name === e.target.value);
              if (sample) {
                setSelected(sample.name);
                setText(sample.program);
                setProgram(sample.program);
              }
            }}
            aria-label="Sample programs"
          >
            {available.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="playground-editor"
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="OpenUI Lang program"
        />
        <div className="playground-actions">
          <button className="btn primary" onClick={() => setProgram(text)}>
            Render
          </button>
          <button
            className="btn"
            onClick={() => {
              const sample = available.find((s) => s.name === selected) ?? available[0];
              if (sample) {
                setText(sample.program);
                setProgram(sample.program);
              }
            }}
          >
            Reset sample
          </button>
        </div>
        <div className="diagnostics" aria-live="polite">
          <div className="diag-title">
            Diagnostics
            {ok ? (
              <span className="diag-ok">valid · {meta!.statementCount} statements</span>
            ) : (
              <span className="diag-item error">needs attention</span>
            )}
          </div>
          {parseError && <div className="diag-item error">{parseError}</div>}
          {diag && meta!.incomplete && (
            <div className="diag-item warn">
              <span className="diag-code">incomplete</span> Input looks truncated (unclosed brackets or strings).
            </div>
          )}
          {diag?.root === null && (
            <div className="diag-item error">
              <span className="diag-code">no-root</span> Nothing renders — no reachable root component.
            </div>
          )}
          {meta!.errors.map((e, i) => (
            <div key={i} className={`diag-item ${e.severity === "warning" ? "warn" : "error"}`}>
              <span className="diag-code">{e.code}</span>
              {e.statementId ? <strong>{e.statementId}</strong> : null} {e.message}
              {e.component ? ` (${e.component}${e.path ? " " + e.path : ""})` : null}
            </div>
          ))}
          {meta!.unresolved.length > 0 && (
            <div className="diag-item warn">
              <span className="diag-code">unresolved</span> {meta!.unresolved.join(", ")}
            </div>
          )}
          {meta!.orphaned.length > 0 && (
            <div className="diag-item warn">
              <span className="diag-code">orphaned</span> {meta!.orphaned.join(", ")}
            </div>
          )}
        </div>
      </section>

      <section className="pane" aria-label="Rendered program">
        <div className="pane-head">Preview</div>
        <div className="render-pane-body">
          <Renderer library={lucianLibrary} response={program} />
        </div>
      </section>
    </div>
  );
}
