#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT_DIR/scripts/.backend.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No PID file found. Backend may already be stopped."
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Stopped backend process $PID"
else
  echo "Process $PID not running"
fi

rm -f "$PID_FILE"
