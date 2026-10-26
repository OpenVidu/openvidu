#!/usr/bin/env bash
# Copies the generated contract into the writer: <openvidu-livekit>/openvidu/analytics/schema/contract/.
set -euo pipefail

if [ $# -ne 1 ]; then
	echo "Usage: $0 <path to openvidu-livekit>" >&2
	exit 1
fi

source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_dir="$1/openvidu/analytics/schema/contract"

if [ ! -d "$1/openvidu/analytics" ]; then
	echo "Not an openvidu-livekit checkout: $1" >&2
	exit 1
fi

rm -rf "$target_dir"
mkdir -p "$target_dir"
cp -r "$source_dir/schema" "$source_dir/fixtures" "$target_dir/"
echo "Contract version $(cat "$source_dir/schema/contract_version.txt") vendored into $target_dir"
