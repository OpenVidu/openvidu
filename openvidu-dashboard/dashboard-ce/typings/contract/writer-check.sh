#!/usr/bin/env bash
# End-to-end data model contract check against the writer: openvidu-livekit vendors this contract, its document structs
# produce the fixtures, the OpenVidu server initializes an empty MongoDB database that accepts every fixture with
# `validation_action: error`, and the dashboard backend started against that database reports matching schema versions.
# Usage: dashboard-ce/typings/contract/writer-check.sh <path to openvidu-livekit>
# Requires Docker, Go, curl and a built backend (pnpm --filter "@openvidu-dashboard/backend..." run build).
set -euo pipefail

LIVEKIT="$(cd "${1:?path to openvidu-livekit required}" && pwd)"
TYPINGS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$(cd "$TYPINGS/../backend" && pwd)"
MONGO_IMAGE="${DASHBOARD_TEST_MONGO_IMAGE:-openvidu/mongodb:8.0.29-r1}"
REDIS_IMAGE="redis:8.10.2-alpine"
RUN_ID="ovd-contract-$$"
WORK="$(mktemp -d)"
DATABASE="openvidu_contract"
ADMIN_PASSWORD="contract-password"
SERVER_PID=""
DASHBOARD_PID=""

cleanup() {
	[ -z "$SERVER_PID" ] || kill "$SERVER_PID" 2>/dev/null || true
	[ -z "$DASHBOARD_PID" ] || kill "$DASHBOARD_PID" 2>/dev/null || true
	docker rm -f "$RUN_ID-mongo" "$RUN_ID-redis" >/dev/null 2>&1 || true
	rm -rf "$WORK"
}
trap cleanup EXIT

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

step() {
	echo "--- $*"
}

free_port() {
	node -e "const s = require('node:net').createServer().listen(0, '127.0.0.1', () => { console.log(s.address().port); s.close(); });"
}

published_port() {
	docker port "$1" "$2/tcp" | head -1 | sed 's/.*://'
}

mongosh() {
	docker exec "$RUN_ID-mongo" /opt/bitnami/mongodb/bin/mongosh --quiet "$@"
}

step "openvidu-livekit vendors this contract"
VENDORED="$LIVEKIT/openvidu/analytics/schema/contract"
diff -r "$TYPINGS/schema" "$VENDORED/schema" >/dev/null && diff -r "$TYPINGS/fixtures" "$VENDORED/fixtures" >/dev/null ||
	fail "$VENDORED differs from dashboard-ce/typings: run dashboard-ce/typings/contract/vendor.sh in the change that updated it"

step "MongoDB replica set and Redis"
docker run -d --name "$RUN_ID-mongo" -p 127.0.0.1::27017 -v "$TYPINGS/fixtures:/fixtures:ro" \
	--entrypoint /opt/bitnami/mongodb/bin/mongod "$MONGO_IMAGE" \
	--replSet rs0 --bind_ip_all --port 27017 --dbpath /tmp --wiredTigerCacheSizeGB 0.25 >/dev/null
docker run -d --name "$RUN_ID-redis" -p 127.0.0.1::6379 "$REDIS_IMAGE" >/dev/null
for _ in $(seq 1 60); do
	mongosh --eval 'try { rs.status().ok } catch (e) { rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] }).ok }' \
		2>/dev/null | grep -q 1 && break
	sleep 1
done
mongosh --eval 'let i = 0; while (!db.hello().isWritablePrimary && i < 100) { sleep(100); i++; } if (!db.hello().isWritablePrimary) { quit(1); }' ||
	fail "the MongoDB replica set has no primary"
# The member advertises localhost:27017, unreachable from the host, so clients connect directly.
MONGO_URI="mongodb://127.0.0.1:$(published_port "$RUN_ID-mongo" 27017)/?directConnection=true"
REDIS_ADDRESS="127.0.0.1:$(published_port "$RUN_ID-redis" 6379)"

