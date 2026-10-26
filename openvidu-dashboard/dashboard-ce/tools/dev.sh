#!/usr/bin/env bash
# Local development against openvidu-local-deployment (see dev-lib.sh): the backend and frontend development servers,
# both reloading on changes. The backend reads dashboard-ce/backend/dev.env, overridden by dashboard-ce/backend/.env
# (git-ignored) and by the environment.
# Usage: dashboard-ce/tools/dev.sh
#   DASHBOARD_DEV_PORT          port of the frontend development server (default 4200)
#   DASHBOARD_DEV_BACKEND_PORT  port of the backend development server (default 5000)
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

FRONTEND_PORT="${DASHBOARD_DEV_PORT:-4200}"
BACKEND_PORT="${DASHBOARD_DEV_BACKEND_PORT:-5000}"

# shellcheck source=dashboard-ce/tools/dev-lib.sh
source dashboard-ce/tools/dev-lib.sh

require_free_ports "$BACKEND_PORT" "$FRONTEND_PORT"
check_dev_backend dashboard-ce/backend
start_dev_backend dashboard-ce/backend "$BACKEND_PORT"
wait_for "http://127.0.0.1:$BACKEND_PORT/api/healthcheck"
echo "OpenVidu Dashboard: http://localhost:$FRONTEND_PORT"
start_frontend dashboard-ce/frontend "$FRONTEND_PORT" "$BACKEND_PORT"
