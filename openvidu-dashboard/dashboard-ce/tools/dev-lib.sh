#!/usr/bin/env bash
# Development servers of the local runs, sourced by dev.sh and demo-lib.sh here and by the scripts of workspaces that
# extend these packages: the backend and frontend development servers in one session, stopped together. The caller
# runs from the root of its workspace.

# pnpm --dir takes the nearest pnpm-workspace.yaml as the workspace and installs it before running, which for the
# packages of a nested checkout (an extending workspace's ce/) would build a second node_modules there.
export NPM_CONFIG_WORKSPACE_DIR="$PWD"

# The frontend development servers proxy /api to port 5000 (proxy.conf.json); another backend gets its own proxy file.
DEFAULT_BACKEND_PORT=5000
WORK_DIR="$(mktemp -d)"
PIDS=()

kill_tree() {
	local child

	for child in $(pgrep -P "$1" || true); do
		kill_tree "$child"
	done

	kill "$1" 2>/dev/null || true
}

cleanup() {
	for pid in "${PIDS[@]}"; do
		kill_tree "$pid"
	done

	rm -rf "$WORK_DIR"
}
trap cleanup EXIT

# require_free_ports <port>...: exits when one is in use.
require_free_ports() {
	local port

	for port in "$@"; do
		if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
			echo "Port $port is in use" >&2
			exit 1
		fi
	done
}

wait_for() {
	for _ in $(seq 1 120); do
		curl -sf -o /dev/null "$1" && return 0
		sleep 1
	done

	echo "$1 did not answer" >&2
	exit 1
}

# check_dev_backend <package directory>: exits when the backend there cannot start, with its scripts/dev-check.ts
# and the variables of its scripts/dev-preload.ts.
check_dev_backend() {
	pnpm --silent --dir "$1" exec tsx --conditions=source --import ./scripts/dev-preload.ts scripts/dev-check.ts
}

# start_dev_backend <package directory> <port> [VAR=value...]: the backend development server in the background. The
# variables win over the files of its scripts/dev-preload.ts.
start_dev_backend() {
	local directory="$1"
	local port="$2"

	shift 2
	env SERVER_PORT="$port" "$@" pnpm --silent --dir "$directory" run dev &
	PIDS+=("$!")
}

# start_frontend <package directory> <port> <backend port>: the frontend development server proxying /api to that
# backend.
start_frontend() {
	local proxy=()

	if [ "$3" != "$DEFAULT_BACKEND_PORT" ]; then
		printf '{ "/api": { "target": "http://localhost:%s", "secure": false } }\n' "$3" >"$WORK_DIR/proxy-$2.json"
		proxy=(--proxy-config "$WORK_DIR/proxy-$2.json")
	fi

	pnpm --silent --dir "$1" run dev --port "$2" "${proxy[@]}"
}
