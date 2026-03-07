#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT_DIR/scripts/.backend.pid"
LOG_FILE="$ROOT_DIR/scripts/.backend.log"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Backend already running with PID $(cat "$PID_FILE")"
  exit 0
fi

cd "$ROOT_DIR/backend"
nohup uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

echo "Backend started on http://localhost:8000 (PID $(cat "$PID_FILE"))"
echo "Logs: $LOG_FILE"
