#!/usr/bin/env bash
# Dev helper: run all validation gates from the project root, regardless of caller cwd.
set -euo pipefail
cd "$(dirname "$0")"
echo "== 1/5 security regression checks =="
npx esbuild scratch/verify-security.ts --bundle --format=esm --outfile=scratch/verify-security.mjs \
  --alias:@=./src --external:react --external:react-dom --external:zod \
  --external:@openuidev/react-lang --external:@openuidev/lang-core --log-level=error
node scratch/verify-security.mjs
echo "== 2/5 library + sample-program validation =="
node scratch/validate.mjs
echo "== 2b/5 live browser mount check (all 400 elements) =="
if node -e 'require("playwright")' 2>/dev/null || [ -d "$HOME/.npm/_npx/e41f203b7505f1fb/node_modules/playwright" ]; then
  (npx vite --port 5199 --strictPort >/tmp/lucian-vite.log 2>&1 &)
  for i in $(seq 1 20); do curl -s -o /dev/null http://127.0.0.1:5199/ && break; sleep 0.5; done
  OUT="$(node scratch/probe-mounts.cjs http://127.0.0.1:5199/ | head -1)"
  pkill -f "vite --port 5199" || true
  echo "$OUT"
  case "$OUT" in *"failures=0"*) ;; *) echo "MOUNT GATE FAILED"; exit 1;; esac
else
  echo "playwright not found — skipping live mount gate"
fi
echo "== 3/5 typecheck =="
npx tsc -b --noEmit && echo "tsc clean"
echo "== 4/5 build =="
npx vite build 2>&1 | tail -1
echo "== 5/5 spec + prompt =="
npm run spec --silent && npm run prompt --silent
ls -la src/generated/spec.json dist/prompt.txt
echo "ALL GATES PASSED"
