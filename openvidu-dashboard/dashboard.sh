#!/usr/bin/env bash
# Entry point for every workspace task. CI calls this script, so keep commands stable.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

COMMAND="${1:-help}"
SKIP_INSTALL=false
ARGS=()

if [ $# -gt 0 ]; then
	shift
fi

for arg in "$@"; do
	case "$arg" in
		--skip-install) SKIP_INSTALL=true ;;
		-*)
			echo "Unknown option: $arg" >&2
			exit 1
			;;
		*) ARGS+=("$arg") ;;
	esac
done

usage() {
	cat <<'EOF'
Usage: ./dashboard.sh <command> [ce|<path>] [--skip-install]

Commands:
  install        pnpm install for the whole workspace
  lint           ESLint on every package (warnings fail)
  lint-fix       ESLint with --fix
  format         Prettier --write
  format-check   Prettier --check
  typecheck      tsc --noEmit in every package that defines it
  build          Build every package in dependency order
  dev            Frontend dev server on http://localhost:4200, proxying /api to the backend on port 5000
  demo [ce]      Local demo on generated data: MongoDB (a container, or DASHBOARD_DEMO_MONGO_URI), 30 days of data
                 kept live, backend and frontend dev servers on http://localhost:4200 (admin / admin)
  test           Unit tests (Vitest) of every package that defines them (same as test-unit)
  test-unit      Unit tests (Vitest) of every package that defines them
  test-integration  Integration tests against MongoDB (Docker required)
  e2e            Build the application and run the Playwright tests against it with a mocked API
  spec-validate  openspec validate --all --strict
  check          lint + format-check + typecheck + spec-validate + test-unit
  build-image [ce]  Build openvidu/openvidu-dashboard (IMAGE_TAG, default dev; BASE_HREF, default /)
  smoke-image [ce]  Smoke test of that image (health, port, user, docker stop, size budget)
  contract-check <openvidu-livekit>  Data model contract check against the writer of that checkout (Docker and Go
                 required)
  clean          Remove node_modules and dist directories
  help           Show this message

Options:
  --skip-install  Do not run pnpm install when node_modules is missing
EOF
}

require_pnpm() {
	if ! command -v pnpm >/dev/null 2>&1; then
		echo "pnpm not found. Enable it with: corepack enable" >&2
		exit 1
	fi
}

install() {
	require_pnpm
	pnpm install
}

ensure_installed() {
	if [ "$SKIP_INSTALL" = false ] && [ ! -d node_modules ]; then
		install
	fi
}

run() {
	require_pnpm
	ensure_installed
	pnpm run "$@"
}

require_docker() {
	if ! docker info >/dev/null 2>&1; then
		echo "Docker is required: MongoDB runs in a container." >&2
		exit 1
	fi
}

# The edition argument is optional and can only be ce.
require_ce() {
	case "${ARGS[0]:-ce}" in
		ce) ;;
		*)
			echo "Usage: ./dashboard.sh $COMMAND [ce]" >&2
			exit 1
			;;
	esac
}

image_name() {
	echo "openvidu/openvidu-dashboard:${IMAGE_TAG:-dev}"
}

build_image() {
	require_ce
	docker buildx build --load -f dashboard-ce/docker/Dockerfile -t "$(image_name)" \
		--build-arg "BASE_HREF=${BASE_HREF:-/}" .
}

smoke_image() {
	require_ce
	dashboard-ce/docker/smoke-test.sh "$(image_name)" 300
}

contract_check() {
	if [ -z "${ARGS[0]:-}" ]; then
		echo "Usage: ./dashboard.sh contract-check <path to openvidu-livekit>" >&2
		exit 1
	fi

	require_docker
	require_pnpm
	ensure_installed
	pnpm --filter "@openvidu-dashboard/backend..." run build
	dashboard-ce/typings/contract/writer-check.sh "${ARGS[0]}"
}

clean() {
	require_pnpm
	pnpm -r exec rm -rf dist node_modules
	rm -rf node_modules
}

case "$COMMAND" in
	help | -h | --help) usage ;;
	install) install ;;
	lint) run lint ;;
	lint-fix) run lint:fix ;;
	format) run format ;;
	format-check) run format:check ;;
	typecheck) run typecheck ;;
	build) run build ;;
	dev) run dev ;;
	demo)
		require_ce
		require_pnpm
		ensure_installed
		dashboard-ce/tools/demo.sh ce
		;;
	test | test-unit) run test:unit ;;
	e2e) run e2e ;;
	test-integration)
		require_docker
		run test:integration
		;;
	spec-validate) run spec:validate ;;
	check)
		run lint
		run format:check
		run typecheck
		run spec:validate
		run test:unit
		;;
	build-image) build_image ;;
	smoke-image) smoke_image ;;
	contract-check) contract_check ;;
	clean) clean ;;
	*)
		echo "Unknown command: $COMMAND" >&2
		usage
		exit 1
		;;
esac
