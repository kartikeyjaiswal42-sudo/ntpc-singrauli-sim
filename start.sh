#!/bin/bash
cd "$(dirname "$0")"
PORT=3000

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║  NTPC Singrauli — Plant Simulation               ║"
echo "  ╠══════════════════════════════════════════════════╣"
echo "  ║  Open in Chrome:                                 ║"
echo "  ║                                                  ║"
echo "  ║    http://localhost:$PORT/                       ║"
echo "  ║    http://localhost:$PORT/2d/                    ║"
echo "  ║    http://localhost:$PORT/illustrated/           ║"
echo "  ║                                                  ║"
echo "  ║  Press Ctrl+C to stop.                           ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

if command -v npm >/dev/null 2>&1 && [ -d node_modules ]; then
  npm run dev
elif command -v npm >/dev/null 2>&1; then
  npm install && npm run dev
else
  echo "  npm not found — using Python static server (limited; install Node for full app)."
  python3 -m http.server "$PORT"
fi