step "the writer's document structs produce the fixtures"
(cd "$LIVEKIT" && ANALYTICS_TEST_MONGO_URI="$MONGO_URI" go test -tags integration -count=1 -run '^TestContractFixtures$' \
	./openvidu/analytics/)

step "the OpenVidu server initializes an empty database"
(cd "$LIVEKIT" && timeout 600 go build -o "$WORK/livekit-server" ./cmd/server) ||
	fail "the OpenVidu server did not build within 10 minutes"
SERVER_HTTP_PORT="$(free_port)"
cat >"$WORK/livekit.yaml" <<EOF
port: $SERVER_HTTP_PORT
bind_addresses: [127.0.0.1]
rtc:
  tcp_port: $(free_port)
  udp_port: $(free_port)
  use_external_ip: false
turn:
  enabled: false
redis:
  address: $REDIS_ADDRESS
keys:
  contractkey: contract-secret-of-at-least-32-characters
openvidu:
  analytics:
    enabled: true
    mongo_url: $MONGO_URI
    database: $DATABASE
    validation_action: error
EOF
"$WORK/livekit-server" --config "$WORK/livekit.yaml" >"$WORK/server.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do
	grep -q "analytics database initialized" "$WORK/server.log" && break
	kill -0 "$SERVER_PID" 2>/dev/null || break
	sleep 1
done
grep -q "analytics database initialized" "$WORK/server.log" || {
	cat "$WORK/server.log" >&2
	fail "the OpenVidu server did not initialize the analytics database"
}
# Bounded, so that a server that does not stop on SIGTERM fails here with its log instead of at the job timeout.
kill "$SERVER_PID"
for _ in $(seq 1 20); do
	kill -0 "$SERVER_PID" 2>/dev/null || break
	sleep 1
done
if kill -0 "$SERVER_PID" 2>/dev/null; then
	kill -9 "$SERVER_PID"
	cat "$WORK/server.log" >&2
	fail "the OpenVidu server did not stop within 20 s of SIGTERM"
fi
wait "$SERVER_PID" || true
SERVER_PID=""

step "the initialized database accepts every fixture"
# schema_meta is the writer's own record; the other fixtures keep their BSON types through canonical EJSON.
mongosh "$DATABASE" --eval '
	const fs = require("fs");
	for (const file of fs.readdirSync("/fixtures").filter((name) => name.endsWith(".json")).sort()) {
		const collection = file.slice(0, -".json".length);
		if (collection === "schema_meta") continue;
		const documents = EJSON.parse(fs.readFileSync(`/fixtures/${file}`, "utf8"), { relaxed: false });
		db.getCollection(collection).insertMany(documents);
		print(`${collection}: ${documents.length}`);
	}'

step "the dashboard reports matching schema versions"
PORT="$(free_port)"
DATABASE_URL="$MONGO_URI" DATABASE_NAME="$DATABASE" ADMIN_USERNAME=admin ADMIN_PASSWORD="$ADMIN_PASSWORD" \
	SERVER_PORT="$PORT" node "$BACKEND/dist/server.js" >"$WORK/dashboard.log" 2>&1 &
DASHBOARD_PID=$!
for _ in $(seq 1 30); do
	curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/healthcheck" && break
	sleep 1
done
TOKEN="$(curl -sf -X POST -H 'Content-Type: application/json' \
	-d "{\"username\":\"admin\",\"password\":\"$ADMIN_PASSWORD\"}" "http://127.0.0.1:$PORT/api/v1/auth/login" |
	node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(0, "utf8")).accessToken)')" || {
	cat "$WORK/dashboard.log" >&2
	fail "the dashboard did not start"
}
curl -sf -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/api/v1/info" | node -e '
	const { schema } = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
	if (schema.status !== "ok" || schema.writer !== schema.dashboard) {
		console.error(`FAIL: schema ${JSON.stringify(schema)}`);
		process.exit(1);
	}
	console.log(`writer and dashboard at schema version ${schema.dashboard}`);'

echo "contract check passed"
