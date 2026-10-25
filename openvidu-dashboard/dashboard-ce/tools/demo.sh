#!/usr/bin/env bash
# Local CE demo on generated data (see demo-lib.sh): 30 days of scenario S with per-participant stats, node heartbeats
# and active sessions kept live, and the backend and frontend development servers. Sign in as admin / admin.
# Usage: dashboard-ce/tools/demo.sh ce
#   http://localhost:4200, backend on port 5000
#   DASHBOARD_DEMO_PORT         port of the frontend development server (default 4200)
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

if [ "${1:-}" != ce ]; then
	echo "Usage: dashboard-ce/tools/demo.sh ce" >&2
	exit 1
fi

FRONTEND_PORT="${DASHBOARD_DEMO_PORT:-4200}"
DATABASE=dashboard_demo_ce
STATS_MODE=participant

# shellcheck source=dashboard-ce/tools/demo-lib.sh
source dashboard-ce/tools/demo-lib.sh

require_free_ports "$DEFAULT_BACKEND_PORT" "$FRONTEND_PORT"
prepare_data
start_backend @openvidu-dashboard/backend "$DEFAULT_BACKEND_PORT"
wait_for "http://127.0.0.1:$DEFAULT_BACKEND_PORT/api/healthcheck"
echo "OpenVidu Dashboard ce demo: http://localhost:$FRONTEND_PORT (admin / admin)"
start_frontend @openvidu-dashboard/frontend "$FRONTEND_PORT" "$DEFAULT_BACKEND_PORT"
