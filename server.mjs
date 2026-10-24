#!/usr/bin/env node
/**
 * Lucian demo — chat gateway proxy (dev only).
 *
 *   node server.mjs            # listens on :8787 (override with PORT)
 *
 * The browser never talks to api.thesys.dev directly. Vite (dev + preview)
 * forwards /api/agent here; this server holds THESYS_API_KEY in process env
 * only, injects the system prompt, and relays the Gateway's SSE stream back.
 *
 *   GET  /api/agent  → 200 {ok:true,…} when configured, else
 *                      501 {error:"missing THESYS_API_KEY"} (drives the demo
 *                      setup panel).
 *   POST /api/agent  → relays Chat Completions SSE from the OpenUI Gateway.
 *
 * Env: THESYS_API_KEY (required), OPENUI_MODEL (default "openai/gpt-5"), PORT.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const HOST = "127.0.0.1"; // loopback only — this proxy spends a real API key
const MAX_BODY_BYTES = 1_000_000;
// Dev origins the vite dev/preview servers use. A cross-origin request
// (e.g. a malicious page probing localhost with mode:"no-cors") is rejected
// so other websites cannot spend the user's gateway key.
const ALLOWED_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  // PORT+1 covers `vite preview --port` variations
  `http://localhost:${PORT + 1}`,
  `http://127.0.0.1:${PORT + 1}`,
]);
const GATEWAY_URL = "https://api.thesys.dev/v1/embed/chat/completions";
const MODEL = process.env.OPENUI_MODEL ?? "openai/gpt-5";
const HAS_KEY = Boolean(process.env.THESYS_API_KEY);

/** System prompt: prefer generateSystemPrompt() over a generated spec.json. */
async function loadSystemPrompt() {
  try {
    const specPath = path.join(ROOT, "src", "generated", "spec.json");
    const spec = JSON.parse(await readFile(specPath, "utf8"));
    const { generateSystemPrompt } = await import("@openuidev/lang-core");
    return { prompt: generateSystemPrompt({ cloud: true, library: spec }), source: "generated" };
  } catch {
    return { prompt: FALLBACK_PROMPT, source: "builtin" };
  }
}

const FALLBACK_PROMPT = [
  "You are Lucian, a UI generation assistant for the Lucian component library.",
  'Respond ONLY with a valid OpenUI Lang program. The first statement must assign the root: `root = Page("Title", [children])`.',
  "Available components: Page(title, children), Section(title, gap, children), ShowcaseGrid(minTile, gap, children),",
  "LiquidGlassButton(label), FillProgressDownload(fileName, size), SquashToggle(label), StarRating(question),",
  "FloatingLabelField(), CommandPalette(), ProductAddToCart(product, price), LoginCardFeedback(title, subtitle),",
  "IndeterminateBar(title), EmptyStateFloat(title), ErrorRetry(title), WeatherWidget(location), KpiCountUp(label).",
  "Every referenced name must be defined before or after use in the same program; keep programs small and focused.",
].join("\n");

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(json);
}

async function handleProbe(res) {
  if (!HAS_KEY) return sendJson(res, 501, { error: "missing THESYS_API_KEY" });
  const { source } = await loadSystemPrompt();
  return sendJson(res, 200, { ok: true, model: MODEL, systemPrompt: source });
}

async function handleChat(req, res) {
  if (!HAS_KEY) return sendJson(res, 501, { error: "missing THESYS_API_KEY" });

  if (!isAllowedRequest(req)) {
    return sendJson(res, 403, { error: "forbidden origin" });
  }
  const contentType = String(req.headers["content-type"] ?? "");
  if (!contentType.includes("application/json")) {
    return sendJson(res, 415, { error: "content-type must be application/json" });
  }

  let raw = "";
  let rawLen = 0;
  req.setEncoding("utf8");
  for await (const chunk of req) {
    rawLen += chunk.length;
    if (rawLen > MAX_BODY_BYTES) {
      return sendJson(res, 413, { error: "body too large" });
    }
    raw += chunk;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return sendJson(res, 400, { error: "invalid JSON body" });
  }

  // fetchLLM posts the thread in the chosen wire format; with
  // openAIMessageFormat the messages land in `messages: [{role, content}]`.
  const inbound = Array.isArray(payload?.messages) ? payload.messages : [];
  // Trust only our system prompt — drop anything the client claims.
  const userMessages = inbound.filter((m) => m && typeof m === "object" && m.role !== "system");
  const { prompt } = await loadSystemPrompt();
  const messages = [{ role: "system", content: prompt }, ...userMessages];

  const upstream = new AbortController();
  req.on("close", () => upstream.abort());

  let gatewayRes;
  try {
    gatewayRes = await fetch(GATEWAY_URL, {
      method: "POST",
      signal: upstream.signal,
      headers: {
        authorization: `Bearer ${process.env.THESYS_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, messages, stream: true }),
    });
  } catch (err) {
    if (upstream.signal.aborted) return;
    return sendJson(res, 502, { error: "gateway unreachable", detail: String(err?.cause ?? err) });
  }

  if (!gatewayRes.ok || !gatewayRes.body) {
    const detail = await gatewayRes.text().catch(() => "");
    return sendJson(res, gatewayRes.status || 502, {
      error: "gateway error",
      status: gatewayRes.status,
      detail: detail.slice(0, 500),
    });
  }

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });

  // Relay SSE bytes verbatim; track the tail so we emit [DONE] exactly once.
  let tail = "";
  const reader = gatewayRes.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
      tail = (tail + Buffer.from(value).toString("utf8")).slice(-24);
    }
    if (!tail.includes("[DONE]")) res.write("data: [DONE]\n\n");
  } catch (err) {
    if (!upstream.signal.aborted) console.error("[server.mjs] relay error:", err);
  } finally {
    res.end();
  }
}

/** Same-origin (no Origin header) or an allowed dev origin. */
function isAllowedRequest(req) {
  const origin = req.headers.origin;
  if (origin == null) return true; // same-origin request — no Origin header
  return ALLOWED_ORIGINS.has(String(origin));
}

const server = http.createServer((req, res) => {
  if (!isAllowedRequest(req)) {
    return sendJson(res, 403, { error: "forbidden origin" });
  }
  const url = (req.url ?? "").split("?")[0];
  if (url !== "/api/agent") return sendJson(res, 404, { error: "not found" });
  if (req.method === "GET") return handleProbe(res);
  if (req.method === "HEAD") {
    // Probe without a body: same status logic, headers only.
    res.writeHead(HAS_KEY ? 200 : 501, { "content-type": "application/json; charset=utf-8" });
    return res.end();
  }
  if (req.method === "POST") return handleChat(req, res);
  return sendJson(res, 405, { error: `method ${req.method} not allowed` });
});

server.listen(PORT, HOST, () => {
  console.log(`[server.mjs] chat proxy on http://${HOST}:${PORT}/api/agent (loopback only)`);
  console.log(`[server.mjs] model=${MODEL} key=${HAS_KEY ? "configured" : "MISSING (set THESYS_API_KEY)"}`);
});

server.listen(PORT, () => {
  console.log(`[server.mjs] chat proxy on http://localhost:${PORT}/api/agent`);
  console.log(`[server.mjs] model=${MODEL} key=${HAS_KEY ? "configured" : "MISSING (set THESYS_API_KEY)"}`);
});
