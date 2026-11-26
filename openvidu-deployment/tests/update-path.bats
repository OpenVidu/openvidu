#!/usr/bin/env bats
# Upgrade paths of update.sh: the frozen exact chain before 3.10, and the release lines from 3.10.0 on (one minor at a
# time, always to the latest patch of each line, published at update/X.Y/update.sh).
# Run with: bats openvidu-deployment/tests/update-path.bats
#
# The functions of update.sh run against a fake get.openvidu.io (file:// URLs) whose scripts only write the version
# they install into a fake deployment-info.yaml.

setup() {
  UPDATE_SH="${BATS_TEST_DIRNAME}/../update.sh"
  WORK="${BATS_TEST_TMPDIR}"
  export INSTALL_PREFIX="${WORK}/opt"
  export UPDATE_BASE_URL="file://${WORK}/update"
  export HOP_LOG="${WORK}/hops.log"
  export NO_TTY_REQUESTED=yes
  mkdir -p "$INSTALL_PREFIX"
  : >"$HOP_LOG"
  # Everything before the main program: variables and functions only
  sed '/^# Check if executing as root/,$d' "$UPDATE_SH" >"${WORK}/lib.sh"
  # Published versions. The alias of a release line holds the script of its latest patch.
  publish 3.8.0
  publish 3.9.0
  publish 3.10.0
  publish 3.10.3 alias
  publish 3.11.0
  publish 3.11.4 alias
}

# publish <version> [alias]: a fake update script at update/<version>/update.sh (and update/<X.Y>/update.sh)
publish() {
  local dir="${WORK}/update/$1"
  mkdir -p "$dir"
  cat >"$dir/update.sh" <<EOF
#!/bin/sh
export OPENVIDU_VERSION="\${OPENVIDU_VERSION:-$1}"
echo "\$OPENVIDU_VERSION" >>"\$HOP_LOG"
printf 'version: "%s"\n' "\$OPENVIDU_VERSION" >"\$INSTALL_PREFIX/deployment-info.yaml"
EOF
  if [ "${2:-}" = alias ]; then
    mkdir -p "${WORK}/update/${1%.*}"
    cp "$dir/update.sh" "${WORK}/update/${1%.*}/update.sh"
  fi
}

installed() {
  printf 'version: "%s"\n' "$1" >"$INSTALL_PREFIX/deployment-info.yaml"
}

# validate <current> <target> [RELEASE_LINES]: what the script of <target> does before updating to it itself
validate() {
  installed "$1"
  run sh -c ". '${WORK}/lib.sh'; RELEASE_LINES='${3:-3.10 3.11 3.12}'; NO_TTY_FLAG=--no-tty; validate_upgrade '$1' '$2'"
}

hops() {
  tr '\n' ' ' <"$HOP_LOG" | sed 's/ $//'
}

@test "same release line: any older patch updates directly to the target" {
  validate 3.10.0 3.10.3
  [ "$status" -eq 0 ]
  [ "$(hops)" = "" ]
}

@test "previous minor: any of its versions updates directly to the target" {
  validate 3.9.0 3.10.3
  [ "$status" -eq 0 ]
  [ "$(hops)" = "" ]
  validate 3.10.1 3.11.4
  [ "$status" -eq 0 ]
  [ "$(hops)" = "" ]
}

@test "an old-line patch released after the next minor still updates to it" {
  validate 3.10.7 3.11.0
  [ "$status" -eq 0 ]
  [ "$(hops)" = "" ]
}

@test "two release lines away: one hop, to the latest patch of the line in between" {
  validate 3.10.0 3.12.1
  [ "$status" -eq 0 ]
  [ "$(hops)" = "3.11.4" ]
}

@test "from before the release lines: the exact chain up to 3.9.0, then the release lines" {
  validate 3.8.0 3.10.3
  [ "$status" -eq 0 ]
  [ "$(hops)" = "3.9.0" ]
  : >"$HOP_LOG"
  validate 3.8.0 3.12.0
  [ "$status" -eq 0 ]
  [ "$(hops)" = "3.9.0 3.10.3 3.11.4" ]
}

@test "a downgrade is refused" {
  validate 3.11.0 3.10.3
  [ "$status" -ne 0 ]
  [[ "$output" == *"newer than 3.10.3"* ]]
  validate 3.10.3 3.10.1
  [ "$status" -ne 0 ]
}

@test "a release line that is not known yet is reported, not guessed" {
  validate 3.10.0 3.13.0 "3.10 3.11"
  [ "$status" -ne 0 ]
  [[ "$output" == *"No upgrade path"* ]]
}

@test "a hop that does not change the installed version stops the upgrade" {
  # The 3.11 alias installs nothing
  printf '#!/bin/sh\nexport OPENVIDU_VERSION="${OPENVIDU_VERSION:-3.11.4}"\n' >"${WORK}/update/3.11/update.sh"
  validate 3.10.0 3.12.0
  [ "$status" -ne 0 ]
  [[ "$output" == *"did not change the installed version"* ]]
}

@test "the exact chain before 3.10 is unchanged" {
  publish 3.7.0
  validate 3.7.0 3.9.0
  [ "$status" -eq 0 ]
  [ "$(hops)" = "3.8.0" ]
}

# latest_patch <installed>: update.sh --latest-patch
latest_patch() {
  installed "$1"
  run sh -c ". '${WORK}/lib.sh'; RELEASE_LINES='3.10 3.11'; NO_TTY_FLAG=--no-tty; update_to_latest_patch"
}

@test "--latest-patch updates to the latest patch of the installed line" {
  latest_patch 3.10.0
  [ "$status" -eq 0 ]
  [ "$(hops)" = "3.10.3" ]
  grep -q '"3.10.3"' "$INSTALL_PREFIX/deployment-info.yaml"
}

@test "--latest-patch on the latest patch does nothing" {
  latest_patch 3.10.3
  [ "$status" -eq 0 ]
  [[ "$output" == *"already the latest patch"* ]]
  [ "$(hops)" = "" ]
}

@test "--latest-patch is refused before 3.10.0" {
  latest_patch 3.9.0
  [ "$status" -ne 0 ]
  [[ "$output" == *"available from OpenVidu 3.10.0"* ]]
}

@test "--latest-patch passes the other arguments on, but not itself" {
  printf '#!/bin/sh\nexport OPENVIDU_VERSION="${OPENVIDU_VERSION:-3.10.3}"\necho "args: $*" >>"$HOP_LOG"\n' \
    >"${WORK}/update/3.10/update.sh"
  installed 3.10.0
  run sh -c ". '${WORK}/lib.sh'; RELEASE_LINES='3.10'; update_to_latest_patch --no-tty --latest-patch --pull-images"
  [ "$status" -eq 0 ]
  [ "$(cat "$HOP_LOG")" = "args: --no-tty --pull-images" ]
}

@test "the updater image is pulled before OpenVidu is stopped" {
  pull=$(grep -n '^docker pull "${UPDATER_IMAGE}"' "$UPDATE_SH" | cut -d: -f1)
  stop=$(grep -n '^systemctl stop openvidu' "$UPDATE_SH" | cut -d: -f1)
  [ -n "$pull" ] && [ -n "$stop" ] && [ "$pull" -lt "$stop" ]
}
