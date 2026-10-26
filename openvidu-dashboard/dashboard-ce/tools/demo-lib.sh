#!/usr/bin/env bash
# Shared parts of the local demos, sourced by dashboard-ce/tools/demo.sh and by the demos of workspaces that extend
# these packages: a MongoDB replica set (a container, or DASHBOARD_DEMO_MONGO_URI), 30 days of generated data kept live,
# and the backend and frontend development servers. The caller sets DATABASE and STATS_MODE and runs from the root of
# its workspace.
#   DASHBOARD_DEMO_MONGO_URI    MongoDB to use instead of the container
#   DASHBOARD_DEMO_MONGO_PORT   host port of the container (default 27018)
#   DASHBOARD_DEMO_KEEP_DATA    true reuses the demo database instead of generating it again

MONGO_IMAGE="${DASHBOARD_TEST_MONGO_IMAGE:-openvidu/mongodb:8.0.29-r1}"
MONGO_CONTAINER=openvidu-dashboard-demo-mongo
MONGO_PORT="${DASHBOARD_DEMO_MONGO_PORT:-27018}"
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

start_mongo() {
	if [ "$(docker inspect -f '{{.State.Running}}' "$MONGO_CONTAINER" 2>/dev/null)" != true ]; then
		docker rm -f "$MONGO_CONTAINER" >/dev/null 2>&1 || true
		echo "Starting MongoDB ($MONGO_CONTAINER, port $MONGO_PORT)"
		# Docker's default soft limit of 1024 open files crashes mongod once a few databases have been generated.
		docker run -d --name "$MONGO_CONTAINER" -p "127.0.0.1:$MONGO_PORT:27017" --ulimit nofile=64000:64000 \
			--entrypoint /opt/bitnami/mongodb/bin/mongod "$MONGO_IMAGE" \
			--replSet rs0 --bind_ip_all --port 27017 --dbpath /tmp --wiredTigerCacheSizeGB 1 >/dev/null
	fi

	for _ in $(seq 1 60); do
		docker exec "$MONGO_CONTAINER" /opt/bitnami/mongodb/bin/mongosh --quiet --eval \
			'try { rs.status().ok } catch (e) { rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] }).ok }' \
			2>/dev/null | grep -q 1 && return 0
		sleep 1
	done

	echo "MongoDB did not become ready" >&2
	exit 1
}

# prepare_data: MongoDB, the generated database (unless kept) and the keep-alive of its active sessions; sets MONGO_URI.
prepare_data() {
	if [ -n "${DASHBOARD_DEMO_MONGO_URI:-}" ]; then
		MONGO_URI="$DASHBOARD_DEMO_MONGO_URI"
	else
		docker info >/dev/null 2>&1 || {
			echo "Docker is required: MongoDB runs in a container (or set DASHBOARD_DEMO_MONGO_URI)." >&2
			exit 1
		}
		start_mongo
		MONGO_URI="mongodb://127.0.0.1:$MONGO_PORT/?directConnection=true"
	fi

	if [ "${DASHBOARD_DEMO_KEEP_DATA:-false}" != true ]; then
		echo "Generating $DATABASE (scenario S, 30 days, $STATS_MODE stats)"
		pnpm --silent --filter @openvidu-dashboard/data-generator run generate --uri "$MONGO_URI" --db "$DATABASE" \
			--scenario S --days 30 --stats-mode "$STATS_MODE" --drop --five-minute-rollups --node-rollups --room-sums \
			--active-window 60 --min-active-rooms 10 | tail -2
	fi

	pnpm --silent --filter @openvidu-dashboard/data-generator run keep-alive --uri "$MONGO_URI" --db "$DATABASE" &
	PIDS+=("$!")
}

# start_backend <package> <port> [VAR=value...]: the backend development server on the demo database, in the background.
start_backend() {
	local package="$1"
	local port="$2"

	shift 2
	env SERVER_PORT="$port" DASHBOARD_BASE_PATH=/ ADMIN_USERNAME=admin ADMIN_PASSWORD=admin DATABASE_URL="$MONGO_URI" \
		DATABASE_NAME="$DATABASE" "$@" pnpm --silent --filter "$package" run dev &
	PIDS+=("$!")
}

# start_frontend <package> <port> <backend port>: the frontend development server proxying /api to that backend.
start_frontend() {
	local proxy=()

	if [ "$3" != "$DEFAULT_BACKEND_PORT" ]; then
		printf '{ "/api": { "target": "http://localhost:%s", "secure": false } }\n' "$3" >"$WORK_DIR/proxy-$2.json"
		proxy=(--proxy-config "$WORK_DIR/proxy-$2.json")
	fi

	pnpm --silent --filter "$1" run dev --port "$2" "${proxy[@]}"
}
