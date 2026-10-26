#!/usr/bin/env bash
# Smoke test of a dashboard image: MONGO_ENABLED=false exits 0; against a throwaway MongoDB replica set the container
# becomes healthy, answers GET /api/healthcheck and HEAD /, runs as uid 1000, honours SERVER_PORT in its health check
# and stops with code 0 within the 10 s of docker stop; the uncompressed image fits its size budget.
# Usage: dashboard-ce/docker/smoke-test.sh <image> <budget-mb> [docker run options...]
# The options reach every container of the image, e.g. the environment and mounts an edition needs to start.
set -euo pipefail

IMAGE="${1:?image required}"
BUDGET_MB="${2:?budget in MB required}"
shift 2
MONGO_IMAGE="${DASHBOARD_TEST_MONGO_IMAGE:-openvidu/mongodb:8.0.29-r1}"
RUN_ID="ovd-smoke-$$"
NETWORK="$RUN_ID"

cleanup() {
	docker rm -f "$RUN_ID-app" "$RUN_ID-port" "$RUN_ID-mongo" "$RUN_ID-size" >/dev/null 2>&1 || true
	docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

step() {
	echo "--- $*"
}

COMMON_ENV=(-e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=smoke-password "$@")

step "MONGO_ENABLED=false exits 0"
docker run --rm -e MONGO_ENABLED=false "${COMMON_ENV[@]}" "$IMAGE" || fail "MONGO_ENABLED=false did not exit 0"

step "MongoDB replica set"
docker network create "$NETWORK" >/dev/null
docker run -d --name "$RUN_ID-mongo" --network "$NETWORK" --network-alias mongo \
	--entrypoint /opt/bitnami/mongodb/bin/mongod "$MONGO_IMAGE" \
	--replSet rs0 --bind_ip_all --port 27017 --dbpath /tmp --wiredTigerCacheSizeGB 0.25 >/dev/null
for _ in $(seq 1 60); do
	docker exec "$RUN_ID-mongo" /opt/bitnami/mongodb/bin/mongosh --quiet --eval \
		'try { rs.status().ok } catch (e) { rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongo:27017" }] }).ok }' \
		2>/dev/null | grep -q 1 && break
	sleep 1
done
DATABASE_URL="mongodb://mongo:27017/?replicaSet=rs0"

wait_healthy() {
	local container="$1"
	local status=""

	for _ in $(seq 1 90); do
		status="$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo missing)"
		[ "$status" = "healthy" ] && return 0
		sleep 1
	done

	docker logs "$container" >&2 || true
	fail "$container is $status, not healthy"
}

step "container becomes healthy"
docker run -d --name "$RUN_ID-app" --network "$NETWORK" -p 127.0.0.1::5000 --health-interval=2s \
	-e DATABASE_URL="$DATABASE_URL" "${COMMON_ENV[@]}" "$IMAGE" >/dev/null
wait_healthy "$RUN_ID-app"
PORT="$(docker port "$RUN_ID-app" 5000/tcp | head -1 | sed 's/.*://')"

step "GET /api/healthcheck and HEAD /"
[ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/healthcheck")" = "200" ] ||
	fail "GET /api/healthcheck did not answer 200"
HEAD_STATUS="$(curl -s -o /dev/null -I -w '%{http_code}' "http://127.0.0.1:$PORT/")"
[[ "$HEAD_STATUS" == 2* ]] || fail "HEAD / answered $HEAD_STATUS"

step "process runs as uid 1000"
[ "$(docker exec "$RUN_ID-app" id -u)" = "1000" ] || fail "the process does not run as uid 1000"

step "docker stop exits 0 within 10 s"
START="$(date +%s)"
docker stop "$RUN_ID-app" >/dev/null
ELAPSED="$(($(date +%s) - START))"
EXIT_CODE="$(docker inspect -f '{{.State.ExitCode}}' "$RUN_ID-app")"
[ "$EXIT_CODE" = "0" ] || fail "docker stop left exit code $EXIT_CODE"
[ "$ELAPSED" -lt 10 ] || fail "docker stop took ${ELAPSED}s"

step "SERVER_PORT=6000 is honoured by the health check"
docker run -d --name "$RUN_ID-port" --network "$NETWORK" --health-interval=2s -e SERVER_PORT=6000 \
	-e DATABASE_URL="$DATABASE_URL" "${COMMON_ENV[@]}" "$IMAGE" >/dev/null
wait_healthy "$RUN_ID-port"

step "size within ${BUDGET_MB} MB"
# The apparent size of the image filesystem, whatever the storage backend: with the containerd image store,
# `docker image inspect` adds the compressed blobs and `docker history` counts disk blocks.
docker create --name "$RUN_ID-size" "$IMAGE" >/dev/null
SIZE_MB="$(($(docker export "$RUN_ID-size" | wc -c) / 1000000))"
docker rm "$RUN_ID-size" >/dev/null
echo "image size: ${SIZE_MB} MB"
[ "$SIZE_MB" -le "$BUDGET_MB" ] || fail "image size ${SIZE_MB} MB exceeds the budget of ${BUDGET_MB} MB"

echo "smoke test passed: $IMAGE"
