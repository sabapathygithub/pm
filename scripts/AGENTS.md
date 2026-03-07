# Scripts Notes

This folder contains cross-platform helper scripts for Phase 2 backend scaffold.

macOS:
- `start-mac.sh`
- `stop-mac.sh`

Linux:
- `start-linux.sh`
- `stop-linux.sh`

Windows:
- `start-windows.ps1` and `stop-windows.ps1`
- `start-windows.bat` and `stop-windows.bat` wrappers

Behavior:
- Start scripts run backend with `uv run uvicorn app.main:app --reload` on port `8000`
- PID is written to `scripts/.backend.pid`
- Logs are written to `scripts/.backend.log`