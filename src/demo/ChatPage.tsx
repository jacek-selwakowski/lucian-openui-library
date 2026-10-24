import { useEffect, useState } from "react";
import { AgentInterface, fetchLLM } from "@openuidev/react-ui";
// openAIAdapter/openAIMessageFormat are NOT re-exported by @openuidev/react-ui
// 0.18.1 (doc/reference mismatch) — import from the hoisted peer instead.
import { openAIAdapter, openAIMessageFormat } from "@openuidev/react-headless";
import { lucianLibrary } from "@/library/library";

type GatewayStatus = "checking" | "ready" | "missing-key" | "unreachable";

const llm = fetchLLM({
  url: "/api/agent",
  streamAdapter: openAIAdapter(),
  messageFormat: openAIMessageFormat,
});

function SetupPanel({ status }: { status: GatewayStatus }) {
  return (
    <div className="chat-page">
      <div className="setup-panel">
        <div className="setup-card">
          <h2>
            {status === "missing-key"
              ? "Chat needs a THESYS_API_KEY"
              : "Chat dev server is not running"}
          </h2>
          <p className="setup-note">
            {status === "missing-key"
              ? "The gateway proxy is up, but no API key is configured on the server."
              : "Nothing answered at /api/agent. The demo expects a small Node proxy on port 8787."}
          </p>
          <div className="setup-steps">
            <ol>
              <li>
                Create a key: <code>npx @openuidev/cli@latest generate-api-key</code>
              </li>
              <li>
                Export it: <code>export THESYS_API_KEY=…</code>
              </li>
              <li>
                Start the proxy (separate terminal): <code>node server.mjs</code>
              </li>
              <li>
                Run the app: <code>npm run dev</code> — Vite forwards <code>/api/agent</code> to
                <code>localhost:8787</code>.
              </li>
            </ol>
          </div>
          <p className="setup-note">
            The key is read server-side only — it is never bundled into the browser build.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ChatPage() {
  const [status, setStatus] = useState<GatewayStatus>("checking");

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/agent", { signal: ctrl.signal })
      .then((res) => {
        if (res.ok) setStatus("ready");
        else if (res.status === 501) setStatus("missing-key");
        else setStatus("unreachable");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus("unreachable");
      });
    return () => ctrl.abort();
  }, []);

  if (status === "checking") {
    return (
      <div className="chat-page">
        <p className="setup-note">Checking the agent gateway…</p>
      </div>
    );
  }

  if (status !== "ready") return <SetupPanel status={status} />;

  return (
    <div className="chat-full">
      <AgentInterface
        llm={llm}
        componentLibrary={lucianLibrary}
        agentName="Lucian"
        starters={[
          { displayText: "Dashboard with live KPIs", prompt: "Build a stats dashboard with live KPIs and a weather widget." },
          { displayText: "Pricing page with CTA", prompt: "Show a pricing page with a glass button and a download CTA." },
          { displayText: "Feedback states", prompt: "Demo feedback states: a star rating, an empty state, and an error retry widget." },
        ]}
      />
    </div>
  );
}
